import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================================
// Migration 18: Move itinerary from trip doc to subcollection
//
// After migrations 13-17, trip documents in "viagens" have:
//   itinerary: [
//     {
//       title: { value, showDestinations, translate },
//       date: DateObject,
//       destinationIds: string[],
//       earlyMorning: PeriodItem[],
//       morning: PeriodItem[],
//       afternoon: PeriodItem[],
//       night: PeriodItem[]
//     },
//     ...
//   ]
//
// This migration moves each day to:
//   viagens/{tripId}/itinerary/{dayId}
//
// Then deletes the "itinerary" field from the trip doc.
//
// Day IDs use date-based naming: YYYYMMDD (e.g. "20260315").
// Falls back to "day-1", "day-2" if date field is missing.
//
// Idempotent: checks if the "itinerary" field has already been
// removed from the trip doc or is empty.
// ============================================================

interface ItineraryMigrationReport {
	tripId: string;
	daysMoved: number;
}

/**
 * Check if this trip's itinerary has already been migrated.
 */
async function isAlreadyMigrated(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<boolean> {
	const data = tripDoc.data();
	if (!data) return true;

	// If itinerary field is missing, assume already migrated
	const itinerary = data.itinerary;
	if (itinerary === undefined || itinerary === null) {
		return true;
	}

	// If it's an empty array, treat as migrated
	if (Array.isArray(itinerary) && itinerary.length === 0) {
		return true;
	}

	// Check if subcollection already has documents
	const subSnap = await tripDoc.ref
		.collection("itinerary")
		.limit(1)
		.get();
	if (!subSnap.empty) {
		return true;
	}

	return false;
}

/**
 * Build a YYYYMMDD day ID from a DateObject, or fall back to index-based.
 */
function buildDayId(day: Record<string, any>, index: number): string {
	const date = day.date;
	if (
		date &&
		typeof date === "object" &&
		typeof date.year === "number" &&
		typeof date.month === "number" &&
		typeof date.day === "number"
	) {
		const y = String(date.year);
		const m = String(date.month).padStart(2, "0");
		const d = String(date.day).padStart(2, "0");
		return `${y}${m}${d}`;
	}
	// Fallback to index-based ID if date is missing
	return `day-${index + 1}`;
}

/**
 * Move itinerary days for a single trip into subcollection.
 */
async function migrateItinerary(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<ItineraryMigrationReport> {
	const report: ItineraryMigrationReport = {
		tripId: tripDoc.id,
		daysMoved: 0,
	};

	const data = tripDoc.data();
	if (!data) return report;

	const itinerary = data.itinerary;
	if (!Array.isArray(itinerary) || itinerary.length === 0) {
		return report;
	}

	const totalDays = itinerary.length;
	console.log(
		`  [${tripDoc.id}] Found ${totalDays} itinerary days to migrate.`,
	);

	// Collect existing subcollection doc IDs to avoid overwriting
	const existingSnap = dryRun
		? null
		: await tripDoc.ref.collection("itinerary").get();
	const existingIds = new Set<string>();
	if (existingSnap) {
		existingSnap.forEach((doc) => existingIds.add(doc.id));
	}

	const batch = admin.firestore().batch();
	let batchCount = 0;

	for (let i = 0; i < itinerary.length; i++) {
		const day = itinerary[i];
		if (!day || typeof day !== "object") continue;

		// Use date-based ID: YYYYMMDD (falls back to day-N if date missing)
		let dayId = buildDayId(day, i);
		if (existingIds.has(dayId)) {
			// If duplicate (rare), append a random suffix
			const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
			const array = new Uint32Array(3);
			crypto.getRandomValues(array);
			let suffix = "";
			for (let j = 0; j < 3; j++) {
				suffix += chars[array[j] % chars.length];
			}
			dayId = `${dayId}-${suffix}`;
		}
		existingIds.add(dayId);

		// Build clean day document with only known fields
		const dayDoc: Record<string, any> = {};

		if (day.title !== undefined) dayDoc.title = day.title;
		if (day.date !== undefined) dayDoc.date = day.date;
		if (day.destinationIds !== undefined) {
			dayDoc.destinationIds = day.destinationIds;
		}
		if (day.earlyMorning !== undefined) {
			dayDoc.earlyMorning = day.earlyMorning;
		}
		if (day.morning !== undefined) dayDoc.morning = day.morning;
		if (day.afternoon !== undefined) dayDoc.afternoon = day.afternoon;
		if (day.night !== undefined) dayDoc.night = day.night;

		// Preserve any unknown fields (forward-compat)
		for (const [key, value] of Object.entries(day)) {
			if (!(key in dayDoc)) {
				dayDoc[key] = value;
			}
		}

		const dayRef = tripDoc.ref.collection("itinerary").doc(dayId);

		if (dryRun) {
			console.log(
				`    [DRY RUN] Would create itinerary day: ${dayId}`,
			);
			report.daysMoved++;
		} else {
			batch.set(dayRef, dayDoc);
			batchCount++;
			report.daysMoved++;
		}
	}

	// ── Remove the itinerary field from the trip doc ──
	if (!dryRun && report.daysMoved > 0) {
		batch.update(tripDoc.ref, {
			itinerary: FieldValue.delete(),
		});
		batchCount++;
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
		console.log(
			`  [${tripDoc.id}] Committed: ${report.daysMoved} itinerary days moved.`,
		);
	} else if (dryRun && report.daysMoved > 0) {
		console.log(
			`  [DRY RUN] [${tripDoc.id}] Would move ${report.daysMoved} itinerary days.`,
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

	console.log(`[migrate-itinerary-subcollection] Starting ${mode}...`);

	try {
		const tripsCollection = admin.firestore().collection("viagens");
		const snapshot = await tripsCollection.get();

		if (snapshot.empty) {
			console.log(
				"[migrate-itinerary-subcollection] No trip documents found.",
			);
			res.status(200).send("No trip documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-itinerary-subcollection] Found ${snapshot.size} trip documents.`,
		);

		let totalDays = 0;
		let tripsProcessed = 0;
		let tripsSkipped = 0;

		for (const tripDoc of snapshot.docs) {
			if (await isAlreadyMigrated(tripDoc)) {
				console.log(`[${tripDoc.id}] Already migrated — skipping.`);
				tripsSkipped++;
				continue;
			}

			const report = await migrateItinerary(tripDoc, dryRun);
			if (report.daysMoved > 0) {
				totalDays += report.daysMoved;
				tripsProcessed++;
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-itinerary-subcollection] ${mode} COMPLETE\n` +
			`  Trips scanned:     ${snapshot.size}\n` +
			`  Trips processed:   ${tripsProcessed}\n` +
			`  Trips skipped:     ${tripsSkipped}\n` +
			`  Itinerary days:    ${totalDays}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would move ${totalDays} itinerary days across ${tripsProcessed} trips. Remove ?dryRun=true to execute.`
				: `Migration complete. Moved ${totalDays} itinerary days across ${tripsProcessed} trips (${tripsSkipped} skipped).`,
		);
	} catch (error) {
		console.error(
			"[migrate-itinerary-subcollection] Fatal error:",
			error,
		);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
