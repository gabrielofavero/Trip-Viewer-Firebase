import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================
// MIGRATION 15 (Phase 3): User Doc Cleanup
//
// Five independent, idempotent operations:
//
//   1. Embedded summaries → subcollections
//      Moves trips/destinations/listings objects out of the user
//      doc into users/{uid}/tripSummaries, /destinationSummaries,
//      /listingSummaries subcollections. Clears embedded to [].
//
//   2. Permissions → admin/permissions/{type}/{uid}
//      Migrates users/{uid}.permissions.{upload,unlimitedUploadSize}
//      to document existence in admin/permissions subcollections.
//      Also cleans up the old array-based admin/permissions doc.
//
//   3. Legacy fields → FieldValue.delete()
//      Strips name, photo, visibility, permissions, permissions_legacy
//      from user docs.
//
//   4. Destination image field → add missing image field
//      Adds `image: { active: false, background: "" }`
//      to all destination documents and their summaries that lack it.
//
//   5. Destination entry images field → add missing images field
//      Adds `images: []` to every destination entry (restaurants,
//      snacks, nightlife, tourism, shopping) that lacks it.
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

const SUMMARY_SUBCOLLECTIONS: Record<string, string> = {
	trips: 'tripSummaries',
	destinations: 'destinationSummaries',
	listings: 'listingSummaries',
};

const PERMISSION_TYPES = ['unlimitedUploadSize', 'upload'] as const;

const FIELDS_TO_REMOVE = [
	'name',
	'photo',
	'visibility',
	'permissions',
	'permissions_legacy',
	'trips',
	'destinations',
	'listings',
];

interface Phase3Report {
	usersScanned: number;
	usersCleaned: number;
	alreadyClean: number;
	// summary migration
	tripSummariesMigrated: number;
	destinationSummariesMigrated: number;
	listingSummariesMigrated: number;
	alreadyInSubcollection: number;
	// permissions migration
	permissionsMigrated: number;
	permissionsAlreadyExist: number;
	// legacy field removal
	fieldsRemoved: number;
	// image field migration
	destImagesAdded: number;
	destImagesAlreadyPresent: number;
	destSummaryImagesAdded: number;
	destSummaryImagesAlreadyPresent: number;
	// entry images field migration
	destEntryImagesAdded: number;
	destEntryImagesAlreadyPresent: number;
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

	set(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.DocumentData,
		options?: FirebaseFirestore.SetOptions,
	) {
		this.current.set(ref, data, options ?? {});
		this.rotate();
	}

	update(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>) {
		this.current.update(ref, data);
		this.rotate();
	}

	delete(ref: FirebaseFirestore.DocumentReference) {
		this.current.delete(ref);
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
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	console.log(
		`[migration-15] Starting Phase 3 cleanup${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: Phase3Report = {
		usersScanned: 0,
		usersCleaned: 0,
		alreadyClean: 0,
		tripSummariesMigrated: 0,
		destinationSummariesMigrated: 0,
		listingSummariesMigrated: 0,
		alreadyInSubcollection: 0,
		permissionsMigrated: 0,
		permissionsAlreadyExist: 0,
		fieldsRemoved: 0,
		destImagesAdded: 0,
		destImagesAlreadyPresent: 0,
		destSummaryImagesAdded: 0,
		destSummaryImagesAlreadyPresent: 0,
		destEntryImagesAdded: 0,
		destEntryImagesAlreadyPresent: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const usersSnap = await db.collection('users').get();
		console.log(`[migration-15] Found ${usersSnap.size} user document(s).`);

		for (const userDoc of usersSnap.docs) {
			report.usersScanned++;
			const uid = userDoc.id;
			const data = userDoc.data();

			// --- Determine what needs doing ---
			const embeddedFields = getEmbeddedSummaryFields(data);
			const hasPermissions = !!(data.permissions && typeof data.permissions === 'object');
			const hasLegacyFields = FIELDS_TO_REMOVE.some((f) => f in data);

			if (embeddedFields.length === 0 && !hasPermissions && !hasLegacyFields) {
				report.alreadyClean++;
				continue;
			}

			console.log(
				`[migration-15] User ${uid}: ` +
					`embedded=[${embeddedFields.join(',') || 'none'}], ` +
					`hasPermissions=${hasPermissions}, ` +
					`legacy=[${FIELDS_TO_REMOVE.filter((f) => f in data).join(',') || 'none'}]`,
			);

			if (dryRun) {
				// Count summaries
				for (const field of embeddedFields) {
					const obj = data[field];
					if (obj && typeof obj === 'object') {
						const count = Object.keys(obj).length;
						if (field === 'trips') report.tripSummariesMigrated += count;
						if (field === 'destinations') report.destinationSummariesMigrated += count;
						if (field === 'listings') report.listingSummariesMigrated += count;
					}
				}
				// Count permissions
				if (hasPermissions) {
					for (const pt of PERMISSION_TYPES) {
						if (data.permissions[pt]) report.permissionsMigrated++;
					}
				}
				// Count field removals
				report.fieldsRemoved += FIELDS_TO_REMOVE.filter((f) => f in data).length;
				report.usersCleaned++;
				continue;
			}

			// --- Step 1: Migrate embedded summaries → subcollections ---
			if (embeddedFields.length > 0) {
				await migrateEmbeddedSummaries(userDoc, embeddedFields, data, report);
			}

			// --- Step 2: Migrate permissions → admin/permissions/{type}/{uid} ---
			if (hasPermissions) {
				await migratePermissions(db, uid, data.permissions, report);
			}

			// --- Step 3: Remove legacy fields from user doc ---
			if (hasLegacyFields) {
				await removeLegacyFields(userDoc.ref, data, report);
			}

			report.usersCleaned++;
		}

		// --- Step 4: Clean up old array-based admin/permissions doc ---
		await cleanupOldPermissionsDoc(db, dryRun);

		// --- Step 5: Add missing image field to destination docs & summaries ---
		await addDestinationImageField(db, dryRun, report);

		// --- Step 6: Add missing images field to destination entries ---
		await addDestinationEntryImagesField(db, dryRun, report);

		console.log('[migration-15] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-15] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});

// ============================================================
// HELPERS: Detect what needs cleaning
// ============================================================

function getEmbeddedSummaryFields(data: Record<string, any>): string[] {
	const fields: string[] = [];
	for (const field of Object.keys(SUMMARY_SUBCOLLECTIONS)) {
		const value = data[field];
		if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
			fields.push(field);
		}
	}
	return fields;
}

// ============================================================
// STEP 1: Migrate embedded summaries → subcollections
// ============================================================

async function migrateEmbeddedSummaries(
	userDoc: FirebaseFirestore.DocumentSnapshot,
	fieldsToClean: string[],
	data: Record<string, any>,
	report: Phase3Report,
) {
	const batch = new BatchManager();
	const updatePatch: Record<string, any> = {};

	for (const field of fieldsToClean) {
		const embedded = data[field];
		if (!embedded || typeof embedded !== 'object') continue;

		const subcollectionName = SUMMARY_SUBCOLLECTIONS[field];
		const subRef = userDoc.ref.collection(subcollectionName);

		for (const [docId, summary] of Object.entries(embedded as Record<string, any>)) {
			if (!summary || typeof summary !== 'object') continue;

			const existingSnap = await subRef.doc(docId).get();
			if (existingSnap.exists) {
				report.alreadyInSubcollection++;
				console.log(`  ${subcollectionName}/${docId}: already exists, skipping.`);
			} else {
				console.log(`  Creating ${subcollectionName}/${docId}`);
				batch.set(subRef.doc(docId), summary);
				if (field === 'trips') report.tripSummariesMigrated++;
				if (field === 'destinations') report.destinationSummariesMigrated++;
				if (field === 'listings') report.listingSummariesMigrated++;
			}
		}

		updatePatch[field] = [];
	}

	await batch.commitAll();

	if (Object.keys(updatePatch).length > 0) {
		await userDoc.ref.update(updatePatch);
		console.log(`  Updated user doc: cleared [${Object.keys(updatePatch).join(', ')}]`);
	}
}

// ============================================================
// STEP 2: Migrate permissions → admin/permissions/{type}/{uid}
// ============================================================

async function migratePermissions(
	db: FirebaseFirestore.Firestore,
	uid: string,
	permissions: Record<string, unknown>,
	report: Phase3Report,
) {
	const batch = new BatchManager();

	for (const permType of PERMISSION_TYPES) {
		if (!permissions[permType]) continue;

		const permDocRef = db
			.collection('admin')
			.doc('permissions')
			.collection(permType)
			.doc(uid);

		const existingSnap = await permDocRef.get();
		if (existingSnap.exists) {
			report.permissionsAlreadyExist++;
			console.log(`  admin/permissions/${permType}/${uid}: already exists, skipping.`);
			continue;
		}

		console.log(`  Creating admin/permissions/${permType}/${uid}`);
		batch.set(permDocRef, { _created: FieldValue.serverTimestamp() });
		report.permissionsMigrated++;
	}

	await batch.commitAll();
}

// ============================================================
// STEP 3: Remove legacy fields via FieldValue.delete()
// ============================================================

async function removeLegacyFields(
	userRef: FirebaseFirestore.DocumentReference,
	data: Record<string, any>,
	report: Phase3Report,
) {
	const patch: Record<string, any> = {};
	for (const field of FIELDS_TO_REMOVE) {
		if (field in data) {
			patch[field] = FieldValue.delete();
			report.fieldsRemoved++;
		}
	}

	if (Object.keys(patch).length > 0) {
		console.log(`  User ${userRef.id}: removing fields [${Object.keys(patch).join(', ')}]`);
		await userRef.update(patch);
	}
}

// ============================================================
// STEP 4: Clean up old array-based admin/permissions doc
// ============================================================

async function cleanupOldPermissionsDoc(
	db: FirebaseFirestore.Firestore,
	dryRun: boolean,
) {
	const oldDocRef = db.collection('admin').doc('permissions');
	const snap = await oldDocRef.get();

	if (!snap.exists) {
		console.log('[migration-15] Old admin/permissions doc not found — nothing to clean.');
		return;
	}

	const data = snap.data();
	// Only delete if it looks like the old array-based format
	const hasArrays = data && (
		Array.isArray(data.unlimitedUploadSize) ||
		Array.isArray(data.upload)
	);

	if (!hasArrays) {
		console.log('[migration-15] admin/permissions doc exists but does not look like old format — skipping.');
		return;
	}

	if (dryRun) {
		console.log('[migration-15] Would delete old admin/permissions doc (array format).');
		return;
	}

	console.log('[migration-15] Deleting old admin/permissions doc (array format).');
	await oldDocRef.delete();
}

// ============================================================
// STEP 5: Add missing image field to destination docs & summaries
// ============================================================

const DEFAULT_IMAGE = { active: false, background: '' };

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

async function addDestinationImageField(
	db: FirebaseFirestore.Firestore,
	dryRun: boolean,
	report: Phase3Report,
) {
	console.log('[migration-15] Step 5: Adding image field to destination documents...');

	const destSnap = await db.collection('destinations').get();
	console.log(`[migration-15] Found ${destSnap.size} destination document(s).`);

	const batch = new BatchManager();

	for (const destDoc of destSnap.docs) {
		const data = destDoc.data();
		if (!data.image) {
			if (dryRun) {
				report.destImagesAdded++;
				console.log(`  destinations/${destDoc.id}: would add image field.`);
			} else {
				console.log(`  destinations/${destDoc.id}: adding image field.`);
				batch.set(destDoc.ref, { image: DEFAULT_IMAGE }, { merge: true });
				report.destImagesAdded++;
			}
		} else {
			report.destImagesAlreadyPresent++;
		}
	}

	if (!dryRun) {
		await batch.commitAll();
	}

	// Now update destination summaries in user subcollections
	console.log('[migration-15] Step 5: Adding image field to destination summaries...');

	const usersSnap = await db.collection('users').get();
	const summaryBatch = new BatchManager();

	for (const userDoc of usersSnap.docs) {
		const summariesSnap = await userDoc.ref.collection('destinationSummaries').get();

		for (const summaryDoc of summariesSnap.docs) {
			const summaryData = summaryDoc.data();
			if (!summaryData.image) {
				if (dryRun) {
					report.destSummaryImagesAdded++;
					console.log(`  users/${userDoc.id}/destinationSummaries/${summaryDoc.id}: would add image field.`);
				} else {
					console.log(`  users/${userDoc.id}/destinationSummaries/${summaryDoc.id}: adding image field.`);
					summaryBatch.set(summaryDoc.ref, { image: DEFAULT_IMAGE }, { merge: true });
					report.destSummaryImagesAdded++;
				}
			} else {
				report.destSummaryImagesAlreadyPresent++;
			}
		}
	}

	if (!dryRun) {
		await summaryBatch.commitAll();
	}

	console.log(
		`[migration-15] Step 5 done. ` +
			`Docs: ${report.destImagesAdded} added, ${report.destImagesAlreadyPresent} already present. ` +
			`Summaries: ${report.destSummaryImagesAdded} added, ${report.destSummaryImagesAlreadyPresent} already present.`,
	);
}

// ============================================================
// STEP 6: Add missing images field to destination entries
// ============================================================

async function addDestinationEntryImagesField(
	db: FirebaseFirestore.Firestore,
	dryRun: boolean,
	report: Phase3Report,
) {
	console.log('[migration-15] Step 6: Adding images field to destination entries...');

	const destSnap = await db.collection('destinations').get();
	console.log(`[migration-15] Found ${destSnap.size} destination document(s).`);

	const batch = new BatchManager();

	for (const destDoc of destSnap.docs) {
		const data = destDoc.data();
		const patch: Record<string, any> = {};

		for (const category of DESTINATION_CATEGORIES) {
			const entries = data[category];
			if (!entries || typeof entries !== 'object') continue;

			for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
				if (!entry || typeof entry !== 'object') continue;
				if (Array.isArray(entry.images)) {
					report.destEntryImagesAlreadyPresent++;
					continue;
				}
				patch[`${category}.${entryId}.images`] = [];
				report.destEntryImagesAdded++;
			}
		}

		if (Object.keys(patch).length === 0) continue;

		const noun = Object.keys(patch).length === 1 ? 'entry' : 'entries';
		if (dryRun) {
			console.log(`  destinations/${destDoc.id}: would add images field to ${Object.keys(patch).length} ${noun}.`);
			continue;
		}

		console.log(`  destinations/${destDoc.id}: adding images field to ${Object.keys(patch).length} ${noun}.`);
		batch.update(destDoc.ref, patch);
	}

	if (!dryRun) {
		await batch.commitAll();
	}

	console.log(
		`[migration-15] Step 6 done. ` +
			`Entries: ${report.destEntryImagesAdded} added, ${report.destEntryImagesAlreadyPresent} already present.`,
	);
}
