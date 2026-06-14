import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// Migration 19: Rename top-level collections + subcollections
//               from Portuguese → English
//
// Must run AFTER migrations 13–18 (all data is in English fields,
// subcollections exist under old Portuguese-named parents).
//
// Firestore cannot rename collections directly, so we:
//   1. Read each document from the old collection
//   2. Write it to the new collection (same doc ID, same data)
//   3. Delete it from the old collection
//
// All writes + deletes are batched. Idempotent: skips docs that
// already exist in the new collection.
// ============================================================

// ============================================================
// Top-level collection rename map
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
// Subcollections that live under each parent
// Key = old parent collection name
// ============================================================
const PARENT_SUBCOLLECTIONS: Record<string, string[]> = {
	usuarios: ["tripSummaries", "destinationSummaries", "listingSummaries"],
	viagens: ["accommodations", "transportation", "schedule"],
};

// ============================================================
// Interfaces
// ============================================================

interface MigrateReport {
	collection: string;
	docsProcessed: number;
	docsCopied: number;
	docsDeleted: number;
	errors: string[];
}

// ============================================================
// Helpers
// ============================================================

/**
 * Commit a batch and return a fresh one.
 * Handles the 500-operation Firestore limit transparently.
 */
class BatchManager {
	private batches: FirebaseFirestore.WriteBatch[] = [];
	private currentBatch: FirebaseFirestore.WriteBatch;
	private opCount = 0;

	constructor() {
		this.currentBatch = admin.firestore().batch();
		this.batches.push(this.currentBatch);
	}

	addSet(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.DocumentData,
	): void {
		this.currentBatch.set(ref, data);
		this.rotateIfNeeded();
	}

	addDelete(ref: FirebaseFirestore.DocumentReference): void {
		this.currentBatch.delete(ref);
		this.rotateIfNeeded();
	}

	private rotateIfNeeded(): void {
		this.opCount++;
		if (this.opCount >= 500) {
			this.currentBatch = admin.firestore().batch();
			this.batches.push(this.currentBatch);
			this.opCount = 0;
		}
	}

	async commitAll(): Promise<void> {
		console.log(`Committing ${this.batches.length} batch(es)...`);
		for (let i = 0; i < this.batches.length; i++) {
			await this.batches[i].commit();
			console.log(`Batch ${i + 1}/${this.batches.length} committed.`);
		}
	}

	get totalOps(): number {
		return (this.batches.length - 1) * 500 + this.opCount;
	}
}

// ============================================================
// Step 1: Rename top-level collections
// ============================================================

async function migrateTopLevelCollection(
	oldName: string,
	newName: string,
	dryRun: boolean,
): Promise<MigrateReport> {
	const report: MigrateReport = {
		collection: `${oldName} → ${newName}`,
		docsProcessed: 0,
		docsCopied: 0,
		docsDeleted: 0,
		errors: [],
	};

	const oldColRef = admin.firestore().collection(oldName);
	const newColRef = admin.firestore().collection(newName);

	console.log(`\n[${oldName} → ${newName}] Reading documents...`);
	const oldSnapshot = await oldColRef.get();

	if (oldSnapshot.empty) {
		console.log(`[${oldName} → ${newName}] Old collection is empty — skipping.`);
		return report;
	}

	console.log(
		`[${oldName} → ${newName}] Found ${oldSnapshot.size} document(s).`,
	);

	const batchManager = new BatchManager();

	for (const oldDoc of oldSnapshot.docs) {
		report.docsProcessed++;

		// Idempotency: check if doc already exists in new collection
		const newDocRef = newColRef.doc(oldDoc.id);
		const newDocSnap = await newDocRef.get();

		if (newDocSnap.exists) {
			console.log(
				`[${oldName} → ${newName}/${oldDoc.id}] Already exists in new collection — skipping copy.`,
			);
			// Still delete from old if it's a duplicate
			if (!dryRun) {
				batchManager.addDelete(oldDoc.ref);
				report.docsDeleted++;
			}
			continue;
		}

		const data = oldDoc.data();
		console.log(
			`[${oldName} → ${newName}/${oldDoc.id}] Copying... ` +
				`(${Object.keys(data).length} fields)`,
		);

		if (dryRun) {
			report.docsCopied++;
			continue;
		}

		// Write to new collection, delete from old (same batch)
		batchManager.addSet(newDocRef, data);
		batchManager.addDelete(oldDoc.ref);
		report.docsCopied++;
		report.docsDeleted++;
	}

	if (!dryRun) {
		await batchManager.commitAll();
		console.log(
			`[${oldName} → ${newName}] Committed ${report.docsCopied} copies + ` +
				`${report.docsDeleted} deletes.`,
		);
	}

	return report;
}

// ============================================================
// Step 2: Rename subcollections under parent docs
//
// For each parent doc in the old collection, enumerate known
// subcollections, copy their docs to the equivalent path under
// the new parent collection, then delete from old.
// ============================================================

async function migrateSubcollectionsForParent(
	oldParentName: string,
	newParentName: string,
	subNames: string[],
	dryRun: boolean,
): Promise<MigrateReport> {
	const report: MigrateReport = {
		collection: `${oldParentName}/*/{${subNames.join(", ")}} → ${newParentName}/*/...`,
		docsProcessed: 0,
		docsCopied: 0,
		docsDeleted: 0,
		errors: [],
	};

	const oldParentCol = admin.firestore().collection(oldParentName);
	const parentSnapshot = await oldParentCol.get();

	if (parentSnapshot.empty) {
		console.log(
			`[subcollections:${oldParentName}] No parent docs — skipping.`,
		);
		return report;
	}

	console.log(
		`[subcollections:${oldParentName}] Processing ${parentSnapshot.size} parent doc(s)...`,
	);

	const batchManager = new BatchManager();

	for (const parentDoc of parentSnapshot.docs) {
		const parentId = parentDoc.id;

		for (const subName of subNames) {
			const oldSubCol = admin
				.firestore()
				.collection(`${oldParentName}/${parentId}/${subName}`);

			let subSnapshot: FirebaseFirestore.QuerySnapshot;
			try {
				subSnapshot = await oldSubCol.get();
			} catch (err) {
				const msg = `Error reading ${oldParentName}/${parentId}/${subName}: ${(err as Error).message}`;
				console.warn(`[subcollections] ${msg}`);
				report.errors.push(msg);
				continue;
			}

			if (subSnapshot.empty) {
				continue;
			}

			console.log(
				`[subcollections] ${oldParentName}/${parentId}/${subName}: ` +
					`${subSnapshot.size} doc(s)`,
			);

			for (const subDoc of subSnapshot.docs) {
				report.docsProcessed++;

				const newDocRef = admin
					.firestore()
					.doc(`${newParentName}/${parentId}/${subName}/${subDoc.id}`);

				// Idempotency: check if doc already exists in new path
				const newDocSnap = await newDocRef.get();
				if (newDocSnap.exists) {
					console.log(
						`[subcollections] ${newParentName}/${parentId}/${subName}/${subDoc.id} ` +
							`already exists — skipping copy.`,
					);
					// Delete orphan from old path
					if (!dryRun) {
						batchManager.addDelete(subDoc.ref);
						report.docsDeleted++;
					}
					continue;
				}

				if (dryRun) {
					report.docsCopied++;
					continue;
				}

				batchManager.addSet(newDocRef, subDoc.data());
				batchManager.addDelete(subDoc.ref);
				report.docsCopied++;
				report.docsDeleted++;
			}
		}
	}

	if (!dryRun) {
		await batchManager.commitAll();
		console.log(
			`[subcollections:${oldParentName}] Committed ${report.docsCopied} copies + ` +
				`${report.docsDeleted} deletes.`,
		);
	}

	return report;
}

// ============================================================
// Step 3: Rename protected subcollections
//
// Path: viagens/protected/{pin}/{tripId}  →  trips/protected/{pin}/{tripId}
// Path: gastos/protected/{pin}/{tripId}   →  expenses/protected/{pin}/{tripId}
//
// The "protected" doc under viagens/gastos has subcollections
// named by PIN, each containing trip docs.
// ============================================================

async function migrateProtectedSubcollections(
	dryRun: boolean,
): Promise<MigrateReport[]> {
	const reports: MigrateReport[] = [];

	// Gather PINs from the top-level protegido collection
	// (this collection may have already been renamed in Step 1,
	//  so we read from "protegido" / "protected")
	const pinSources = ["protegido"];
	const tripPins: Record<string, string> = {};

	for (const pinCol of pinSources) {
		try {
			const snap = await admin.firestore().collection(pinCol).get();
			snap.forEach((doc) => {
				const pin = doc.data()?.pin;
				if (pin && !tripPins[doc.id]) {
					tripPins[doc.id] = pin;
				}
			});
		} catch {
			// Collection may not exist — that's fine
		}
	}

	console.log(
		`[protected-subcollections] Found ${Object.keys(tripPins).length} trip PIN(s).`,
	);

	// Migrate viagens/protected/{pin}/{tripId} → trips/protected/{pin}/{tripId}
	const viagensReport = await migrateProtectedForParent(
		"viagens",
		"trips",
		tripPins,
		dryRun,
	);
	if (viagensReport) reports.push(viagensReport);

	// Migrate gastos/protected/{pin}/{tripId} → expenses/protected/{pin}/{tripId}
	const gastosReport = await migrateProtectedForParent(
		"gastos",
		"expenses",
		tripPins,
		dryRun,
	);
	if (gastosReport) reports.push(gastosReport);

	return reports;
}

async function migrateProtectedForParent(
	oldParent: string,
	newParent: string,
	tripPins: Record<string, string>,
	dryRun: boolean,
): Promise<MigrateReport | null> {
	const report: MigrateReport = {
		collection: `${oldParent}/protected/{pin}/* → ${newParent}/protected/{pin}/*`,
		docsProcessed: 0,
		docsCopied: 0,
		docsDeleted: 0,
		errors: [],
	};

	// Read the "protected" doc's subcollections
	const protectedDocRef = admin.firestore().doc(`${oldParent}/protected`);

	let protectedCollections: FirebaseFirestore.CollectionReference[];
	try {
		protectedCollections = await protectedDocRef.listCollections();
	} catch (err) {
		console.log(
			`[protected:${oldParent}] No protected subcollections found — skipping. ` +
				`(${(err as Error).message})`,
		);
		return null;
	}

	if (protectedCollections.length === 0) {
		console.log(`[protected:${oldParent}] No subcollections — skipping.`);
		return null;
	}

	const batchManager = new BatchManager();

	for (const pinCol of protectedCollections) {
		const pin = pinCol.id;
		const pinSnapshot = await pinCol.get();

		console.log(
			`[protected:${oldParent}] PIN "${pin}": ${pinSnapshot.size} doc(s)`,
		);

		for (const doc of pinSnapshot.docs) {
			report.docsProcessed++;

			const newDocRef = admin
				.firestore()
				.doc(`${newParent}/protected/${pin}/${doc.id}`);

			// Idempotency check
			const newDocSnap = await newDocRef.get();
			if (newDocSnap.exists) {
				console.log(
					`[protected:${oldParent}] ${newParent}/protected/${pin}/${doc.id} ` +
						`already exists — skipping copy.`,
				);
				if (!dryRun) {
					batchManager.addDelete(doc.ref);
					report.docsDeleted++;
				}
				continue;
			}

			if (dryRun) {
				report.docsCopied++;
				continue;
			}

			batchManager.addSet(newDocRef, doc.data());
			batchManager.addDelete(doc.ref);
			report.docsCopied++;
			report.docsDeleted++;
		}
	}

	if (!dryRun) {
		await batchManager.commitAll();
		console.log(
			`[protected:${oldParent}] Committed ${report.docsCopied} copies + ` +
				`${report.docsDeleted} deletes.`,
		);
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
	console.log(`[migrate-collection-names] Starting ${mode}...`);
	console.log(`========================================\n`);

	const allReports: MigrateReport[] = [];

	try {
		// --------------------------------------------------
		// Step 1: Rename top-level collections
		// --------------------------------------------------
		console.log(`\n--- STEP 1: Top-Level Collection Renames ---\n`);
		for (const [oldName, newName] of Object.entries(COLLECTION_RENAME_MAP)) {
			const report = await migrateTopLevelCollection(
				oldName,
				newName,
				dryRun,
			);
			allReports.push(report);
		}

		// --------------------------------------------------
		// Step 2: Rename subcollections under parent docs
		// --------------------------------------------------
		console.log(`\n--- STEP 2: Subcollection Renames ---\n`);
		for (const [oldParent, subNames] of Object.entries(
			PARENT_SUBCOLLECTIONS,
		)) {
			const newParent = COLLECTION_RENAME_MAP[oldParent];
			if (!newParent) {
				console.warn(
					`[subcollections] No rename mapping for parent "${oldParent}" — skipping.`,
				);
				continue;
			}

			const report = await migrateSubcollectionsForParent(
				oldParent,
				newParent,
				subNames,
				dryRun,
			);
			allReports.push(report);
		}

		// --------------------------------------------------
		// Step 3: Rename protected subcollections
		// --------------------------------------------------
		console.log(`\n--- STEP 3: Protected Subcollection Renames ---\n`);
		const protectedReports = await migrateProtectedSubcollections(dryRun);
		allReports.push(...protectedReports);

		// --------------------------------------------------
		// Summary
		// --------------------------------------------------
		const totalProcessed = allReports.reduce(
			(sum, r) => sum + r.docsProcessed, 0,
		);
		const totalCopied = allReports.reduce(
			(sum, r) => sum + r.docsCopied, 0,
		);
		const totalDeleted = allReports.reduce(
			(sum, r) => sum + r.docsDeleted, 0,
		);
		const totalErrors = allReports.reduce(
			(sum, r) => sum + r.errors.length, 0,
		);

		const summary =
			`\n========================================\n` +
			`[migrate-collection-names] ${mode} COMPLETE\n` +
			`  Collections processed: ${allReports.length}\n` +
			`  Documents scanned:     ${totalProcessed}\n` +
			`  Documents copied:      ${totalCopied}\n` +
			`  Documents deleted:     ${totalDeleted}\n` +
			`  Errors:                ${totalErrors}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. ${totalCopied} document(s) would be copied, ${totalDeleted} would be deleted. Remove ?dryRun=true to execute.`
				: `Migration complete. ${totalCopied} document(s) copied, ${totalDeleted} deleted across ${allReports.length} collection group(s).`,
		);
	} catch (error) {
		console.error("[migrate-collection-names] Fatal error:", error);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
