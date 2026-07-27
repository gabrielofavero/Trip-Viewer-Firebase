import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 15: Clean Up User-Document Embedded Summaries
//
// Earlier migrations (13–14) extracted trip/destination/listing
// summaries from the user document into subcollections:
//   users/{uid}/tripSummaries/{id}
//   users/{uid}/destinationSummaries/{id}
//   users/{uid}/listingSummaries/{id}
//
// However, the front-end code (set.ts setUserData()) continued to
// write summary data back into the user doc using dot notation
// (e.g. users/{uid}.trips.{id}), re-creating the embedded format.
//
// This migration:
//   1. Scans all user documents in the "users" collection.
//   2. For fields `trips`, `destinations`, `listings` that contain
//      objects (embedded summaries), extracts them to their
//      respective subcollections — but only if a summary doc
//      doesn't already exist there.
//   3. Clears the embedded fields to empty arrays ([]).
//
// Idempotent — safe to re-run. Skips already-clean docs.
// Supports ?dryRun=true query parameter.
// ============================================================

const SUMMARY_SUBCOLLECTIONS: Record<string, string> = {
	trips: 'tripSummaries',
	destinations: 'destinationSummaries',
	listings: 'listingSummaries',
};

interface CleanupReport {
	usersScanned: number;
	usersCleaned: number;
	tripSummariesMigrated: number;
	destinationSummariesMigrated: number;
	listingSummariesMigrated: number;
	alreadyInSubcollection: number;
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

	update(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
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
		for (let i = 0; i < this.batches.length; i++) {
			await this.batches[i].commit();
		}
	}
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	console.log(
		`[migration-15] Starting cleanup of user embedded summaries${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: CleanupReport = {
		usersScanned: 0,
		usersCleaned: 0,
		tripSummariesMigrated: 0,
		destinationSummariesMigrated: 0,
		listingSummariesMigrated: 0,
		alreadyInSubcollection: 0,
		errors: [],
	};

	try {
		const usersSnap = await admin.firestore().collection('users').get();
		console.log(`[migration-15] Found ${usersSnap.size} user document(s).`);

		for (const userDoc of usersSnap.docs) {
			report.usersScanned++;
			const data = userDoc.data();

			// Check which fields need cleaning
			const fieldsToClean: string[] = [];
			for (const field of Object.keys(SUMMARY_SUBCOLLECTIONS)) {
				const value = data[field];
				// Only clean if it's a non-empty object (not an array, not null/undefined)
				if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
					fieldsToClean.push(field);
				}
			}

			if (fieldsToClean.length === 0) {
				continue; // Already clean
			}

			console.log(
				`[migration-15] User ${userDoc.id}: cleaning fields [${fieldsToClean.join(', ')}]`,
			);

			if (!dryRun) {
				await cleanUserDoc(userDoc, fieldsToClean, data, report);
			} else {
				// Dry run: just count what would be migrated
				for (const field of fieldsToClean) {
					const embedded = data[field];
					if (embedded && typeof embedded === 'object') {
						const count = Object.keys(embedded).length;
						if (field === 'trips') report.tripSummariesMigrated += count;
						if (field === 'destinations') report.destinationSummariesMigrated += count;
						if (field === 'listings') report.listingSummariesMigrated += count;
					}
				}
			}

			report.usersCleaned++;
		}

		console.log('[migration-15] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-15] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});

// ============================================================
// CLEAN A SINGLE USER DOC
// ============================================================

async function cleanUserDoc(
	userDoc: FirebaseFirestore.DocumentSnapshot,
	fieldsToClean: string[],
	data: Record<string, any>,
	report: CleanupReport,
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

			// Check if summary already exists in subcollection
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

		// Clear the embedded field
		updatePatch[field] = [];
	}

	// Write subcollection docs
	await batch.commitAll();

	// Update user doc to clear embedded fields
	if (Object.keys(updatePatch).length > 0) {
		await userDoc.ref.update(updatePatch);
		console.log(`  Updated user doc: cleared [${Object.keys(updatePatch).join(', ')}]`);
	}
}
