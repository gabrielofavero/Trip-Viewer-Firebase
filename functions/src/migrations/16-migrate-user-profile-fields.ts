import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// MIGRATION 16: User Profile Fields (name, email, photoURL)
//
// Backfills every users/{uid} document with the profile fields
// `name`, `email` and `photoURL`, sourced from the matching
// Firebase Auth user record (displayName, email, photoURL).
//
// The app reads these fields from Firestore first and only falls
// back to Auth when they are missing (see
// public/assets/ts/pages/home/support/data.ts), so this migration
// guarantees existing user documents carry the full profile.
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

const PROFILE_FIELDS = ['name', 'email', 'photoURL'] as const;

interface ProfileReport {
	usersScanned: number;
	usersUpdated: number;
	alreadyComplete: number;
	authLookupFailures: number;
	fieldsFilled: number;
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

/** A field is considered missing when absent, null or empty string. */
function isMissing(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	console.log(
		`[migration-16] Starting user profile fields backfill${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: ProfileReport = {
		usersScanned: 0,
		usersUpdated: 0,
		alreadyComplete: 0,
		authLookupFailures: 0,
		fieldsFilled: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const usersSnap = await db.collection('users').get();
		console.log(`[migration-16] Found ${usersSnap.size} user document(s).`);

		const batch = new BatchManager();

		for (const userDoc of usersSnap.docs) {
			report.usersScanned++;
			const uid = userDoc.id;
			const data = userDoc.data() || {};

			// Idempotency check — skip users that already have all fields
			const missing = PROFILE_FIELDS.filter((field) => isMissing(data[field]));
			if (missing.length === 0) {
				report.alreadyComplete++;
				continue;
			}

			// Fetch the Auth record to source displayName / email / photoURL
			let displayName = '';
			let email = '';
			let photoURL = '';
			try {
				const userRecord = await admin.auth().getUser(uid);
				displayName = userRecord.displayName || '';
				email = userRecord.email || '';
				photoURL = userRecord.photoURL || '';
			} catch (err) {
				report.authLookupFailures++;
				console.warn(
					`[migration-16] Could not fetch auth user "${uid}": ${(err as Error).message}. ` +
						'Filling with empty strings.',
				);
			}

			const patch: Record<string, string> = {};
			for (const field of missing) {
				patch[field] =
					field === 'name' ? displayName : field === 'email' ? email : photoURL;
			}

			report.fieldsFilled += missing.length;
			report.usersUpdated++;

			if (dryRun) {
				console.log(`  [DRY RUN] User ${uid}: would fill [${missing.join(', ')}]`);
				continue;
			}

			console.log(`  User ${uid}: filling [${missing.join(', ')}]`);
			batch.update(userDoc.ref, patch);
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-16] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-16] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
