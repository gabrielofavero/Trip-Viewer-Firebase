import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// Migration 22: Migrate destination category subcollection names
//               Portuguese → English
//
// Destination documents may have subcollections with
// Portuguese names from the original schema:
//
//   destinations/{id}/restaurantes/{itemId}
//   destinations/{id}/lanches/{itemId}
//   destinations/{id}/saidas/{itemId}
//   destinations/{id}/turismo/{itemId}
//   destinations/{id}/lojas/{itemId}
//
// These become:
//
//   destinations/{id}/restaurants/{itemId}
//   destinations/{id}/snacks/{itemId}
//   destinations/{id}/nightlife/{itemId}
//   destinations/{id}/tourism/{itemId}
//   destinations/{id}/shopping/{itemId}
//
// Also migrates the `modulos` map keys inside each destination doc.
//
// Idempotent: skips categories already in English.
// Supports dry-run via ?dryRun=true query parameter.
// ============================================================

const CATEGORY_MAP: Record<string, string> = {
	restaurantes: "restaurants",
	lanches: "snacks",
	saidas: "nightlife",
	turismo: "tourism",
	lojas: "shopping",
};

interface MigrationReport {
	destinationId: string;
	categoriesMigrated: string[];
	subcollectionItemsMigrated: number;
	modulesKeysMigrated: number;
}

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`[22-migrate-destination-categories] Starting in ${mode} mode…`);

	const destinationsCollection = admin.firestore().collection("destinations");
	const destinationsSnap = await destinationsCollection.get();

	const reports: MigrationReport[] = [];
	let totalSubcollectionItems = 0;
	let totalModulesKeys = 0;

	for (const destDoc of destinationsSnap.docs) {
		const report: MigrationReport = {
			destinationId: destDoc.id,
			categoriesMigrated: [],
			subcollectionItemsMigrated: 0,
			modulesKeysMigrated: 0,
		};

		const data = destDoc.data();
		if (!data) continue;

		// ── Migrate modules map keys ──────────────────────────
		const modules = data.modulos || data.modules || {};
		let modulesChanged = false;

		for (const [oldKey, newKey] of Object.entries(CATEGORY_MAP)) {
			if (oldKey in modules && !(newKey in modules)) {
				// Move the value from old key to new key
				modules[newKey] = modules[oldKey];
				delete modules[oldKey];
				modulesChanged = true;
				report.modulesKeysMigrated++;
			}
		}

		// Normalize the field name itself (modulos → modules)
		if (data.modulos) {
			data.modules = data.modulos;
			delete data.modulos;
			modulesChanged = true;
		}

		if (modulesChanged) {
			if (dryRun) {
				console.log(
					`  [DRY RUN] Would update modules map for destination ${destDoc.id}`,
				);
			} else {
				await destDoc.ref.update({
					modules,
					...(data.modulos ? { modulos: admin.firestore.FieldValue.delete() } : {}),
				});
			}
		}

		// ── Migrate subcollections ───────────────────────────
		for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAP)) {
			// Check if old subcollection exists
			const oldSubSnap = await destDoc.ref.collection(oldCategory).limit(1).get();

			if (oldSubSnap.empty) {
				// No old subcollection — skip
				continue;
			}

			// Check if new subcollection already exists (idempotent)
			const newSubSnap = await destDoc.ref.collection(newCategory).limit(1).get();
			if (!newSubSnap.empty) {
				console.log(
					`  Destination ${destDoc.id}: new subcollection "${newCategory}" already exists, skipping`,
				);
				continue;
			}

			// Read all docs from old subcollection
			const allOldDocs = await destDoc.ref.collection(oldCategory).get();

			if (dryRun) {
				console.log(
					`  [DRY RUN] Would move ${allOldDocs.size} doc(s) from ${oldCategory} → ${newCategory} for destination ${destDoc.id}`,
				);
				report.subcollectionItemsMigrated += allOldDocs.size;
				report.categoriesMigrated.push(oldCategory);
			} else {
				const batch = admin.firestore().batch();
				let batchCount = 0;

				for (const itemDoc of allOldDocs.docs) {
					// Write to new subcollection
					batch.set(
						destDoc.ref.collection(newCategory).doc(itemDoc.id),
						itemDoc.data() || {},
					);
					// Delete from old subcollection
					batch.delete(itemDoc.ref);
					batchCount += 2;

					if (batchCount >= 500) {
						await batch.commit();
						console.log(`  Committed batch of ${batchCount} ops…`);
						batchCount = 0;
					}
				}

				if (batchCount > 0) {
					await batch.commit();
				}

				report.subcollectionItemsMigrated += allOldDocs.size;
				report.categoriesMigrated.push(oldCategory);
			}
		}

		totalSubcollectionItems += report.subcollectionItemsMigrated;
		totalModulesKeys += report.modulesKeysMigrated;

		if (report.categoriesMigrated.length > 0 || report.modulesKeysMigrated > 0) {
			reports.push(report);
			console.log(
				`  Destination ${destDoc.id}: ${report.categoriesMigrated.length} subcollection(s), ${report.subcollectionItemsMigrated} item(s), ${report.modulesKeysMigrated} module key(s)`,
			);
		}
	}

	const summary = {
		mode,
		destinationsWithChanges: reports.length,
		totalSubcollectionItemsMigrated: totalSubcollectionItems,
		totalModulesKeysMigrated: totalModulesKeys,
	};

	console.log(`[22-migrate-destination-categories] ${mode} complete.`, summary);

	res.status(200).json(summary);
});
