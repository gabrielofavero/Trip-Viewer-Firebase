import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * init-local-db
 *
 * Initializes a fresh local Firestore emulator database with the minimum
 * structure needed for the Trip Viewer app to function.
 *
 * Usage (local emulator):
 *   POST http://localhost:5001/.../initLocalDb  { "uid": "your-auth-uid" }
 *   GET  http://localhost:5001/.../initLocalDb?uid=your-auth-uid
 */

export const initLocalDb = functions.https.onRequest(async (req, res) => {
	const uid: string = req.body?.uid || (req.query?.uid as string);

	if (!uid || typeof uid !== 'string') {
		res.status(400).send('Missing or invalid "uid" parameter. Provide the Firebase Auth UID.');
		return;
	}

	try {
		// ---------------------------------------------------------------
		// Fetch auth user for name, email & photo
		// ---------------------------------------------------------------
		let displayName = '';
		let email = '';
		let photoURL = '';
		try {
			const userRecord = await admin.auth().getUser(uid);
			displayName = userRecord.displayName || '';
			email = userRecord.email || '';
			photoURL = userRecord.photoURL || '';
		} catch (err) {
			console.warn(
				`Could not fetch auth user "${uid}": ${(err as Error).message}. ` +
					'Name, email and photo will be empty.',
			);
		}

		// ---------------------------------------------------------------
		// Build all writes in a single batch
		// ---------------------------------------------------------------
		const db = admin.firestore();
		const batch = db.batch();

		// --- admin collection ---
		// admin/admin → stores the list of admin UIDs
		batch.set(db.collection('admin').doc('admin'), {
			admins: [uid],
		});

		// admin/permissions/{type}/{uid} → existence = has permission
		batch.set(
			db.collection('admin').doc('permissions').collection('unlimitedUploadSize').doc(uid),
			{ _created: FieldValue.serverTimestamp() },
		);
		batch.set(
			db.collection('admin').doc('permissions').collection('upload').doc(uid),
			{ _created: FieldValue.serverTimestamp() },
		);
		batch.set(
			db.collection('admin').doc('permissions').collection('canUsePlacesAPI').doc(uid),
			{ _created: FieldValue.serverTimestamp() },
		);

		// --- config collection ---
		batch.set(db.collection('config').doc('system'), {
			registrationOpen: false,
		});

		// --- users collection ---
		batch.set(db.collection('users').doc(uid), {
			name: displayName,
			email,
			photoURL,
			destinations: [],
			trips: [],
			listings: [],
		});

		// --- protected parent docs (act as containers for subcollections) ---
		batch.set(db.collection('trips').doc('protected'), {});
		batch.set(db.collection('expenses').doc('protected'), {});

		// --- placeholder docs so empty collections appear in the UI ---
		batch.set(db.collection('destinations').doc('_placeholder'), { _placeholder: true });
		batch.set(db.collection('listings').doc('_placeholder'), { _placeholder: true });
		batch.set(db.collection('protected').doc('_placeholder'), { _placeholder: true });

		// Commit everything atomically
		await batch.commit();

		console.log(`Local database initialized for user ${uid} (${displayName}).`);

		res.status(200).json({
			success: true,
			message: 'Local database initialized successfully.',
			uid,
			displayName,
			photoURL,
			collections: [
				'admin (admin + permissions docs)',
				'config (system doc)',
				'destinations (empty)',
				'expenses (protected stub)',
				'listings (empty)',
				'protected (empty)',
				'trips (protected stub)',
				'users (1 doc)',
			],
		});
	} catch (error) {
		console.error('Failed to initialize local database:', error);
		res.status(500).send(`Initialization failed: ${(error as Error).message}`);
	}
});
