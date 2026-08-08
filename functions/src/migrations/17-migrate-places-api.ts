import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================
// MIGRATION 17: Places API prep
//
// Two independent, idempotent operations:
//
//   1. canUsePlacesAPI permission → admin/permissions/canUsePlacesAPI/{uid}
//      Grants the new Places API permission to the UIDs passed in the
//      request body:  { "uids": ["uid1", "uid2"] }
//      (also accepts a comma-separated string or the ?uids= query param).
//      If no UIDs are provided, this step is skipped entirely.
//
//   2. placeAPI object → every destination entry
//      Adds a `placeAPI` object to every destination entry (restaurants,
//      snacks, nightlife, tourism, shopping) that lacks it. The object
//      mirrors the output of scripts/export-maps-data/export-maps-data.py
//      (the app's destination format), so entries can later store the
//      normalized Google Places API data (id, name, description, etc.).
//      Any legacy `placeID` string field from an earlier run is removed.
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

const PERMISSION_TYPE = 'canUsePlacesAPI';

/**
 * Empty placeholder for a destination entry's `placeAPI` object.
 * Holds the normalized Places API data fields from
 * scripts/export-maps-data/export-maps-data.py (DestinationData.to_dict()).
 * Omits fields the app manages itself (`media`, `isNew`) and tracks the
 * last Places API sync via `updatedAt` (instead of the script's `createdAt`).
 */
const EMPTY_PLACE_API: Record<string, any> = {
	region: '',
	name: '',
	website: '',
	rating: '',
	price: '',
	description: { en: '', pt: '' },
	emoji: '',
	map: '',
	updatedAt: '',
	instagram: '',
	id: '',
};

interface PlacesApiReport {
	// permission grant
	permissionsRequested: number;
	permissionsGranted: number;
	permissionsAlreadyExist: number;
	// placeAPI backfill
	destinationsScanned: number;
	entriesScanned: number;
	entriesUpdated: number;
	entriesAlreadyPresent: number;
	errors: string[];
}

// ============================================================
// BATCH MANAGER
// ============================================================

class BatchManager {
	private batches: FirebaseFirestore.WriteBatch[] = [];
	private current: FirebaseFirestore.WriteBatch;
	private count = 0;

	constructor() {
		this.current = admin.firestore().batch();
		this.batches.push(this.current);
	}

	set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
		this.current.set(ref, data);
		this.rotate();
	}

	update(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>) {
		this.current.update(ref, data);
		this.rotate();
	}

	private rotate() {
		this.count++;
		if (this.count >= 500) {
			this.current = admin.firestore().batch();
			this.batches.push(this.current);
			this.count = 0;
		}
	}

	async commitAll() {
		console.log(`  Committing ${this.batches.length} batch(es)...`);
		for (const batch of this.batches) {
			await batch.commit();
		}
	}
}

// ============================================================
// HELPERS
// ============================================================

/** Accepts an array of UIDs, a comma-separated string, or undefined. */
function parseUids(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim());
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		return value
			.split(',')
			.map((u) => u.trim())
			.filter((u) => u.length > 0);
	}
	return [];
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	// UIDs to pre-grant the permission to (optional — from body or query).
	const uids = parseUids(req.body?.uids ?? req.query?.uids);

	console.log(
		`[migration-17] Starting Places API prep${dryRun ? ' (DRY RUN)' : ''}... ` +
			`${uids.length} uid(s) requested for canUsePlacesAPI.`,
	);

	const report: PlacesApiReport = {
		permissionsRequested: 0,
		permissionsGranted: 0,
		permissionsAlreadyExist: 0,
		destinationsScanned: 0,
		entriesScanned: 0,
		entriesUpdated: 0,
		entriesAlreadyPresent: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();

		// -----------------------------------------------------------
		// Step 1: Grant canUsePlacesAPI to the requested UIDs
		// -----------------------------------------------------------
		if (uids.length > 0) {
			console.log(`[migration-17] Step 1: Granting ${PERMISSION_TYPE} permission...`);
			const permBatch = new BatchManager();

			for (const uid of uids) {
				report.permissionsRequested++;
				const permDocRef = db
					.collection('admin')
					.doc('permissions')
					.collection(PERMISSION_TYPE)
					.doc(uid);

				const existingSnap = await permDocRef.get();
				if (existingSnap.exists) {
					report.permissionsAlreadyExist++;
					console.log(`  admin/permissions/${PERMISSION_TYPE}/${uid}: already exists, skipping.`);
					continue;
				}

				report.permissionsGranted++;
				if (dryRun) {
					console.log(`  [DRY RUN] Would create admin/permissions/${PERMISSION_TYPE}/${uid}`);
					continue;
				}

				console.log(`  Creating admin/permissions/${PERMISSION_TYPE}/${uid}`);
				permBatch.set(permDocRef, { _created: FieldValue.serverTimestamp() });
			}

			if (!dryRun) {
				await permBatch.commitAll();
			}
		} else {
			console.log(
				`[migration-17] Step 1 skipped — no UIDs provided. ` +
					`Pass { "uids": ["..."] } in the request body to pre-grant ${PERMISSION_TYPE}.`,
			);
		}

		// -----------------------------------------------------------
		// Step 2: Add placeAPI object to every destination entry
		// -----------------------------------------------------------
		await addPlaceAPIField(db, dryRun, report);

		console.log('[migration-17] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, uids, report });
	} catch (err: any) {
		console.error('[migration-17] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, uids, report });
	}
});

// ============================================================
// STEP 2: Add missing placeAPI object to destination entries
// ============================================================

async function addPlaceAPIField(
	db: FirebaseFirestore.Firestore,
	dryRun: boolean,
	report: PlacesApiReport,
) {
	console.log('[migration-17] Step 2: Adding placeAPI object to destination entries...');

	const destSnap = await db.collection('destinations').get();
	console.log(`[migration-17] Found ${destSnap.size} destination document(s).`);

	const batch = new BatchManager();

	for (const destDoc of destSnap.docs) {
		report.destinationsScanned++;
		const data = destDoc.data();
		const patch: Record<string, any> = {};

		for (const category of DESTINATION_CATEGORIES) {
			const entries = data[category];
			if (!entries || typeof entries !== 'object') continue;

			for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
				if (!entry || typeof entry !== 'object') continue;
				report.entriesScanned++;
				// Idempotency check — skip entries that already carry the object.
				if (entry.placeAPI && typeof entry.placeAPI === 'object') {
					report.entriesAlreadyPresent++;
					continue;
				}
				patch[`${category}.${entryId}.placeAPI`] = EMPTY_PLACE_API;
				// Replace the legacy string placeID (empty placeholder from an earlier run).
				patch[`${category}.${entryId}.placeID`] = FieldValue.delete();
				report.entriesUpdated++;
			}
		}

		if (Object.keys(patch).length === 0) continue;

		const noun = Object.keys(patch).length === 1 ? 'entry' : 'entries';
		if (dryRun) {
			console.log(
				`  destinations/${destDoc.id}: would add placeAPI object to ${Object.keys(patch).length} ${noun}.`,
			);
			continue;
		}

		console.log(
			`  destinations/${destDoc.id}: adding placeAPI object to ${Object.keys(patch).length} ${noun}.`,
		);
		batch.update(destDoc.ref, patch);
	}

	if (!dryRun) {
		await batch.commitAll();
	}

	console.log(
		`[migration-17] Step 2 done. ` +
			`Entries: ${report.entriesUpdated} updated, ${report.entriesAlreadyPresent} already present.`,
	);
}
