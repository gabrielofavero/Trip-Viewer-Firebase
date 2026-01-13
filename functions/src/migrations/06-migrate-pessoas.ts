import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrate = functions.https.onRequest(async (req, res) => {
	try {
		const collection = admin.firestore().collection("viagens");
		const snapshot = await collection.get();
		const batch = admin.firestore().batch();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const quantidadePessoas = data.quantidadePessoas || 0;
			delete data.quantidadePessoas;
			const pessoas = [];
			for (let i = 0; i < quantidadePessoas; i++) {
				pessoas.push({
					nome: "",
				});
			}
			data.pessoas = pessoas;
			batch.set(collection.doc(doc.id), data);
		});

		await batch.commit();
		res.status(200).send("Data migration completed successfully.");
	} catch (error) {
		console.error("Error migrating data:", error);
		res.status(500).send("Error migrating data.");
	}
});
