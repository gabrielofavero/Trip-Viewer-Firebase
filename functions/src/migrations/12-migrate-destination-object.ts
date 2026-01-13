import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrate = functions.https.onRequest(async (req, res) => {
	try {
		const collection = admin.firestore().collection("destinos");
		const snapshot = await collection.get();
		const batch = admin.firestore().batch();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const newData: Record<string, any> = {};

			for (const key of [
				"restaurantes",
				"lanches",
				"saidas",
				"turismo",
				"lojas",
			]) {
				const category = data[key];

				if (!Array.isArray(category)) continue;

				const pool = category.map((item: any) => item?.id).filter(Boolean);

				const newObject: Record<string, any> = {};
				const baseTime = Date.now();

				for (const [index, item] of category.entries()) {
					const id = item.id || _getRandomID({ pool });

					if (!pool.includes(id)) pool.push(id);

					const { id: _discard, ...rest } = item;

					const criadoEm = new Date(baseTime + index * 1000).toISOString();

					newObject[id] = {
						...rest,
						criadoEm,
					};
				}

				newData[key] = newObject;
			}

			if (Object.keys(newData).length > 0) {
				batch.update(doc.ref, newData);
			}
		});

		await batch.commit();
		res.status(200).send("Data migration completed successfully.");
	} catch (error) {
		console.error("Error migrating data:", error);
		res.status(500).send("Error migrating data.");
	}
});

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

	return pool.includes(randomId) ? _getRandomID({ idLength, pool }) : randomId;
}
