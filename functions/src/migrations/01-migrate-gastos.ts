import * as functions from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

export const migrateGastos = functions.https.onRequest(async (req, res) => {
	try {
		const gastosCollection = getFirestore().collection('gastos');
		const snapshot = await gastosCollection.get();
		const batch = getFirestore().batch();

		snapshot.forEach((doc) => {
			const data = doc.data();
			const docId = doc.id;
			if (docId === 'protected') return;
			const pin = data.pin;

			if (pin) {
				delete data.pin;
				batch.set(gastosCollection.doc('protected').collection(pin).doc(docId), data);
				batch.delete(gastosCollection.doc(docId));
			}
		});

		await batch.commit();
		res.status(200).send('Data migration completed successfully.');
	} catch (error) {
		console.error('Error migrating data:', error);
		res.status(500).send('Error migrating data.');
	}
});
