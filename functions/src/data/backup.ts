import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {_getAuthUserUID, _getUser} from "./user/get";

// Backup de todo o Firestore
export const getBackup = functions.https.onRequest(async (request, response) => {
    const collections = ['config', 'hospedagens', 'passeios', 'programacoes', 'transportes', 'usuarios', 'viagens'];

    const promises = collections.map(async collectionName => {
        const collectionRef = admin.firestore().collection(collectionName);
        const snapshot = await collectionRef.get();
        const docs = snapshot.docs.map(doc => doc.data());
        return { collection: collectionName, docs };
    });

    try {
        const results = await Promise.all(promises);
        response.json(results);
    } catch (error) {
        console.error('Erro ao fazer backup:', error);
        response.status(500).send('Erro ao fazer backup dos dados.');
    }
});