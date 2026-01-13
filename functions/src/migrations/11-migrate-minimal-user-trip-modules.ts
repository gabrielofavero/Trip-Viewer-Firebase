import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const MAX_BATCH = 400;
const READ_CHUNK = 20; // limit concurrent reads to avoid throttling

export const migrate = functions.https.onRequest(async (req, res) => {
	try {
		const usersSnapshot = await db.collection("usuarios").get();

		let batch = db.batch();
		let batchCount = 0;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data() ?? {};
			const trips = (userData.viagens ?? {}) as Record<string, any>;

			const migratedTrips = await buildTripMinimalData(trips);

			batch.update(userDoc.ref, { viagens: migratedTrips });
			batchCount++;

			if (batchCount >= MAX_BATCH) {
				await batch.commit();
				batch = db.batch();
				batchCount = 0;
			}
		}

		if (batchCount > 0) {
			await batch.commit();
		}

		res.status(200).send("Migration completed successfully.");
	} catch (err) {
		console.error("Migration error:", err);
		res.status(500).send("Migration failed.");
	}
});

async function buildTripMinimalData(
	trips: Record<string, any>,
): Promise<Record<string, any>> {
	const result: Record<string, any> = {};
	const ids = Object.keys(trips);

	const idsNeedingFetch: string[] = [];

	for (const id of ids) {
		const baseData = trips[id] ?? {};

		if (baseData.modulos) {
			// No fetch needed — reuse existing data
			result[id] = { ...baseData };
		} else {
			// Only fetch these
			idsNeedingFetch.push(id);
		}
	}

	// Fetch missing ones in chunks
	for (let i = 0; i < idsNeedingFetch.length; i += READ_CHUNK) {
		const chunk = idsNeedingFetch.slice(i, i + READ_CHUNK);

		const refs = chunk.map((id) => db.collection("viagens").doc(id));
		const snapshots = await db.getAll(...refs);

		snapshots.forEach((snap, idx) => {
			const id = chunk[idx];
			const baseData = trips[id] ?? {};
			const fullData = snap.data() ?? {};

			result[id] = {
				...baseData,
				modulos: fullData.modulos ?? {},
			};
		});
	}

	return result;
}
