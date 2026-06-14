import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================================
// Migration 18: Move schedule from trip doc to subcollection
//
// After migrations 13-17, trip documents in "viagens" have:
//   schedule: [
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
//   viagens/{tripId}/schedule/{dayId}
//
// Then deletes the "schedule" field from the trip doc.
//
// Day IDs use index-based naming: "day-1", "day-2", etc.
//
// Idempotent: checks if the "schedule" field has already been
// removed from the trip doc or is empty.
// ============================================================

interface ScheduleMigrationReport {
	tripId: string;
	daysMoved: number;
}

/**
 * Check if this trip's schedule has already been migrated.
 */
async function isAlreadyMigrated(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<boolean> {
	const data = tripDoc.data();
	if (!data) return true;

	// If schedule field is missing, assume already migrated
	const schedule = data.schedule;
	if (schedule === undefined || schedule === null) {
		return true;
	}

	// If it's an empty array, treat as migrated
	if (Array.isArray(schedule) && schedule.length === 0) {
		return true;
	}

	// Check if subcollection already has documents
	const subSnap = await tripDoc.ref
		.collection("schedule")
		.limit(1)
		.get();
	if (!subSnap.empty) {
		return true;
	}

	return false;
}

/**
 * Move schedule days for a single trip into subcollection.
 */
async function migrateSchedule(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<ScheduleMigrationReport> {
	const report: ScheduleMigrationReport = {
		tripId: tripDoc.id,
		daysMoved: 0,
	};

	const data = tripDoc.data();
	if (!data) return report;

	const schedule = data.schedule;
	if (!Array.isArray(schedule) || schedule.length === 0) {
		return report;
	}

	const totalDays = schedule.length;
	console.log(
		`  [${tripDoc.id}] Found ${totalDays} schedule days to migrate.`,
	);

	// Collect existing subcollection doc IDs to avoid overwriting
	const existingSnap = dryRun
		? null
		: await tripDoc.ref.collection("schedule").get();
	const existingIds = new Set<string>();
	if (existingSnap) {
		existingSnap.forEach((doc) => existingIds.add(doc.id));
	}

	const batch = admin.firestore().batch();
	let batchCount = 0;

	for (let i = 0; i < schedule.length; i++) {
		const day = schedule[i];
		if (!day || typeof day !== "object") continue;

		// Use index-based ID: day-1, day-2, etc.
		// If that ID is already taken, append a random suffix
		let dayId = `day-${i + 1}`;
		if (existingIds.has(dayId)) {
			// Generate a unique random suffix to avoid collision
			const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
			const array = new Uint32Array(3);
			crypto.getRandomValues(array);
			let suffix = "";
			for (let j = 0; j < 3; j++) {
				suffix += chars[array[j] % chars.length];
			}
			dayId = `day-${i + 1}-${suffix}`;
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

		const dayRef = tripDoc.ref.collection("schedule").doc(dayId);

		if (dryRun) {
			console.log(
				`    [DRY RUN] Would create schedule day: ${dayId}`,
			);
			report.daysMoved++;
		} else {
			batch.set(dayRef, dayDoc);
			batchCount++;
			report.daysMoved++;
		}
	}

	// ── Remove the schedule field from the trip doc ──
	if (!dryRun && report.daysMoved > 0) {
		batch.update(tripDoc.ref, {
			schedule: FieldValue.delete(),
		});
		batchCount++;
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
		console.log(
			`  [${tripDoc.id}] Committed: ${report.daysMoved} schedule days moved.`,
		);
	} else if (dryRun && report.daysMoved > 0) {
		console.log(
			`  [DRY RUN] [${tripDoc.id}] Would move ${report.daysMoved} schedule days.`,
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

	console.log(`[migrate-schedule-subcollection] Starting ${mode}...`);

	try {
		const tripsCollection = admin.firestore().collection("viagens");
		const snapshot = await tripsCollection.get();

		if (snapshot.empty) {
			console.log(
				"[migrate-schedule-subcollection] No trip documents found.",
			);
			res.status(200).send("No trip documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-schedule-subcollection] Found ${snapshot.size} trip documents.`,
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

			const report = await migrateSchedule(tripDoc, dryRun);
			if (report.daysMoved > 0) {
				totalDays += report.daysMoved;
				tripsProcessed++;
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-schedule-subcollection] ${mode} COMPLETE\n` +
			`  Trips scanned:     ${snapshot.size}\n` +
			`  Trips processed:   ${tripsProcessed}\n` +
			`  Trips skipped:     ${tripsSkipped}\n` +
			`  Schedule days:     ${totalDays}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would move ${totalDays} schedule days across ${tripsProcessed} trips. Remove ?dryRun=true to execute.`
				: `Migration complete. Moved ${totalDays} schedule days across ${tripsProcessed} trips (${tripsSkipped} skipped).`,
		);
	} catch (error) {
		console.error(
			"[migrate-schedule-subcollection] Fatal error:",
			error,
		);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
