import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 23: Backfill travelers into trip summaries
//
// The index trip cards render the travelers' photo circles from
//   users/{owner}/tripSummaries/{tripId}.travelers
// so the home page does not need to read every trips/{id} document.
// Summaries written before Nov 2026 don't carry that field, so this
// copies `travelers` from each trip document into its owner summary
// (and recreates the full summary when it is missing — a missing
// summary is treated as a bug).
//
// Idempotent — summaries whose `travelers` already match the trip are
// left untouched. Supports ?dryRun=true.
// ============================================================

interface TripSummaryTravelersReport {
	tripsScanned: number;
	summariesUpdated: number;
	summariesRecreated: number;
	alreadyPresent: number;
	tripsWithoutOwner: number;
	tripsWithoutTravelers: number;
	errors: string[];
}

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

	private rotateIfNeeded() {
		if (this.count < 500) return;
		this.current = admin.firestore().batch();
		this.batches.push(this.current);
		this.count = 0;
	}

	set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
		this.current.set(ref, data);
		this.count++;
		this.rotateIfNeeded();
	}

	update(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
	) {
		this.current.update(ref, data);
		this.count++;
		this.rotateIfNeeded();
	}

	async commitAll() {
		console.log(`  Committing ${this.batches.length} batch(es)...`);
		for (const batch of this.batches) {
			await batch.commit();
		}
	}
}

// ============================================================
// HELPERS
// ============================================================

/** Everything the app writes into users/{uid}/tripSummaries/{id}. */
function buildTripSummary(trip: Record<string, any>): Record<string, any> {
	return {
		title: trip.title || '',
		start: trip.start || {},
		end: trip.end || {},
		image:
			trip.image && typeof trip.image === 'object'
				? trip.image
				: { active: false, background: '', light: '', dark: '' },
		colors: trip.colors || { light: '', dark: '', active: false },
		version: trip.version || { lastUpdated: '' },
		pin: trip.pin || 'no-pin',
		modules: trip.modules || {},
		travelers: Array.isArray(trip.travelers) ? trip.travelers : [],
	};
}

/** Same traveler list? Used to keep the migration idempotent. */
function sameTravelers(a: unknown, b: unknown): boolean {
	return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	console.log(
		`[migration-23] Starting trip summary travelers backfill${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: TripSummaryTravelersReport = {
		tripsScanned: 0,
		summariesUpdated: 0,
		summariesRecreated: 0,
		alreadyPresent: 0,
		tripsWithoutOwner: 0,
		tripsWithoutTravelers: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const tripsSnap = await db.collection('trips').get();
		console.log(`[migration-23] Found ${tripsSnap.size} trip document(s).`);

		const batch = new BatchManager();

		for (const tripDoc of tripsSnap.docs) {
			report.tripsScanned++;
			const trip = tripDoc.data() || {};

			const travelers = Array.isArray(trip.travelers) ? trip.travelers : null;
			if (!travelers) {
				report.tripsWithoutTravelers++;
				continue;
			}

			const owner = trip.sharing?.owner;
			if (!owner) {
				report.tripsWithoutOwner++;
				report.errors.push(`trips/${tripDoc.id}: missing sharing.owner`);
				console.warn(`  trips/${tripDoc.id}: missing sharing.owner — skipped.`);
				continue;
			}

			const summaryRef = db.doc(`users/${owner}/tripSummaries/${tripDoc.id}`);
			const summarySnap = await summaryRef.get();

			if (!summarySnap.exists) {
				// Missing summary = bug: recreate the whole document.
				report.summariesRecreated++;
				if (dryRun) {
					console.log(`  [DRY RUN] users/${owner}/tripSummaries/${tripDoc.id}: would recreate.`);
					continue;
				}
				console.log(`  users/${owner}/tripSummaries/${tripDoc.id}: recreating summary.`);
				batch.set(summaryRef, buildTripSummary(trip));
				continue;
			}

			const summary = summarySnap.data() || {};
			if (sameTravelers(summary.travelers, travelers)) {
				report.alreadyPresent++;
				continue;
			}

			report.summariesUpdated++;
			if (dryRun) {
				console.log(
					`  [DRY RUN] users/${owner}/tripSummaries/${tripDoc.id}: would add ${travelers.length} traveler(s).`,
				);
				continue;
			}
			console.log(
				`  users/${owner}/tripSummaries/${tripDoc.id}: adding ${travelers.length} traveler(s).`,
			);
			batch.update(summaryRef, {
				travelers,
				version: trip.version || summary.version || { lastUpdated: '' },
			});
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-23] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-23] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
