import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ============================================================
// Migration 14: Split user document summaries into subcollections
//
// After migration 13, field names are English but collection
// names are still Portuguese.  User docs have:
//   - trips:  { tripId: { title, start, end, image, colors, version, pin, modules } }
//   - destinations:  { destId: { title, currency, version } }
//   - listings:  { listingId: { title, subtitle, description, image, colors, version } }
//
// This migration moves each summary to a subcollection and
// deletes the embedded objects from the user document.
// ============================================================

interface SummaryReport {
	userId: string;
	tripSummariesCreated: number;
	destinationSummariesCreated: number;
	listingSummariesCreated: number;
}

/**
 * Check whether a user document already has summaries migrated to subcollections.
 * We consider it already migrated if the `trips` field is missing (null/undefined)
 * OR if we find at least one summary subcollection document exists and the
 * `trips` field is an array (post-migration format).
 */
async function isAlreadyMigrated(
	userDoc: FirebaseFirestore.DocumentSnapshot,
): Promise<boolean> {
	const data = userDoc.data();
	if (!data) return true;

	// If there's no "trips" field at all, it's already migrated
	const tripsField = data.trips;
	if (tripsField === undefined || tripsField === null) {
		return true;
	}

	// If trips is already an array (post-migration compact form), check subcollections
	if (Array.isArray(tripsField)) {
		const summariesSnap = await userDoc.ref
			.collection("tripSummaries")
			.limit(1)
			.get();
		return !summariesSnap.empty; // if at least one summary exists, it's migrated
	}

	// trips is still an object — needs migration
	return false;
}

/**
 * Process a single user document: extract summaries into subcollections.
 */
async function migrateUser(
	userDoc: FirebaseFirestore.DocumentSnapshot,
	dryRun: boolean,
): Promise<SummaryReport> {
	const report: SummaryReport = {
		userId: userDoc.id,
		tripSummariesCreated: 0,
		destinationSummariesCreated: 0,
		listingSummariesCreated: 0,
	};

	const data = userDoc.data();
	if (!data) return report;

	const batch = admin.firestore().batch();
	const fieldsToDelete: string[] = [];

	// ── Trip Summaries ──
	const tripsData = data.trips;
	if (tripsData && typeof tripsData === "object" && !Array.isArray(tripsData)) {
		const tripEntries = Object.entries(tripsData as Record<string, any>);
		if (tripEntries.length > 0) {
			console.log(
				`  [${userDoc.id}] Found ${tripEntries.length} trip summaries to migrate.`,
			);

			for (const [tripId, summary] of tripEntries) {
				if (!summary || typeof summary !== "object") continue;

				// Only write essential summary fields
				const summaryDoc = {
					title: summary.title ?? "",
					start: summary.start ?? null,
					end: summary.end ?? null,
					image: summary.image ?? "",
					colors: summary.colors ?? {},
					version: summary.version ?? {},
					pin: summary.pin ?? "no-pin",
					modules: summary.modules ?? {},
				};

				const destRef = userDoc.ref
					.collection("tripSummaries")
					.doc(tripId);

				if (dryRun) {
					console.log(
						`    [DRY RUN] Would create tripSummary: ${tripId}`,
					);
				} else {
					batch.set(destRef, summaryDoc);
				}
				report.tripSummariesCreated++;
			}

			fieldsToDelete.push("trips");
		}
	}

	// ── Destination Summaries ──
	const destinationsData = data.destinations;
	if (
		destinationsData &&
		typeof destinationsData === "object" &&
		!Array.isArray(destinationsData)
	) {
		const destEntries = Object.entries(
			destinationsData as Record<string, any>,
		);
		if (destEntries.length > 0) {
			console.log(
				`  [${userDoc.id}] Found ${destEntries.length} destination summaries to migrate.`,
			);

			for (const [destId, summary] of destEntries) {
				if (!summary || typeof summary !== "object") continue;

				const summaryDoc = {
					title: summary.title ?? "",
					currency: summary.currency ?? "",
					version: summary.version ?? {},
				};

				const destRef = userDoc.ref
					.collection("destinationSummaries")
					.doc(destId);

				if (dryRun) {
					console.log(
						`    [DRY RUN] Would create destinationSummary: ${destId}`,
					);
				} else {
					batch.set(destRef, summaryDoc);
				}
				report.destinationSummariesCreated++;
			}

			fieldsToDelete.push("destinations");
		}
	}

	// ── Listing Summaries ──
	const listingsData = data.listings;
	if (
		listingsData &&
		typeof listingsData === "object" &&
		!Array.isArray(listingsData)
	) {
		const listingEntries = Object.entries(
			listingsData as Record<string, any>,
		);
		if (listingEntries.length > 0) {
			console.log(
				`  [${userDoc.id}] Found ${listingEntries.length} listing summaries to migrate.`,
			);

			for (const [listingId, summary] of listingEntries) {
				if (!summary || typeof summary !== "object") continue;

				const summaryDoc = {
					title: summary.title ?? "",
					subtitle: summary.subtitle ?? "",
					description: summary.description ?? "",
					image: summary.image ?? "",
					colors: summary.colors ?? {},
					version: summary.version ?? {},
				};

				const destRef = userDoc.ref
					.collection("listingSummaries")
					.doc(listingId);

				if (dryRun) {
					console.log(
						`    [DRY RUN] Would create listingSummary: ${listingId}`,
					);
				} else {
					batch.set(destRef, summaryDoc);
				}
				report.listingSummariesCreated++;
			}

			fieldsToDelete.push("listings");
		}
	}

	// ── Remove embedded fields from user doc ──
	if (fieldsToDelete.length > 0) {
		const updateData: Record<string, any> = {};
		for (const field of fieldsToDelete) {
			updateData[field] = FieldValue.delete();
		}

		if (dryRun) {
			console.log(
				`    [DRY RUN] Would delete fields: ${fieldsToDelete.join(", ")}`,
			);
		} else {
			batch.update(userDoc.ref, updateData);
		}
	}

	if (!dryRun) {
		await batch.commit();
	}

	return report;
}

// ============================================================
// Main Migration Handler
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`[migrate-user-summaries] Starting ${mode}...`);

	try {
		const usersCollection = admin.firestore().collection("usuarios");
		const snapshot = await usersCollection.get();

		if (snapshot.empty) {
			console.log("[migrate-user-summaries] No user documents found.");
			res.status(200).send("No user documents found — nothing to migrate.");
			return;
		}

		console.log(
			`[migrate-user-summaries] Found ${snapshot.size} user documents.`,
		);

		let totalTripSummaries = 0;
		let totalDestSummaries = 0;
		let totalListingSummaries = 0;
		let usersMigrated = 0;
		let usersSkipped = 0;

		for (const userDoc of snapshot.docs) {
			const alreadyDone = await isAlreadyMigrated(userDoc);
			if (alreadyDone) {
				console.log(`[${userDoc.id}] Already migrated — skipping.`);
				usersSkipped++;
				continue;
			}

			const report = await migrateUser(userDoc, dryRun);

			if (
				report.tripSummariesCreated > 0 ||
				report.destinationSummariesCreated > 0 ||
				report.listingSummariesCreated > 0
			) {
				usersMigrated++;
				totalTripSummaries += report.tripSummariesCreated;
				totalDestSummaries += report.destinationSummariesCreated;
				totalListingSummaries += report.listingSummariesCreated;

				console.log(
					`[${userDoc.id}] Migrated: ` +
						`${report.tripSummariesCreated} trips, ` +
						`${report.destinationSummariesCreated} destinations, ` +
						`${report.listingSummariesCreated} listings.`,
				);
			}
		}

		const summary =
			`\n========================================\n` +
			`[migrate-user-summaries] ${mode} COMPLETE\n` +
			`  Users processed:       ${snapshot.size}\n` +
			`  Users migrated:        ${usersMigrated}\n` +
			`  Users skipped:         ${usersSkipped}\n` +
			`  Trip summaries:        ${totalTripSummaries}\n` +
			`  Destination summaries: ${totalDestSummaries}\n` +
			`  Listing summaries:     ${totalListingSummaries}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. Would create ${totalTripSummaries} trip summaries, ${totalDestSummaries} destination summaries, ${totalListingSummaries} listing summaries across ${usersMigrated} users. Remove ?dryRun=true to execute.`
				: `Migration complete. Created ${totalTripSummaries} trip summaries, ${totalDestSummaries} destination summaries, ${totalListingSummaries} listing summaries across ${usersMigrated} users (${usersSkipped} skipped).`,
		);
	} catch (error) {
		console.error("[migrate-user-summaries] Fatal error:", error);
		res.status(500).send(
			`Migration failed: ${(error as Error).message}`,
		);
	}
});
