import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 20: Expense new fields (link + people)
//
// Adds the multi-person expense fields to every expense entry in
// preTrip / duringTrip:
//
//   { ...existing, link: "", people: [] }
//
// - `link`   → optional URL for the expense
// - `people` → traveler IDs that split the cost (empty = not split)
//
// Handles both public documents (expenses/{tripId}) and protected
// documents (expenses/protected/{pin}/{tripId}).
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

interface ExpenseFieldsReport {
	docsScanned: number;
	entriesScanned: number;
	entriesUpdated: number;
	entriesAlreadyMigrated: number;
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

/**
 * Process one expenses document.
 *
 * Firestore does NOT support updating array elements by index via dot-path
 * (e.g. `preTrip.0.link`) — that turns the array into a map and loses the
 * original fields. So we read each array, patch the entries, and write the
 * whole array back. Returns the array-field patch (empty when no change).
 */
function buildDocPatch(
	ref: FirebaseFirestore.DocumentReference,
	data: Record<string, any>,
	report: ExpenseFieldsReport,
): Record<string, any> {
	const patch: Record<string, any> = {};

	for (const type of ['preTrip', 'duringTrip']) {
		const entries = Array.isArray(data?.[type]) ? data[type] : null;
		if (!entries) continue;

		let changed = false;
		const newEntries = entries.map((entry: Record<string, any>) => {
			if (!entry || typeof entry !== 'object') return entry;
			report.entriesScanned++;

			const hasLink = typeof entry.link === 'string';
			const hasPeople = Array.isArray(entry.people);

			if (hasLink && hasPeople) {
				report.entriesAlreadyMigrated++;
				return entry;
			}

			const copy = { ...entry };
			if (!hasLink) copy.link = '';
			if (!hasPeople) copy.people = [];
			report.entriesUpdated++;
			changed = true;
			return copy;
		});

		if (changed) patch[type] = newEntries;
	}

	return patch;
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';

	console.log(
		`[migration-20] Starting expense field backfill (link + people)${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: ExpenseFieldsReport = {
		docsScanned: 0,
		entriesScanned: 0,
		entriesUpdated: 0,
		entriesAlreadyMigrated: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const batch = new BatchManager();
		const refs: FirebaseFirestore.DocumentReference[] = [];

		// Public documents: expenses/{tripId}
		const publicSnap = await db.collection('expenses').get();
		for (const doc of publicSnap.docs) {
			if (!doc.id.startsWith('protected')) refs.push(doc.ref);
		}

		// Protected documents: expenses/protected/{pin}/{tripId}
		const pinSnap = await db.collection('expenses').doc('protected').listCollections();
		for (const pinColl of pinSnap) {
			const tripSnap = await pinColl.get();
			for (const doc of tripSnap.docs) {
				refs.push(doc.ref);
			}
		}

		console.log(`[migration-20] Found ${refs.length} expense document(s).`);

		for (const ref of refs) {
			report.docsScanned++;
			const snap = await ref.get();
			if (!snap.exists) continue;
			const data = snap.data() as Record<string, any>;
			const patch = buildDocPatch(ref, data, report);

			if (Object.keys(patch).length === 0) continue;

			const noun = Object.keys(patch).length === 1 ? 'field' : 'fields';
			if (dryRun) {
				console.log(`  ${ref.path}: would update ${Object.keys(patch).length} ${noun}.`);
				continue;
			}

			console.log(`  ${ref.path}: updating ${Object.keys(patch).length} ${noun}.`);
			batch.update(ref, patch);
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-20] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-20] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
