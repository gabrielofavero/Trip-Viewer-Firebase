import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrateHospedagemImagem = functions.https.onRequest(
	async (req, res) => {
		try {
			const viagensCollection = admin.firestore().collection("viagens");
			const snapshot = await viagensCollection.get();
			const batch = admin.firestore().batch();

			snapshot.forEach((doc) => {
				const data = doc.data();
				const hospedagens = data.hospedagens;

				let changed = false;
				for (const hospedagem of hospedagens) {
					if (!hospedagem.imagem) continue;
					const link =
						hospedagem.imagem instanceof Object
							? hospedagem.imagem.link
							: hospedagem.imagem;
					hospedagem.imagens = [
						{
							descricao: "",
							link,
						},
					];
					delete hospedagem.imagem;
					changed = true;
					data.hospedagens = hospedagens;
				}

				if (changed) {
					batch.set(viagensCollection.doc(doc.id), data);
				}
			});

			await batch.commit();
			res.status(200).send("Data migration completed successfully.");
		} catch (error) {
			console.error("Error migrating data:", error);
			res.status(500).send("Error migrating data.");
		}
	},
);
