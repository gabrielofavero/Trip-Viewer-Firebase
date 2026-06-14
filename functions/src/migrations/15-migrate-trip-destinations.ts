import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ============================================================
// Migration 15: Strip embedded destination data from trip docs
//
// After migrations 13-14, trip documents in "viagens" have:
//   destinationRefs: [{ destinosID: "...", ...embedded destination data... }]
//
// This migration replaces destinationRefs with slim {id} refs.
// The full destination data lives in "destinos/{id}" — this just
// stops duplicating it inside trip docs.
//
// Idempotent: checks if destinationRefs entries already have
// the slim {id} format (lacking embedded data keys).
// ============================================================

interface TripDestReport {
	tripId: string;
	refsStripped: number;
}

/**
 * Check whether a trip's destinationRefs are already slim.
 * A slim ref has only "id" key (or "destinosID" leftover from migration 13).
 * A fat ref has additional keys like "title", "currency", "modules", etc.
 */
function refsAlreadySlim(destinationRefs: any[]): boolean {
	if (!Array.isArray(destinationRefs) || destinationRefs.length === 0) {
		return true; // nothing to strip
	}

	const fatKeys = new Set([
		"title",
		"currency",
		"version",
		"sharing",
		"modules",
		"myMaps",
		"restaurants",
		"snacks",
		"shops",
		"nightlife",
		"attractions",
	]);

	for (const ref of destinationRefs) {
		if (!ref || typeof ref !== "object") continue;
		const keys = Object.keys(ref);
		// If any key other than "id" or "destinosID" is a destination data key,
		// the refs are still fat
		for (const key of keys) {
			if (fatKeys.has(key)) return false;
		}
	}
	return true;
}

/**
 * Strip a single destinationRef from fat to slim format.
 */
function stripRef(ref: Record<string, any>): { id: string } | null {
	// The ID may be stored as "id" (post-migration-13) or "destinosID" (pre)
	const id = ref.id || ref.destinosID;
	if (!id) return null;
	return { id };
}

/**
 * Process a single trip document.
 */
async function migrateTrip(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<TripDestReport> {
	const data = tripDoc.data();
	if (!data) {
		return { tripId: tripDoc.id, refsStripped: 0 };
	}

	const destinationRefs = data.destinationRefs;
	if (!destinationRefs || !Array.isArray(destinationRefs)) {
		console.log(`  [${tripDoc.id}] No destinationRefs field — skipping.`);
		return { tripId: tripDoc.id, refsStripped: 0 };
	}

	if (refsAlreadySlim(destinationRefs)) {
		console.log(`  [${tripDoc.id}] Destination refs already slim — skipping.`);
		return { tripId: tripDoc.id, refsStripped: 0 };
	}

	const slimRefs: { id: string }[] = [];
	let stripped = 0;

	for (const ref of destinationRefs) {
		if (!ref || typeof ref !== "object") continue;

		const slimRef = stripRef(ref);
		if (slimRef) {
			slimRefs.push(slimRef);
			stripped++;
		}
	}

	if (stripped === 0) {
		console.log(`  [${tripDoc.id}] No valid refs to strip — skipping.`);
		return { tripId: tripDoc.id, refsStripped: 0 };
	}

	if (dryRun) {
		console.log(
			`  [DRY RUN] [${tripDoc.id}] Would replace ` +
				`${destinationRefs.length} fat refs with ${slimRefs.length} slim refs.`,
		);
	} else {
		await tripDoc.ref.update({ destinationRefs: slimRefs });
		console.log(
			`  [${tripDoc.id}] Updated: ${stripped} destination refs stripped.`,
		);
	}

		return { tripId: tripDoc.id, refsStripped: stripped };
}

// ============================================================
// Main Migration Handler
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`[migrate-trip-destinations] Starting ${mode}...`);

	try {
		const tripsCollection = admin.firestore().collection("viagens");
		const snapshot = await tripsCollection.get();

		if (snapshot.empty) {
			console.log("[migrate-trip-destinations] No trip documents found.");
			res.status(200).send("No trip documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-trip-destinations] Found ${snapshot.size} trip documents.`,
		);

		let totalStripped = 0;
		let tripsProcessed = 0;

		for (const tripDoc of snapshot.docs) {
			const report = await migrateTrip(tripDoc, dryRun);
			if (report.refsStripped > 0) {
				totalStripped += report.refsStripped;
				tripsProcessed++;
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-trip-destinations] ${mode} COMPLETE\n` +
			`  Trips scanned:   ${snapshot.size}\n` +
			`  Trips updated:   ${tripsProcessed}\n` +
			`  Refs stripped:   ${totalStripped}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would strip ${totalStripped} destination refs across ${tripsProcessed} trips. Remove ?dryRun=true to execute.`
				: `Migration complete. Stripped ${totalStripped} destination refs across ${tripsProcessed} trips.`,
		);
	} catch (error) {
		console.error("[migrate-trip-destinations] Fatal error:", error);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
