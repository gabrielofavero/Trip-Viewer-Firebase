import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrateTransporteVisualizacao = functions.https.onRequest(
	async (req, res) => {
		try {
			const viagensCollection = admin.firestore().collection("viagens");
			const snapshot = await viagensCollection.get();
			const batch = admin.firestore().batch();

			snapshot.forEach((doc) => {
				const data = doc.data();
				const transportes = data.transportes;

				const visualizacaoSimplificada =
					transportes.visualizacaoSimplificada !== undefined
						? transportes.visualizacaoSimplificada
						: true;

				delete transportes.visualizacaoSimplificada;
				transportes.visualizacao = visualizacaoSimplificada
					? "simple-view"
					: "leg-view";

				batch.set(viagensCollection.doc(doc.id), data);
			});

			await batch.commit();
			res.status(200).send("Data migration completed successfully.");
		} catch (error) {
			console.error("Error migrating data:", error);
			res.status(500).send("Error migrating data.");
		}
	},
);
