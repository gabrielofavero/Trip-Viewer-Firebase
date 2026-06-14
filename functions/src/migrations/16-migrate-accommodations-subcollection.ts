import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================================
// Migration 16: Move accommodations from trip doc to subcollection
//
// After migrations 13-15, trip documents in "viagens" have:
//   accommodations: [{ name, description, address, dates, ... }, ...]
//
// This migration moves each accommodation to:
//   viagens/{tripId}/accommodations/{accId}
//
// Idempotent: checks if subcollection already exists and
// if the "accommodations" field has been removed from trip.
// ============================================================

interface AccMigrationReport {
	tripId: string;
	accommodationsMoved: number;
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
 * Check if this trip's accommodations have already been migrated.
 * Returns true if the "accommodations" array no longer exists on the trip doc.
 */
async function isAlreadyMigrated(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<boolean> {
	const data = tripDoc.data();
	if (!data) return true;

	// If accommodations field is missing, assume already migrated
	if (data.accommodations === undefined || data.accommodations === null) {
		return true;
	}

	// If accommodations is an empty array, consider it migrated
	if (Array.isArray(data.accommodations) && data.accommodations.length === 0) {
		return true;
	}

	return false;
}

/**
 * Move accommodations for a single trip into subcollection.
 */
async function migrateAccommodations(
	tripDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<AccMigrationReport> {
	const report: AccMigrationReport = {
		tripId: tripDoc.id,
		accommodationsMoved: 0,
	};

	const data = tripDoc.data();
	if (!data) return report;

	const accommodations = data.accommodations;
	if (!Array.isArray(accommodations) || accommodations.length === 0) {
		return report;
	}

	console.log(
		`  [${tripDoc.id}] Found ${accommodations.length} accommodations to migrate.`,
	);

	// Collect existing subcollection doc IDs for collision avoidance
	const existingSnap = dryRun
		? null
		: await tripDoc.ref.collection("accommodations").get();
	const existingIds: string[] = [];
	if (existingSnap) {
		existingSnap.forEach((doc) => existingIds.push(doc.id));
	}

	const batch = admin.firestore().batch();
	let batchCount = 0;

	for (const acc of accommodations) {
		if (!acc || typeof acc !== "object") continue;

		// Generate a unique ID
		const accId = _getRandomID({ pool: existingIds });
		existingIds.push(accId);

		// Clean the accommodation data — remove any Portuguese field leftovers
		const accDoc: Record<string, any> = {};

		if (acc.name !== undefined) accDoc.name = acc.name;
		if (acc.description !== undefined) accDoc.description = acc.description;
		if (acc.address !== undefined) accDoc.address = acc.address;
		if (acc.dates !== undefined) accDoc.dates = acc.dates;
		if (acc.breakfast !== undefined) accDoc.breakfast = acc.breakfast;
		if (acc.images !== undefined) accDoc.images = acc.images;
		if (acc.reservation !== undefined) accDoc.reservation = acc.reservation;
		if (acc.link !== undefined) accDoc.link = acc.link;

		const accRef = tripDoc.ref
			.collection("accommodations")
			.doc(accId);

		if (dryRun) {
			console.log(`    [DRY RUN] Would create accommodation: ${accId}`);
			report.accommodationsMoved++;
		} else {
			batch.set(accRef, accDoc);
			batchCount++;
			report.accommodationsMoved++;
		}
	}

	// Remove the accommodations field from the trip document
	if (!dryRun && report.accommodationsMoved > 0) {
		batch.update(tripDoc.ref, {
			accommodations: FieldValue.delete(),
		});
		batchCount++;
	}

	if (!dryRun && batchCount > 0) {
		await batch.commit();
		console.log(
			`  [${tripDoc.id}] Committed: ${report.accommodationsMoved} accommodations moved.`,
		);
	} else if (dryRun && report.accommodationsMoved > 0) {
		console.log(
			`  [DRY RUN] [${tripDoc.id}] Would move ${report.accommodationsMoved} accommodations.`,
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

	console.log(`[migrate-accommodations-subcollection] Starting ${mode}...`);

	try {
		const tripsCollection = admin.firestore().collection("viagens");
		const snapshot = await tripsCollection.get();

		if (snapshot.empty) {
			console.log(
				"[migrate-accommodations-subcollection] No trip documents found.",
			);
			res.status(200).send("No trip documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-accommodations-subcollection] Found ${snapshot.size} trip documents.`,
		);

		let totalMoved = 0;
		let tripsProcessed = 0;
		let tripsSkipped = 0;

		for (const tripDoc of snapshot.docs) {
			if (await isAlreadyMigrated(tripDoc)) {
				console.log(`[${tripDoc.id}] Already migrated — skipping.`);
				tripsSkipped++;
				continue;
			}

			const report = await migrateAccommodations(tripDoc, dryRun);
			if (report.accommodationsMoved > 0) {
				totalMoved += report.accommodationsMoved;
				tripsProcessed++;
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-accommodations-subcollection] ${mode} COMPLETE\n` +
			`  Trips scanned:           ${snapshot.size}\n` +
			`  Trips processed:         ${tripsProcessed}\n` +
			`  Trips skipped:           ${tripsSkipped}\n` +
			`  Accommodations moved:    ${totalMoved}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would move ${totalMoved} accommodations across ${tripsProcessed} trips. Remove ?dryRun=true to execute.`
				: `Migration complete. Moved ${totalMoved} accommodations across ${tripsProcessed} trips (${tripsSkipped} skipped).`,
		);
	} catch (error) {
		console.error(
			"[migrate-accommodations-subcollection] Fatal error:",
			error,
		);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
