import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrate = functions.https.onRequest(async (req, res) => {
	try {
		const db = admin.firestore();
		const usersRef = db.collection("usuarios");
		const usersSnapshot = await usersRef.get();

		let batch = db.batch();
		let batchCount = 0;
		const MAX_BATCH = 400;

		for (const userDoc of usersSnapshot.docs) {
			const userData = userDoc.data() || {};

			const tripIds: string[] = userData.viagens || [];
			const destinationIds: string[] = userData.destinos || [];
			const listingIds: string[] = userData.listagens || [];

			const [tripData, destinationData, listingData] = await Promise.all([
				getTripMinimalData(tripIds),
				getDestinationMinimalData(destinationIds),
				getListingMinimalData(listingIds),
			]);

			const updatePayload = {
				viagens: tripData,
				destinos: destinationData,
				listagens: listingData,
			};

			batch.update(userDoc.ref, updatePayload);
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
	} catch (error) {
		console.error("Migration error:", error);
		res.status(500).send("Migration failed.");
	}
});

async function getTripMinimalData(ids: string[]) {
	if (!ids?.length) return {};

	const db = admin.firestore();
	const result: Record<string, any> = {};

	await Promise.all(
		ids.map(async (id) => {
			const doc = await db.collection("viagens").doc(id).get();
			if (!doc.exists) return;
			const d = doc.data();
			result[id] = {
				titulo: d?.titulo,
				inicio: d?.inicio,
				fim: d?.fim,
				imagem: d?.imagem,
				cores: d?.cores,
				versao: d?.versao,
				pin: d?.pin,
			};
		}),
	);

	return result;
}

async function getDestinationMinimalData(ids: string[]) {
	if (!ids?.length) return {};

	const db = admin.firestore();
	const result: Record<string, any> = {};

	await Promise.all(
		ids.map(async (id) => {
			const doc = await db.collection("destinos").doc(id).get(); // ← adjust if needed
			if (!doc.exists) return;
			const d = doc.data();
			result[id] = {
				titulo: d?.titulo,
				moeda: d?.moeda,
				versao: d?.versao,
			};
		}),
	);

	return result;
}

async function getListingMinimalData(ids: string[]) {
	if (!ids?.length) return {};

	const db = admin.firestore();
	const result: Record<string, any> = {};

	await Promise.all(
		ids.map(async (id) => {
			const doc = await db.collection("listagens").doc(id).get();
			if (!doc.exists) return;
			const d = doc.data();
			result[id] = {
				titulo: d?.titulo,
				subtitulo: d?.subtitulo,
				descricao: d?.descricao,
				imagem: d?.imagem,
				cores: d?.cores,
				versao: d?.versao,
			};
		}),
	);

	return result;
}
