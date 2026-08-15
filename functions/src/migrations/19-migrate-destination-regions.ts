import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================
// MIGRATION 19: Destination entry region → regions
//
// Converts the legacy single-string `region` field on every destination
// entry into a `regions` array (one or more neighborhoods/areas):
//
//   "region": "Ipanema"   →   "regions": ["Ipanema"]
//   "region": ""          →   "regions": []
//
// The legacy `region` field is deleted once the array is written.
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

interface RegionsReport {
	destinationsScanned: number;
	entriesScanned: number;
	entriesUpdated: number;
	entriesAlreadyMigrated: number;
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

	update(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
	) {
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

/** Normalize a legacy region value into an array of non-empty strings. */
function toRegionsArray(value: unknown): string[] {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? [trimmed] : [];
	}
	if (Array.isArray(value)) {
		return value
			.filter((v): v is string => typeof v === 'string')
			.map((v) => v.trim())
			.filter(Boolean);
	}
	return [];
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';

	console.log(
		`[migration-19] Starting destination region → regions conversion${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: RegionsReport = {
		destinationsScanned: 0,
		entriesScanned: 0,
		entriesUpdated: 0,
		entriesAlreadyMigrated: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const destSnap = await db.collection('destinations').get();
		console.log(`[migration-19] Found ${destSnap.size} destination document(s).`);

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

					const hasRegions = Array.isArray(entry.regions);
					const hasLegacyRegion = entry.region !== undefined && entry.region !== null;

					if (hasRegions && !hasLegacyRegion) {
						report.entriesAlreadyMigrated++;
						continue;
					}

					if (hasRegions && hasLegacyRegion) {
						// Already migrated — just remove the stale legacy string.
						patch[`${category}.${entryId}.region`] = FieldValue.delete();
						report.entriesAlreadyMigrated++;
						continue;
					}

					// Convert legacy region string (or absent) → regions array.
					patch[`${category}.${entryId}.regions`] = toRegionsArray(entry.region);
					patch[`${category}.${entryId}.region`] = FieldValue.delete();
					report.entriesUpdated++;
				}
			}

			if (Object.keys(patch).length === 0) continue;

			const noun = Object.keys(patch).length === 1 ? 'field' : 'fields';
			if (dryRun) {
				console.log(
					`  destinations/${destDoc.id}: would update ${Object.keys(patch).length} ${noun}.`,
				);
				continue;
			}

			console.log(
				`  destinations/${destDoc.id}: updating ${Object.keys(patch).length} ${noun}.`,
			);
			batch.update(destDoc.ref, patch);
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-19] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-19] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
