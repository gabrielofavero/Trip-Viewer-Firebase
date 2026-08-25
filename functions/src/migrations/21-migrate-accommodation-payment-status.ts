import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 21: Accommodation payment status (F065)
//
// Adds the `paymentStatus` field to every accommodation
// sub-document (trips/{tripId}/accommodations/{accId}):
//
//   { ...existing, paymentStatus: "" }
//
// - ''          → don't show any payment info (default)
// - 'prepaid'   → accommodation was paid in advance
// - 'partial_prepaid' → part was paid in advance, rest at the destination
// - 'pay_on_site' → accommodation is paid at the destination
//
// The field is optional — the app treats a missing field as
// "don't show" (back-compat), so this backfill only normalizes
// the data. Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

interface AccommodationPaymentReport {
	tripsScanned: number;
	accommodationsScanned: number;
	accommodationsUpdated: number;
	accommodationsAlreadyMigrated: number;
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
		this.rotate();
	}

	private rotate() {
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
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';

	console.log(
		`[migration-21] Starting accommodation paymentStatus backfill${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: AccommodationPaymentReport = {
		tripsScanned: 0,
		accommodationsScanned: 0,
		accommodationsUpdated: 0,
		accommodationsAlreadyMigrated: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const batch = new BatchManager();

		const tripsSnap = await db.collection('trips').get();
		console.log(`[migration-21] Found ${tripsSnap.size} trip document(s).`);

		for (const tripDoc of tripsSnap.docs) {
			report.tripsScanned++;
			const accSnap = await tripDoc.ref.collection('accommodations').get();

			for (const accDoc of accSnap.docs) {
				report.accommodationsScanned++;
				const data = accDoc.data() as Record<string, any>;

				if (typeof data.paymentStatus === 'string') {
					report.accommodationsAlreadyMigrated++;
					continue;
				}

				report.accommodationsUpdated++;
				if (dryRun) {
					console.log(`  ${accDoc.ref.path}: would add paymentStatus: "".`);
					continue;
				}

				console.log(`  ${accDoc.ref.path}: adding paymentStatus: "".`);
				batch.update(accDoc.ref, { paymentStatus: '' });
			}
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-21] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-21] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
