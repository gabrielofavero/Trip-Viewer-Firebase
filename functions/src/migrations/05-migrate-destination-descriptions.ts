import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const migrateDestinationDescriptions = functions.https.onRequest(async (req, res) => {
    const types = ['lanches', 'lojas', 'restaurantes', 'saidas', 'turismo']
    try {
        const collection = admin.firestore().collection('destinos');
        const snapshot = await collection.get();
        const batch = admin.firestore().batch();

        snapshot.forEach((doc) => {
            const data = doc.data();
            for (let i = 0; i < types.length; i++) {
                const type = types[i];
                const innerData = data[type] || [];
                for (const item of innerData) {
                    const descricao = item.descricao || '';
                    const result = {
                        pt: descricao,
                    }
                    item.descricao = result;
                }
            }
            batch.set(collection.doc(doc.id), data);
        });

        await batch.commit();
        res.status(200).send('Data migration completed successfully.');
    } catch (error) {
        console.error('Error migrating data:', error);
        res.status(500).send('Error migrating data.');
    }
});