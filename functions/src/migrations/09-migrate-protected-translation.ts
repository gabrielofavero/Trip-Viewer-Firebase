import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const migrate = functions.https.onRequest(async (req, res) => {
	try {
		const jobs: FirebaseFirestore.WriteBatch[] = [];

		jobs.push(...(await prepareMigration("viagens", "protected", "protegido")));
		jobs.push(...(await prepareMigration("gastos", "protected", "protegido")));

		for (const batch of jobs) {
			await batch.commit();
		}

		res.status(200).send(`Migration completed. Total batches: ${jobs.length}`);
	} catch (error) {
		console.error("Migration failed:", error);
		res.status(500).send("Failed during migration.");
	}
});

async function prepareMigration(rootName: string, from: string, to: string) {
	const db = admin.firestore();
	const writes: FirebaseFirestore.WriteBatch[] = [];
	let batch = db.batch();
	let opCount = 0;

	const sourceRoot = db.collection(rootName).doc(from);
	const userCollections = await sourceRoot.listCollections();

	for (const userCol of userCollections) {
		const userId = userCol.id;
		const docs = await userCol.get();

		for (const doc of docs.docs) {
			const newRef = db
				.collection(rootName)
				.doc(to)
				.collection(userId)
				.doc(doc.id);

			batch.set(newRef, doc.data());
			batch.delete(doc.ref);

			opCount += 2;

			if (opCount >= 400) {
				writes.push(batch);
				batch = db.batch();
				opCount = 0;
			}
		}
	}
	if (opCount > 0) writes.push(batch);

	return writes;
}
