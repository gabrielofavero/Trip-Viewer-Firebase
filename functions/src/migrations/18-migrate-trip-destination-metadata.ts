import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 18: Trip destination metadata backfill
//
// Backfills every trips/{id}.destinationRefs[i] entry with a
// denormalized copy of the destination's lightweight metadata so
// view.html can render the destinations section WITHOUT fetching
// each destinations/{id} document on load.
//
// Enriched ref shape:
//   {
//     id: string,
//     title: string,                      // destination title
//     image: { background, active },      // destination hero image
//     categories: { restaurants, snacks, nightlife, tourism, shopping },
//                                          // "has entries" booleans
//     version: { lastUpdated }            // destination version
//   }
//
// The `categories` booleans drive which destination category boxes
// appear on view.html (see trip-detail/categories/destination.ts).
//
// Idempotent — safe to re-run (skips refs that already carry a
// `categories` object). Supports ?dryRun=true.
// ============================================================

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

interface DestinationMetadataReport {
	tripsScanned: number;
	tripsUpdated: number;
	refsScanned: number;
	refsMigrated: number;
	refsAlreadyPresent: number;
	destinationsMissing: number;
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

	update(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
	) {
		this.current.update(ref, data);
		this.count++;
		if (this.count >= 500) {
			this.current = admin.firestore().batch();
			this.batches.push(this.current);
			this.count = 0;
		}
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

/** Whether a destination category map contains at least one entry. */
function categoryHasEntries(entries: unknown): boolean {
	return (
		!!entries &&
		typeof entries === 'object' &&
		Object.keys(entries as Record<string, unknown>).length > 0
	);
}

/**
 * Build the denormalized metadata for a destination document.
 * Mirrors buildDestinationMetadata in public/assets/ts/data/services/destination.service.ts.
 */
function buildDestinationMetadata(dest: Record<string, any>) {
	const categories: Record<string, boolean> = {};
	for (const category of DESTINATION_CATEGORIES) {
		categories[category] = categoryHasEntries(dest?.[category]);
	}

	return {
		title: dest?.title || '',
		image:
			dest?.image && typeof dest.image === 'object'
				? dest.image
				: { active: false, background: '' },
		categories,
		version:
			dest?.version && typeof dest.version === 'object'
				? dest.version
				: { lastUpdated: '' },
	};
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	console.log(
		`[migration-18] Starting trip destination metadata backfill${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: DestinationMetadataReport = {
		tripsScanned: 0,
		tripsUpdated: 0,
		refsScanned: 0,
		refsMigrated: 0,
		refsAlreadyPresent: 0,
		destinationsMissing: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const tripsSnap = await db.collection('trips').get();
		console.log(`[migration-18] Found ${tripsSnap.size} trip document(s).`);

		// Cache destination docs by id to avoid re-reading shared destinations.
		const destCache = new Map<string, Record<string, any> | null>();
		const batch = new BatchManager();

		for (const tripDoc of tripsSnap.docs) {
			report.tripsScanned++;
			const data = tripDoc.data() || {};

			const refs = Array.isArray(data.destinationRefs)
				? data.destinationRefs
				: Array.isArray(data.destinations)
					? data.destinations
					: null;
			if (!refs || refs.length === 0) continue;

			// Write back to the canonical key; legacy trips that only carried a
			// `destinations` refs array get normalized to `destinationRefs`.
			const key = Array.isArray(data.destinationRefs)
				? 'destinationRefs'
				: 'destinations';

			const enriched = [];
			let changed = false;

			for (const ref of refs) {
				if (!ref || typeof ref !== 'object') {
					enriched.push(ref);
					continue;
				}

				const id = ref.id || ref.destinationId;
				report.refsScanned++;

				// Idempotency check — refs already carrying metadata are kept as-is.
				if (ref.categories && typeof ref.categories === 'object') {
					report.refsAlreadyPresent++;
					enriched.push(ref);
					continue;
				}

				if (!destCache.has(id)) {
					const destSnap = await db.collection('destinations').doc(id).get();
					destCache.set(id, destSnap.exists ? (destSnap.data() as Record<string, any>) : null);
				}
				const dest = destCache.get(id);

				if (!dest) {
					report.destinationsMissing++;
					console.warn(
						`  trips/${tripDoc.id} → destinations/${id}: not found, leaving ref unchanged.`,
					);
					enriched.push(ref);
					continue;
				}

				report.refsMigrated++;
				changed = true;
				enriched.push({
					id,
					...buildDestinationMetadata(dest),
				});
			}

			if (!changed) continue;

			report.tripsUpdated++;
			if (dryRun) {
				console.log(
					`  [DRY RUN] trips/${tripDoc.id}: would enrich ${key} (${report.refsMigrated} ref(s)).`,
				);
				continue;
			}

			console.log(`  trips/${tripDoc.id}: enriching ${key} with destination metadata.`);
			batch.update(tripDoc.ref, { [key]: enriched });
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-18] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-18] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
