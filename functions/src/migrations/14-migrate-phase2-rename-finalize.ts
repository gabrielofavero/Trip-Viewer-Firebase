import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// PHASE 2: Rename Collections & Finalize
// Combines migrations 19–22 into a single pass.
//
// Steps:
//   1. Rename subcollections under old parent docs
//   2. Rename protected subcollections
//   3. Rename top-level collections (Portuguese → English)
//   4. Fix itinerary item `tipo` values in new "trips" collection
//   5. Fix destination category subcollections & module keys
//   6. (Optional) Cleanup old Portuguese collections
//
// Must run AFTER Phase 1 (translate & restructure).
// Supports ?dryRun=true and ?cleanup=true query parameters.
// ============================================================

// ============================================================
// COLLECTION RENAME MAPS
// ============================================================

const COLLECTION_RENAME_MAP: Record<string, string> = {
	usuarios: "users",
	viagens: "trips",
	destinos: "destinations",
	listagens: "listings",
	gastos: "expenses",
	protegido: "protected",
};

const PARENT_SUBCOLLECTIONS: Record<string, string[]> = {
	usuarios: ["tripSummaries", "destinationSummaries", "listingSummaries"],
	viagens: ["accommodations", "transportation", "itinerary"],
};

const CATEGORY_MAP: Record<string, string> = {
	restaurantes: "restaurants",
	lanches: "snacks",
	saidas: "nightlife",
	turismo: "tourism",
	lojas: "shopping",
};

const TIPO_MAP: Record<string, string> = {
	transporte: "transportation",
	hospedagens: "accommodations",
	destinos: "destinations",
};

const PERIODS = ["earlyMorning", "morning", "afternoon", "night"];

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
		for (let i = 0; i < this.batches.length; i++) {
			await this.batches[i].commit();
		}
	}
}

// ============================================================
// STEP 1: Rename subcollections under parent docs
// ============================================================

interface MigrateReport {
	label: string;
	processed: number;
	copied: number;
	deleted: number;
	errors: string[];
}

async function migrateSubcollections(
	oldParent: string,
	newParent: string,
	subNames: string[],
	dryRun: boolean,
): Promise<MigrateReport> {
	const report: MigrateReport = {
		label: `${oldParent}/*/{subcollections} → ${newParent}/*/...`,
		processed: 0,
		copied: 0,
		deleted: 0,
		errors: [],
	};

	const parentSnap = await admin.firestore().collection(oldParent).get();
	if (parentSnap.empty) {
		console.log(`[sub:${oldParent}] No parent docs — skipping.`);
		return report;
	}

	console.log(`[sub:${oldParent}] ${parentSnap.size} parent doc(s)...`);
	const batch = new BatchManager();

	for (const parentDoc of parentSnap.docs) {
		for (const subName of subNames) {
			const oldPath = `${oldParent}/${parentDoc.id}/${subName}`;
			let subSnap: FirebaseFirestore.QuerySnapshot;
			try {
				subSnap = await admin.firestore().collection(oldPath).get();
			} catch {
				continue;
			}
			if (subSnap.empty) continue;

			console.log(`[sub] ${oldPath}: ${subSnap.size} doc(s)`);

			for (const subDoc of subSnap.docs) {
				report.processed++;
				const newRef = admin.firestore().doc(`${newParent}/${parentDoc.id}/${subName}/${subDoc.id}`);
				const newSnap = await newRef.get();

				if (newSnap.exists) {
					console.log(`[sub] ${newParent}/${parentDoc.id}/${subName}/${subDoc.id} exists — deleting old.`);
					if (!dryRun) batch.delete(subDoc.ref);
					report.deleted++;
					continue;
				}

				if (dryRun) {
					report.copied++;
				} else {
					batch.set(newRef, subDoc.data());
					batch.delete(subDoc.ref);
					report.copied++;
					report.deleted++;
				}
			}
		}
	}

	if (!dryRun) await batch.commitAll();
	console.log(`[sub:${oldParent}] ${report.copied} copied, ${report.deleted} deleted.`);
	return report;
}

// ============================================================
// STEP 2: Rename protected subcollections
// ============================================================

async function migrateProtectedSubcollections(dryRun: boolean): Promise<MigrateReport[]> {
	const reports: MigrateReport[] = [];

	// Gather PINs
	const tripPins: Record<string, string> = {};
	try {
		const snap = await admin.firestore().collection("protegido").get();
		snap.forEach((doc) => {
			const pin = doc.data()?.pin;
			if (pin) tripPins[doc.id] = pin;
		});
	} catch { /* collection may not exist */ }

	console.log(`[protected] ${Object.keys(tripPins).length} PIN(s).`);

	for (const [oldParent, newParent] of [["viagens", "trips"], ["gastos", "expenses"]] as const) {
		const report: MigrateReport = { label: `${oldParent}/protected/* → ${newParent}/protected/*`, processed: 0, copied: 0, deleted: 0, errors: [] };

		const protectedRef = admin.firestore().doc(`${oldParent}/protected`);
		let cols: FirebaseFirestore.CollectionReference[];
		try {
			cols = await protectedRef.listCollections();
		} catch {
			console.log(`[protected:${oldParent}] No subcollections — skipping.`);
			reports.push(report);
			continue;
		}

		const batch = new BatchManager();
		for (const pinCol of cols) {
			const pinSnap = await pinCol.get();
			console.log(`[protected:${oldParent}] PIN "${pinCol.id}": ${pinSnap.size} doc(s)`);

			for (const doc of pinSnap.docs) {
				report.processed++;
				const newRef = admin.firestore().doc(`${newParent}/protected/${pinCol.id}/${doc.id}`);
				const newSnap = await newRef.get();

				if (newSnap.exists) {
					if (!dryRun) batch.delete(doc.ref);
					report.deleted++;
					continue;
				}

				if (dryRun) {
					report.copied++;
				} else {
					batch.set(newRef, doc.data());
					batch.delete(doc.ref);
					report.copied++;
					report.deleted++;
				}
			}
		}

		if (!dryRun) await batch.commitAll();
		reports.push(report);
	}

	return reports;
}

// ============================================================
// STEP 3: Rename top-level collections
// ============================================================

async function migrateTopLevel(
	oldName: string,
	newName: string,
	dryRun: boolean,
): Promise<MigrateReport> {
	const report: MigrateReport = {
		label: `${oldName} → ${newName}`,
		processed: 0,
		copied: 0,
		deleted: 0,
		errors: [],
	};

	const oldSnap = await admin.firestore().collection(oldName).get();
	if (oldSnap.empty) {
		console.log(`[${oldName} → ${newName}] Empty — skipping.`);
		return report;
	}

	console.log(`[${oldName} → ${newName}] ${oldSnap.size} doc(s)...`);
	const batch = new BatchManager();

	for (const oldDoc of oldSnap.docs) {
		report.processed++;
		const newRef = admin.firestore().collection(newName).doc(oldDoc.id);
		const newSnap = await newRef.get();

		if (newSnap.exists) {
			console.log(`[${oldName}/${oldDoc.id}] Already exists in ${newName} — deleting old.`);
			if (!dryRun) batch.delete(oldDoc.ref);
			report.deleted++;
			continue;
		}

		if (dryRun) {
			report.copied++;
		} else {
			batch.set(newRef, oldDoc.data());
			batch.delete(oldDoc.ref);
			report.copied++;
			report.deleted++;
		}
	}

	if (!dryRun) await batch.commitAll();
	console.log(`[${oldName} → ${newName}] ${report.copied} copied, ${report.deleted} deleted.`);
	return report;
}

// ============================================================
// STEP 4: Fix itinerary item `tipo` values (migration 21)
// ============================================================

async function fixItineraryTipo(dryRun: boolean): Promise<{ days: number; items: number }> {
	console.log(`\n[fix-itinerary-tipo] Scanning trips/itinerary...`);

	const tripsSnap = await admin.firestore().collection("trips").get();
	if (tripsSnap.empty) {
		console.log(`[fix-itinerary-tipo] No trips found.`);
		return { days: 0, items: 0 };
	}

	let totalDays = 0;
	let totalItems = 0;
	const batch = admin.firestore().batch();
	let batchCount = 0;

	for (const tripDoc of tripsSnap.docs) {
		const itinSnap = await tripDoc.ref.collection("itinerary").get();
		if (itinSnap.empty) continue;

		for (const dayDoc of itinSnap.docs) {
			const data = dayDoc.data();
			if (!data) continue;
			let changed = false;

			for (const period of PERIODS) {
				const items = data[period];
				if (!Array.isArray(items)) continue;

				for (const item of items) {
					if (!item.item || !item.item.tipo) continue;
					const oldTipo = item.item.tipo;
					const newTipo = TIPO_MAP[oldTipo];
					if (newTipo && newTipo !== oldTipo) {
						item.item.tipo = newTipo;
						totalItems++;
						changed = true;
					}
				}
			}

			if (changed) {
				totalDays++;
				if (dryRun) {
					console.log(`  [DRY RUN] Would update trips/${tripDoc.id}/itinerary/${dayDoc.id}`);
				} else {
					batch.set(dayDoc.ref, data);
					batchCount++;
					if (batchCount >= 500) {
						await batch.commit();
						batchCount = 0;
					}
				}
			}
		}
	}

	if (batchCount > 0 && !dryRun) await batch.commit();
	console.log(`[fix-itinerary-tipo] ${totalDays} days, ${totalItems} items.`);
	return { days: totalDays, items: totalItems };
}

// ============================================================
// STEP 5: Fix destination categories (migration 22)
// ============================================================

async function fixDestinationCategories(dryRun: boolean): Promise<{ dests: number; subItems: number; moduleKeys: number }> {
	console.log(`\n[fix-destination-categories] Scanning destinations...`);

	const destSnap = await admin.firestore().collection("destinations").get();
	if (destSnap.empty) {
		console.log(`[fix-destination-categories] No destinations.`);
		return { dests: 0, subItems: 0, moduleKeys: 0 };
	}

	let destsProcessed = 0;
	let totalSubItems = 0;
	let totalModuleKeys = 0;

	for (const destDoc of destSnap.docs) {
		const data = destDoc.data();
		if (!data) continue;

		let destChanged = false;

		// Fix modules map keys
		const modules = data.modulos || data.modules || {};
		let modulesChanged = false;

		for (const [oldKey, newKey] of Object.entries(CATEGORY_MAP)) {
			if (oldKey in modules && !(newKey in modules)) {
				modules[newKey] = modules[oldKey];
				delete modules[oldKey];
				modulesChanged = true;
				totalModuleKeys++;
			}
		}

		if (data.modulos) {
			data.modules = data.modulos;
			delete data.modulos;
			modulesChanged = true;
		}

		if (modulesChanged) {
			if (dryRun) {
				console.log(`  [DRY RUN] Would update modules for ${destDoc.id}`);
			} else {
				await destDoc.ref.update({
					modules,
					...(data.modulos ? { modulos: admin.firestore.FieldValue.delete() } : {}),
				});
			}
			destChanged = true;
		}

		// Migrate category subcollections
		for (const [oldCat, newCat] of Object.entries(CATEGORY_MAP)) {
			const oldSubSnap = await destDoc.ref.collection(oldCat).limit(1).get();
			if (oldSubSnap.empty) continue;

			const newSubSnap = await destDoc.ref.collection(newCat).limit(1).get();
			if (!newSubSnap.empty) {
				console.log(`  ${destDoc.id}: "${newCat}" already exists, skipping.`);
				continue;
			}

			const allOld = await destDoc.ref.collection(oldCat).get();
			if (dryRun) {
				console.log(`  [DRY RUN] ${destDoc.id}: ${allOld.size} doc(s) ${oldCat} → ${newCat}`);
				totalSubItems += allOld.size;
			} else {
				const batch = admin.firestore().batch();
				let bc = 0;
				for (const item of allOld.docs) {
					batch.set(destDoc.ref.collection(newCat).doc(item.id), item.data() || {});
					batch.delete(item.ref);
					bc += 2;
					if (bc >= 500) { await batch.commit(); bc = 0; }
				}
				if (bc > 0) await batch.commit();
				totalSubItems += allOld.size;
			}
			destChanged = true;
		}

		if (destChanged) destsProcessed++;
	}

	console.log(`[fix-destination-categories] ${destsProcessed} destinations, ${totalSubItems} sub-items, ${totalModuleKeys} module keys.`);
	return { dests: destsProcessed, subItems: totalSubItems, moduleKeys: totalModuleKeys };
}

// ============================================================
// STEP 6 (OPTIONAL): Cleanup old collections (migration 20)
// ============================================================

async function cleanupOldCollections(dryRun: boolean): Promise<MigrateReport[]> {
	console.log(`\n[cleanup] Starting cleanup of old Portuguese collections...`);
	const reports: MigrateReport[] = [];

	// Cleanup top-level
	for (const [oldName, newName] of Object.entries(COLLECTION_RENAME_MAP)) {
		const newSnap = await admin.firestore().collection(newName).limit(1).get();
		if (newSnap.empty) {
			console.log(`[cleanup:${oldName}] New collection "${newName}" empty — SKIPPING (safety).`);
			continue;
		}

		const oldSnap = await admin.firestore().collection(oldName).get();
		if (oldSnap.empty) {
			console.log(`[cleanup:${oldName}] Already empty.`);
			continue;
		}

		const report: MigrateReport = { label: `cleanup:${oldName}`, processed: 0, copied: 0, deleted: 0, errors: [] };
		const batch = new BatchManager();

		for (const oldDoc of oldSnap.docs) {
			report.processed++;
			const match = await admin.firestore().collection(newName).doc(oldDoc.id).get();
			if (!match.exists) {
				console.log(`[cleanup:${oldName}/${oldDoc.id}] No match — SKIPPING.`);
				continue;
			}
			if (!dryRun) batch.delete(oldDoc.ref);
			report.deleted++;
		}

		if (!dryRun) await batch.commitAll();
		console.log(`[cleanup:${oldName}] ${report.deleted} deleted.`);
		reports.push(report);
	}

	// Cleanup subcollections
	for (const [oldParent, subNames] of Object.entries(PARENT_SUBCOLLECTIONS)) {
		const newParent = COLLECTION_RENAME_MAP[oldParent];
		if (!newParent) continue;

		const parentSnap = await admin.firestore().collection(oldParent).get();
		if (parentSnap.empty) continue;

		const report: MigrateReport = { label: `cleanup:sub:${oldParent}`, processed: 0, copied: 0, deleted: 0, errors: [] };
		const batch = new BatchManager();

		for (const parentDoc of parentSnap.docs) {
			for (const subName of subNames) {
				const oldPath = `${oldParent}/${parentDoc.id}/${subName}`;
				let subSnap: FirebaseFirestore.QuerySnapshot;
				try { subSnap = await admin.firestore().collection(oldPath).get(); } catch { continue; }
				if (subSnap.empty) continue;

				for (const subDoc of subSnap.docs) {
					report.processed++;
					const newRef = admin.firestore().doc(`${newParent}/${parentDoc.id}/${subName}/${subDoc.id}`);
					const match = await newRef.get();
					if (!match.exists) {
						console.log(`[cleanup:sub] ${oldPath}/${subDoc.id} — no match, SKIPPING.`);
						continue;
					}
					if (!dryRun) batch.delete(subDoc.ref);
					report.deleted++;
				}
			}
		}

		if (!dryRun) await batch.commitAll();
		console.log(`[cleanup:sub:${oldParent}] ${report.deleted} deleted.`);
		reports.push(report);
	}

	return reports;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const doCleanup = req.query.cleanup === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`\n========================================`);
	console.log(`[phase2-rename-finalize] ${mode}${doCleanup ? " + CLEANUP" : ""}`);
	console.log(`========================================\n`);

	const allReports: MigrateReport[] = [];

	try {
		// ── Step 1: Rename subcollections (must run before top-level renames) ──
		console.log(`\n--- STEP 1: Subcollection Renames ---\n`);
		for (const [oldParent, subNames] of Object.entries(PARENT_SUBCOLLECTIONS)) {
			const newParent = COLLECTION_RENAME_MAP[oldParent];
			if (!newParent) continue;
			const report = await migrateSubcollections(oldParent, newParent, subNames, dryRun);
			allReports.push(report);
		}

		// ── Step 2: Rename protected subcollections ──
		console.log(`\n--- STEP 2: Protected Subcollection Renames ---\n`);
		const protReports = await migrateProtectedSubcollections(dryRun);
		allReports.push(...protReports);

		// ── Step 3: Rename top-level collections ──
		console.log(`\n--- STEP 3: Top-Level Collection Renames ---\n`);
		for (const [oldName, newName] of Object.entries(COLLECTION_RENAME_MAP)) {
			const report = await migrateTopLevel(oldName, newName, dryRun);
			allReports.push(report);
		}

		// ── Step 4: Fix itinerary tipo values ──
		console.log(`\n--- STEP 4: Fix Itinerary Tipo Values ---\n`);
		const tipoResult = await fixItineraryTipo(dryRun);

		// ── Step 5: Fix destination categories ──
		console.log(`\n--- STEP 5: Fix Destination Categories ---\n`);
		const catResult = await fixDestinationCategories(dryRun);

		// ── Step 6 (optional): Cleanup ──
		let cleanupReports: MigrateReport[] = [];
		if (doCleanup) {
			console.log(`\n--- STEP 6: Cleanup Old Collections ---\n`);
			cleanupReports = await cleanupOldCollections(dryRun);
			allReports.push(...cleanupReports);
		}

		// ── Summary ──
		const totalProcessed = allReports.reduce((s, r) => s + r.processed, 0);
		const totalCopied = allReports.reduce((s, r) => s + r.copied, 0);
		const totalDeleted = allReports.reduce((s, r) => s + r.deleted, 0);
		const totalErrors = allReports.reduce((s, r) => s + r.errors.length, 0);

		const summary =
			`\n========================================\n` +
			`[phase2] ${mode} COMPLETE\n` +
			`  Docs processed:     ${totalProcessed}\n` +
			`  Docs copied:        ${totalCopied}\n` +
			`  Docs deleted:       ${totalDeleted}\n` +
			`  Errors:             ${totalErrors}\n` +
			`  Itinerary days fixed: ${tipoResult.days} (${tipoResult.items} items)\n` +
			`  Destination cats:   ${catResult.dests} dests, ${catResult.subItems} items, ${catResult.moduleKeys} keys\n` +
			(doCleanup ? `  Cleanup deletes:    ${cleanupReports.reduce((s, r) => s + r.deleted, 0)}\n` : "") +
			`========================================`;

		console.log(summary);
		res.status(200).json({
			mode,
			cleanup: doCleanup,
			totalProcessed,
			totalCopied,
			totalDeleted,
			totalErrors,
			itineraryTipo: tipoResult,
			destinationCategories: catResult,
			cleanupDeletes: doCleanup ? cleanupReports.reduce((s, r) => s + r.deleted, 0) : 0,
		});
	} catch (error) {
		console.error("[phase2] Fatal error:", error);
		res.status(500).send(`Migration failed: ${(error as Error).message}`);
	}
});
