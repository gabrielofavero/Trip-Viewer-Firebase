import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// Migration 20: Cleanup — delete old Portuguese collections
//               and subcollections after successful migration.
//
// ⚠️  SAFETY: Only deletes a document from the old collection
//    if a matching document exists in the new collection.
//    This is the final, optional step — run only after
//    validating that all data works correctly with the new
//    English schema (recommended: 30-day grace period).
//
// Supports ?dryRun=true for previewing deletions.
// ============================================================

// ============================================================
// Collection rename map (same as migration 19)
// ============================================================
const COLLECTION_RENAME_MAP: Record<string, string> = {
	usuarios: "users",
	viagens: "trips",
	destinos: "destinations",
	listagens: "listings",
	gastos: "expenses",
	protegido: "protected",
};

// ============================================================
// Subcollections that may still exist under old parents
// Key = old parent collection name
// ============================================================
const PARENT_SUBCOLLECTIONS: Record<string, string[]> = {
	usuarios: ["tripSummaries", "destinationSummaries", "listingSummaries"],
	viagens: ["accommodations", "transportation", "itinerary"],
};

// ============================================================
// Interfaces
// ============================================================

interface CleanupReport {
	collection: string;
	docsScanned: number;
	docsDeleted: number;
	docsSkipped: number; // no matching doc in new collection
	errors: string[];
}

// ============================================================
// Batch manager (same pattern as migration 19)
// ============================================================

class BatchManager {
	private batches: FirebaseFirestore.WriteBatch[] = [];
	private currentBatch: FirebaseFirestore.WriteBatch;
	private opCount = 0;

	constructor() {
		this.currentBatch = admin.firestore().batch();
		this.batches.push(this.currentBatch);
	}

	addDelete(ref: FirebaseFirestore.DocumentReference): void {
		this.currentBatch.delete(ref);
		this.opCount++;
		if (this.opCount >= 500) {
			this.currentBatch = admin.firestore().batch();
			this.batches.push(this.currentBatch);
			this.opCount = 0;
		}
	}

	async commitAll(): Promise<void> {
		console.log(`  Committing ${this.batches.length} batch(es)...`);
		for (let i = 0; i < this.batches.length; i++) {
			await this.batches[i].commit();
			console.log(`  Batch ${i + 1}/${this.batches.length} committed.`);
		}
	}
}

// ============================================================
// Step 1: Cleanup top-level Portuguese collections
//
// For each doc in the old collection, verify a matching doc
// exists in the new collection before deleting.
// ============================================================

async function cleanupTopLevelCollection(
	oldName: string,
	newName: string,
	dryRun: boolean,
): Promise<CleanupReport> {
	const report: CleanupReport = {
		collection: oldName,
		docsScanned: 0,
		docsDeleted: 0,
		docsSkipped: 0,
		errors: [],
	};

	// Verify new collection exists and has documents
	const newColRef = admin.firestore().collection(newName);
	let newSnapshot: FirebaseFirestore.QuerySnapshot;
	try {
		newSnapshot = await newColRef.limit(1).get();
	} catch (err) {
		const msg = `New collection "${newName}" not accessible: ${(err as Error).message}`;
		console.warn(`[cleanup:${oldName}] ${msg} — SKIPPING old collection entirely (safety).`);
		report.errors.push(msg);
		return report;
	}

	if (newSnapshot.empty) {
		console.log(
			`[cleanup:${oldName}] New collection "${newName}" is empty — ` +
				`SKIPPING old collection entirely (safety).`,
		);
		return report;
	}

	console.log(
		`[cleanup:${oldName}] New collection "${newName}" exists and has data. ` +
			`Proceeding with old collection cleanup.`,
	);

	// Read all docs from old collection
	const oldColRef = admin.firestore().collection(oldName);
	let oldSnapshot: FirebaseFirestore.QuerySnapshot;
	try {
		oldSnapshot = await oldColRef.get();
	} catch (err) {
		const msg = `Error reading "${oldName}": ${(err as Error).message}`;
		console.warn(`[cleanup:${oldName}] ${msg}`);
		report.errors.push(msg);
		return report;
	}

	if (oldSnapshot.empty) {
		console.log(`[cleanup:${oldName}] Already empty — nothing to delete.`);
		return report;
	}

	console.log(
		`[cleanup:${oldName}] Found ${oldSnapshot.size} document(s) in old collection.`,
	);

	const batchManager = new BatchManager();

	for (const oldDoc of oldSnapshot.docs) {
		report.docsScanned++;

		// Safety: only delete if matching doc exists in new collection
		const newDocRef = newColRef.doc(oldDoc.id);
		const newDocSnap = await newDocRef.get();

		if (!newDocSnap.exists) {
			console.log(
				`[cleanup:${oldName}/${oldDoc.id}] No match in "${newName}" — SKIPPING (safety).`,
			);
			report.docsSkipped++;
			continue;
		}

		console.log(`[cleanup:${oldName}/${oldDoc.id}] Match confirmed — queued for deletion.`);

		if (!dryRun) {
			batchManager.addDelete(oldDoc.ref);
		}
		report.docsDeleted++;
	}

	if (!dryRun && report.docsDeleted > 0) {
		await batchManager.commitAll();
		console.log(
			`[cleanup:${oldName}] Deleted ${report.docsDeleted} document(s).`,
		);
	} else if (dryRun && report.docsDeleted > 0) {
		console.log(
			`[cleanup:${oldName}] DRY RUN: would delete ${report.docsDeleted} document(s).`,
		);
	}

	return report;
}

// ============================================================
// Step 2: Cleanup subcollections under old Portuguese parents
//
// For each subcollection doc under an old parent, verify a
// matching doc exists under the new parent before deleting.
// ============================================================

async function cleanupSubcollectionsForParent(
	oldParent: string,
	newParent: string,
	subNames: string[],
	dryRun: boolean,
): Promise<CleanupReport> {
	const report: CleanupReport = {
		collection: `${oldParent}/*/{${subNames.join(", ")}}`,
		docsScanned: 0,
		docsDeleted: 0,
		docsSkipped: 0,
		errors: [],
	};

	// First check if the old parent collection still exists
	const oldParentCol = admin.firestore().collection(oldParent);
	let parentSnapshot: FirebaseFirestore.QuerySnapshot;
	try {
		parentSnapshot = await oldParentCol.limit(1).get();
	} catch (err) {
		console.log(
			`[cleanup:sub:${oldParent}] Old parent collection not accessible — ` +
				`assuming already cleaned. (${(err as Error).message})`,
		);
		return report;
	}

	if (parentSnapshot.empty) {
		console.log(
			`[cleanup:sub:${oldParent}] Old parent collection already empty — nothing to do.`,
		);
		return report;
	}

	// Read all parent docs
	const fullParentSnapshot = await oldParentCol.get();
	console.log(
		`[cleanup:sub:${oldParent}] Scanning ${fullParentSnapshot.size} parent doc(s)...`,
	);

	const batchManager = new BatchManager();

	for (const parentDoc of fullParentSnapshot.docs) {
		const parentId = parentDoc.id;

		for (const subName of subNames) {
			const oldSubPath = `${oldParent}/${parentId}/${subName}`;
			const newSubPath = `${newParent}/${parentId}/${subName}`;

			let subSnapshot: FirebaseFirestore.QuerySnapshot;
			try {
				subSnapshot = await admin
					.firestore()
					.collection(oldSubPath)
					.get();
			} catch (err) {
				// Subcollection may not exist — that's fine
				continue;
			}

			if (subSnapshot.empty) continue;

			console.log(
				`[cleanup:sub] ${oldSubPath}: ${subSnapshot.size} doc(s)`,
			);

			for (const subDoc of subSnapshot.docs) {
				report.docsScanned++;

				// Safety: verify match in new location
				const newDocRef = admin
					.firestore()
					.doc(`${newSubPath}/${subDoc.id}`);
				const newDocSnap = await newDocRef.get();

				if (!newDocSnap.exists) {
					console.log(
						`[cleanup:sub] ${oldSubPath}/${subDoc.id} — ` +
							`no match in new path — SKIPPING (safety).`,
					);
					report.docsSkipped++;
					continue;
				}

				if (!dryRun) {
					batchManager.addDelete(subDoc.ref);
				}
				report.docsDeleted++;
			}
		}
	}

	if (!dryRun && report.docsDeleted > 0) {
		await batchManager.commitAll();
		console.log(
			`[cleanup:sub:${oldParent}] Deleted ${report.docsDeleted} subcollection doc(s).`,
		);
	} else if (dryRun && report.docsDeleted > 0) {
		console.log(
			`[cleanup:sub:${oldParent}] DRY RUN: would delete ${report.docsDeleted} subcollection doc(s).`,
		);
	}

	return report;
}

// ============================================================
// Step 3: Cleanup protected subcollections
//
// Path: viagens/protected/{pin}/{tripId}
// Path: gastos/protected/{pin}/{tripId}
// ============================================================

async function cleanupProtectedSubcollections(
	dryRun: boolean,
): Promise<CleanupReport[]> {
	const reports: CleanupReport[] = [];

	const protectedPairs: [string, string][] = [
		["viagens", "trips"],
		["gastos", "expenses"],
	];

	for (const [oldParent, newParent] of protectedPairs) {
		const report = await cleanupProtectedForParent(
			oldParent,
			newParent,
			dryRun,
		);
		if (report) reports.push(report);
	}

	return reports;
}

async function cleanupProtectedForParent(
	oldParent: string,
	newParent: string,
	dryRun: boolean,
): Promise<CleanupReport | null> {
	const report: CleanupReport = {
		collection: `${oldParent}/protected/{pin}/*`,
		docsScanned: 0,
		docsDeleted: 0,
		docsSkipped: 0,
		errors: [],
	};

	// Check if the protected doc exists under the old parent
	const oldProtectedRef = admin.firestore().doc(`${oldParent}/protected`);
	let oldProtectedSnap: FirebaseFirestore.DocumentSnapshot;
	try {
		oldProtectedSnap = await oldProtectedRef.get();
	} catch {
		console.log(
			`[cleanup:protected:${oldParent}] Protected doc not accessible — skipping.`,
		);
		return null;
	}

	if (!oldProtectedSnap.exists) {
		console.log(
			`[cleanup:protected:${oldParent}] No protected doc — skipping.`,
		);
		return null;
	}

	// List subcollections under the protected doc
	let protectedCollections: FirebaseFirestore.CollectionReference[];
	try {
		protectedCollections = await oldProtectedRef.listCollections();
	} catch (err) {
		console.log(
			`[cleanup:protected:${oldParent}] Cannot list subcollections: ` +
				`${(err as Error).message}`,
		);
		return null;
	}

	if (protectedCollections.length === 0) {
		console.log(
			`[cleanup:protected:${oldParent}] No PIN subcollections — skipping.`,
		);
		return null;
	}

	const batchManager = new BatchManager();

	for (const pinCol of protectedCollections) {
		const pin = pinCol.id;
		const pinSnapshot = await pinCol.get();

		if (pinSnapshot.empty) continue;

		console.log(
			`[cleanup:protected:${oldParent}] PIN "${pin}": ${pinSnapshot.size} doc(s)`,
		);

		for (const doc of pinSnapshot.docs) {
			report.docsScanned++;

			// Safety: verify match in new location
			const newDocRef = admin
				.firestore()
				.doc(`${newParent}/protected/${pin}/${doc.id}`);
			const newDocSnap = await newDocRef.get();

			if (!newDocSnap.exists) {
				console.log(
					`[cleanup:protected] ${oldParent}/protected/${pin}/${doc.id} — ` +
						`no match — SKIPPING (safety).`,
				);
				report.docsSkipped++;
				continue;
			}

			if (!dryRun) {
				batchManager.addDelete(doc.ref);
			}
			report.docsDeleted++;
		}
	}

	if (!dryRun && report.docsDeleted > 0) {
		await batchManager.commitAll();
		console.log(
			`[cleanup:protected:${oldParent}] Deleted ${report.docsDeleted} doc(s).`,
		);
	} else if (dryRun && report.docsDeleted > 0) {
		console.log(
			`[cleanup:protected:${oldParent}] DRY RUN: would delete ${report.docsDeleted} doc(s).`,
		);
	}

	return report;
}

// ============================================================
// Step 4: Delete empty old parent collections
//
// After all docs have been deleted, the old parent collection
// itself can be cleaned up by deleting any remaining parent docs
// that have no subcollections. Firestore auto-removes empty
// collections, so deleting the last doc effectively removes it.
// ============================================================

async function cleanupEmptyParents(
	dryRun: boolean,
): Promise<CleanupReport> {
	const report: CleanupReport = {
		collection: "parent-docs (viagens/protected, gastos/protected)",
		docsScanned: 0,
		docsDeleted: 0,
		docsSkipped: 0,
		errors: [],
	};

	// The "protected" docs under viagens/gastos act as containers
	// for PIN subcollections. If all PIN subcollections are empty,
	// delete the parent doc too.
	const protectedParents = ["viagens/protected", "gastos/protected"];

	for (const path of protectedParents) {
		const docRef = admin.firestore().doc(path);
		let docSnap: FirebaseFirestore.DocumentSnapshot;
		try {
			docSnap = await docRef.get();
		} catch {
			continue;
		}

		if (!docSnap.exists) continue;

		// Check if this parent doc still has subcollections
		let subCols: FirebaseFirestore.CollectionReference[];
		try {
			subCols = await docRef.listCollections();
		} catch {
			continue;
		}

		if (subCols.length > 0) {
			// Check if all subcollections are empty
			let allEmpty = true;
			for (const col of subCols) {
				const snap = await col.limit(1).get();
				if (!snap.empty) {
					allEmpty = false;
					break;
				}
			}

			if (!allEmpty) {
				console.log(
					`[cleanup:parent] ${path} still has non-empty subcollections — skipping.`,
				);
				report.docsSkipped++;
				continue;
			}
		}

		console.log(`[cleanup:parent] ${path} — queued for deletion.`);
		report.docsScanned++;

		if (!dryRun) {
			await docRef.delete();
		}
		report.docsDeleted++;
	}

	return report;
}

// ============================================================
// Main Migration Handler
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`\n========================================`);
	console.log(`[migrate-cleanup] Starting ${mode}...`);
	console.log(
		`[migrate-cleanup] ⚠️  SAFETY: each deletion is verified against ` +
			`a matching doc in the new English collection.`,
	);
	console.log(`========================================\n`);

	const allReports: CleanupReport[] = [];

	try {
		// --------------------------------------------------
		// Step 1: Cleanup top-level collections
		// --------------------------------------------------
		console.log(`\n--- STEP 1: Top-Level Collection Cleanup ---\n`);
		for (const [oldName, newName] of Object.entries(
			COLLECTION_RENAME_MAP,
		)) {
			const report = await cleanupTopLevelCollection(
				oldName,
				newName,
				dryRun,
			);
			allReports.push(report);
		}

		// --------------------------------------------------
		// Step 2: Cleanup subcollections
		// --------------------------------------------------
		console.log(`\n--- STEP 2: Subcollection Cleanup ---\n`);
		for (const [oldParent, subNames] of Object.entries(
			PARENT_SUBCOLLECTIONS,
		)) {
			const newParent = COLLECTION_RENAME_MAP[oldParent];
			if (!newParent) continue;

			const report = await cleanupSubcollectionsForParent(
				oldParent,
				newParent,
				subNames,
				dryRun,
			);
			allReports.push(report);
		}

		// --------------------------------------------------
		// Step 3: Cleanup protected subcollections
		// --------------------------------------------------
		console.log(`\n--- STEP 3: Protected Subcollection Cleanup ---\n`);
		const protectedReports = await cleanupProtectedSubcollections(
			dryRun,
		);
		allReports.push(...protectedReports);

		// --------------------------------------------------
		// Step 4: Cleanup empty parent docs
		// --------------------------------------------------
		console.log(`\n--- STEP 4: Empty Parent Doc Cleanup ---\n`);
		const parentReport = await cleanupEmptyParents(dryRun);
		allReports.push(parentReport);

		// --------------------------------------------------
		// Summary
		// --------------------------------------------------
		const totalScanned = allReports.reduce(
			(sum, r) => sum + r.docsScanned, 0,
		);
		const totalDeleted = allReports.reduce(
			(sum, r) => sum + r.docsDeleted, 0,
		);
		const totalSkipped = allReports.reduce(
			(sum, r) => sum + r.docsSkipped, 0,
		);
		const totalErrors = allReports.reduce(
			(sum, r) => sum + r.errors.length, 0,
		);

		const summary =
			`\n========================================\n` +
			`[migrate-cleanup] ${mode} COMPLETE\n` +
			`  Collections processed: ${allReports.length}\n` +
			`  Documents scanned:     ${totalScanned}\n` +
			`  Documents deleted:     ${totalDeleted}\n` +
			`  Documents skipped:     ${totalSkipped} (no match — safety)\n` +
			`  Errors:                ${totalErrors}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. ${totalDeleted} document(s) would be deleted, ${totalSkipped} would be skipped (no safety match). Remove ?dryRun=true to execute.`
				: `Cleanup complete. ${totalDeleted} document(s) deleted, ${totalSkipped} skipped (no safety match) across ${allReports.length} collection group(s).`,
		);
	} catch (error) {
		console.error("[migrate-cleanup] Fatal error:", error);
		res.status(500).send(
			`Cleanup failed: ${(error as Error).message}`,
		);
	}
});
