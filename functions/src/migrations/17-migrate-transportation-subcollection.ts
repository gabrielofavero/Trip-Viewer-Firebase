import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================================
// Migration 17: Move transportation from trip doc to subcollection
//
// After migrations 13-16, trip documents in "viagens" have:
//   transportation: {
//     viewMode: "simple" | "leg",
//     data: [{ type, company, points, dates, duration, direction, ... }, ...]
//   }
//
// This migration moves:
//   - viewMode → viagens/{tripId}/transportation/_settings
//   - Each leg in data[] → viagens/{tripId}/transportation/{legId}
//
// Then deletes the "transportation" field from the trip doc.
//
// Idempotent: checks if the "transportation" field has already
// been removed from the trip doc or is empty.
// ============================================================

interface TransportMigrationReport {
	tripId: string;
	legsMoved: number;
	settingsMoved: boolean;
}

/**
 * Generate a random alphanumeric ID, avoiding collisions with a pool.
 */
function _getRandomID(
	params: { idLength?: number; pool?: string[] } = {},
): string {
	const { idLength = 5, pool = [] } = params;
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const array = new Uint32Array(idLength);
	crypto.getRandomValues(array);

	let randomId = "";
	for (let i = 0; i < idLength; i++) {
		randomId += characters[array[i] % characters.length];
	}
	return pool.includes(randomId)
		? _getRandomID({ idLength, pool })
		: randomId;
}

/**
 * Check if this trip's transportation has already been migrated.
 */
async function isAlreadyMigrated(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<boolean> {
	const data = tripDoc.data();
	if (!data) return true;

	// If transportation field is missing, assume already migrated
	const transport = data.transportation;
	if (transport === undefined || transport === null) {
		return true;
	}

	// If it exists but has no meaningful data, also treat as migrated
	if (typeof transport === "object") {
		const hasData =
			Array.isArray(transport.data) && transport.data.length > 0;
		const hasViewMode = transport.viewMode !== undefined;
		if (!hasData && !hasViewMode) {
			return true;
		}
	}

	// Check if subcollection already has documents
	const subSnap = await tripDoc.ref
		.collection("transportation")
		.limit(1)
		.get();
	if (!subSnap.empty) {
		return true;
	}

	return false;
}

/**
 * Move transportation data for a single trip into subcollection.
 */
async function migrateTransportation(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<TransportMigrationReport> {
	const report: TransportMigrationReport = {
		tripId: tripDoc.id,
		legsMoved: 0,
		settingsMoved: false,
	};

	const data = tripDoc.data();
	if (!data) return report;

	const transport = data.transportation;
	if (!transport || typeof transport !== "object") {
		return report;
	}

	console.log(
		`  [${tripDoc.id}] Processing transportation data...`,
	);

	// Collect existing subcollection doc IDs for collision avoidance
	const existingSnap = dryRun
		? null
		: await tripDoc.ref.collection("transportation").get();
	const existingIds: string[] = [];
	if (existingSnap) {
		existingSnap.forEach((doc) => existingIds.push(doc.id));
	}

	const batch = admin.firestore().batch();
	let batchCount = 0;

	// ── Write viewMode as _settings document ──
	const viewMode = transport.viewMode;
	if (viewMode !== undefined && viewMode !== null) {
		const settingsRef = tripDoc.ref
			.collection("transportation")
			.doc("_settings");

		if (dryRun) {
			console.log(
				`    [DRY RUN] Would create _settings with viewMode: ${viewMode}`,
			);
			report.settingsMoved = true;
		} else {
			batch.set(settingsRef, { viewMode });
			batchCount++;
			report.settingsMoved = true;
		}
	}

	// ── Move each transport leg ──
	const legs = transport.data;
	if (Array.isArray(legs) && legs.length > 0) {
		console.log(
			`  [${tripDoc.id}] Found ${legs.length} transport legs to migrate.`,
		);

		for (const leg of legs) {
			if (!leg || typeof leg !== "object") continue;

			// Generate a unique ID
			const legId = _getRandomID({ pool: existingIds });
			existingIds.push(legId);

			// Build clean leg document with only known fields
			const legDoc: Record<string, any> = {};
			if (leg.type !== undefined) legDoc.type = leg.type;
			if (leg.company !== undefined) legDoc.company = leg.company;
			if (leg.points !== undefined) legDoc.points = leg.points;
			if (leg.dates !== undefined) legDoc.dates = leg.dates;
			if (leg.duration !== undefined) legDoc.duration = leg.duration;
			if (leg.direction !== undefined) legDoc.direction = leg.direction;
			if (leg.reservation !== undefined) legDoc.reservation = leg.reservation;
			if (leg.link !== undefined) legDoc.link = leg.link;
			if (leg.person !== undefined) legDoc.person = leg.person;

			const legRef = tripDoc.ref
				.collection("transportation")
				.doc(legId);

			if (dryRun) {
				console.log(
					`    [DRY RUN] Would create transport leg: ${legId} (${leg.type})`,
				);
				report.legsMoved++;
			} else {
				batch.set(legRef, legDoc);
				batchCount++;
				report.legsMoved++;
			}
		}
	}

	// ── Remove the transportation field from the trip doc ──
	if (
		!dryRun &&
		(report.legsMoved > 0 || report.settingsMoved)
	) {
		batch.update(tripDoc.ref, {
			transportation: FieldValue.delete(),
		});
		batchCount++;
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
		console.log(
			`  [${tripDoc.id}] Committed: ${report.legsMoved} legs` +
				(report.settingsMoved ? " + settings" : "") +
				` moved.`,
		);
	} else if (dryRun) {
		const moved =
			(report.legsMoved > 0 || report.settingsMoved)
				? `${report.legsMoved} legs` +
					(report.settingsMoved ? " + settings" : "")
				: "nothing";
		console.log(
			`  [DRY RUN] [${tripDoc.id}] Would move: ${moved}`,
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

	console.log(
		`[migrate-transportation-subcollection] Starting ${mode}...`,
	);

	try {
		const tripsCollection = admin.firestore().collection("viagens");
		const snapshot = await tripsCollection.get();

		if (snapshot.empty) {
			console.log(
				"[migrate-transportation-subcollection] No trip documents found.",
			);
			res.status(200).send("No trip documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-transportation-subcollection] Found ${snapshot.size} trip documents.`,
		);

		let totalLegs = 0;
		let totalSettings = 0;
		let tripsProcessed = 0;
		let tripsSkipped = 0;

		for (const tripDoc of snapshot.docs) {
			if (await isAlreadyMigrated(tripDoc)) {
				console.log(`[${tripDoc.id}] Already migrated — skipping.`);
				tripsSkipped++;
				continue;
			}

			const report = await migrateTransportation(tripDoc, dryRun);
			if (report.legsMoved > 0 || report.settingsMoved) {
				totalLegs += report.legsMoved;
				if (report.settingsMoved) totalSettings++;
				tripsProcessed++;
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-transportation-subcollection] ${mode} COMPLETE\n` +
			`  Trips scanned:     ${snapshot.size}\n` +
			`  Trips processed:   ${tripsProcessed}\n` +
			`  Trips skipped:     ${tripsSkipped}\n` +
			`  Legs moved:        ${totalLegs}\n` +
			`  Settings moved:    ${totalSettings}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would move ${totalLegs} legs and ${totalSettings} settings across ${tripsProcessed} trips. Remove ?dryRun=true to execute.`
				: `Migration complete. Moved ${totalLegs} legs and ${totalSettings} settings across ${tripsProcessed} trips (${tripsSkipped} skipped).`,
		);
	} catch (error) {
		console.error(
			"[migrate-transportation-subcollection] Fatal error:",
			error,
		);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
