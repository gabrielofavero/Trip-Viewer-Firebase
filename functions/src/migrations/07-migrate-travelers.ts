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

			const pessoas = (data.pessoas || []).map((p: { id: any }) => ({
				...p,
				id: p.id || _getRandomID(),
			}));

			const programacoes = (data.programacoes || []).map(
				(programacao: {
					[x: string]: {
						pessoas?: { id?: any; nome?: string | undefined }[] | undefined;
					}[];
				}) => ({
					...programacao,
					madrugada: _getUpdatedProgramacao("madrugada", programacao, pessoas),
					manha: _getUpdatedProgramacao("manha", programacao, pessoas),
					tarde: _getUpdatedProgramacao("tarde", programacao, pessoas),
					noite: _getUpdatedProgramacao("noite", programacao, pessoas),
				}),
			);

			batch.set(collection.doc(doc.id), {
				...data,
				pessoas,
				programacoes,
			});
		});

		await batch.commit();
		res.status(200).send("Data migration completed successfully.");
	} catch (error) {
		console.error("Error migrating data:", error);
		res.status(500).send("Error migrating data.");
	}
});

function _getRandomID(idLength = 5) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let randomId = "";

	for (let i = 0; i < idLength; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		randomId += characters[randomIndex];
	}

	return randomId;
}

function _getUpdatedProgramacao(
	turno: string,
	programacao: { [x: string]: { pessoas?: { id?: any; nome?: string }[] }[] },
	pessoas: { id: any; nome: string }[],
) {
	const data = programacao[turno] || [];

	return data.map((innerProgramacao) => ({
		...innerProgramacao,
		pessoas: (innerProgramacao.pessoas || []).map((p) => {
			const id = pessoas.find((pe) => pe.nome === p.nome)?.id;

			return {
				id,
			};
		}),
	}));
}
