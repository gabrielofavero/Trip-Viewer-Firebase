import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// Migration 21: Migrate itinerary item `tipo` values
//                Portuguese → English
//
// After collection renames (migration 19), trip documents
// are in the "trips" collection with itinerary data in the
// "itinerary" subcollection:
//   trips/{tripId}/itinerary/{dayId}
//
// Each day doc has period arrays (earlyMorning, morning,
// afternoon, night) whose items have an `item.tipo` field:
//
//   "transporte"   → "transportation"
//   "hospedagens"  → "accommodations"
//   "destinos"     → "destinations"
//
// Idempotent: skips values already in English.
// Supports dry-run via ?dryRun=true query parameter.
// ============================================================

const TIPO_MAP: Record<string, string> = {
	transporte: "transportation",
	hospedagens: "accommodations",
	destinos: "destinations",
};

const PERIODS = ["earlyMorning", "morning", "afternoon", "night"];

interface MigrationReport {
	tripId: string;
	daysProcessed: number;
	itemsMigrated: number;
}

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`[21-migrate-itinerary-tipo] Starting in ${mode} mode…`);

	const tripsCollection = admin.firestore().collection("trips");
	const tripsSnap = await tripsCollection.get();

	const reports: MigrationReport[] = [];
	let totalItems = 0;
	let totalDays = 0;
	const batch = admin.firestore().batch();
	let batchCount = 0;
	const MAX_BATCH = 500;

	for (const tripDoc of tripsSnap.docs) {
		const report: MigrationReport = {
			tripId: tripDoc.id,
			daysProcessed: 0,
			itemsMigrated: 0,
		};

		const itinerarySnap = await tripDoc.ref
			.collection("itinerary")
			.get();

		if (itinerarySnap.empty) {
			reports.push(report);
			continue;
		}

		for (const dayDoc of itinerarySnap.docs) {
			const data = dayDoc.data();
			if (!data) continue;

			let dayChanged = false;

			for (const period of PERIODS) {
				const items = data[period];
				if (!Array.isArray(items)) continue;

				for (const item of items) {
					if (!item.item || !item.item.tipo) continue;

					const oldTipo = item.item.tipo;
					const newTipo = TIPO_MAP[oldTipo];

					if (newTipo && newTipo !== oldTipo) {
						item.item.tipo = newTipo;
						report.itemsMigrated++;
						dayChanged = true;
					}
				}
			}

			if (dayChanged) {
				report.daysProcessed++;

				if (dryRun) {
					console.log(
						`  [DRY RUN] Would update trips/${tripDoc.id}/itinerary/${dayDoc.id} (${report.itemsMigrated} items in this day so far)`,
					);
				} else {
					batch.set(dayDoc.ref, data);
					batchCount++;

					if (batchCount >= MAX_BATCH) {
						await batch.commit();
						console.log(
							`  Committed batch of ${batchCount} docs…`,
						);
						batchCount = 0;
					}
				}
			}
		}

		totalDays += report.daysProcessed;
		totalItems += report.itemsMigrated;

		if (report.daysProcessed > 0) {
			reports.push(report);
			console.log(
				`  Trip ${tripDoc.id}: ${report.daysProcessed} day(s), ${report.itemsMigrated} item(s)`,
			);
		}
	}

	// Commit any remaining batch
	if (batchCount > 0 && !dryRun) {
		await batch.commit();
		console.log(`  Committed final batch of ${batchCount} docs.`);
	}

	const summary = {
		mode,
		tripsWithChanges: reports.length,
		totalDaysUpdated: totalDays,
		totalItemsMigrated: totalItems,
	};

	console.log(`[21-migrate-itinerary-tipo] ${mode} complete.`, summary);

	res.status(200).json(summary);
});
