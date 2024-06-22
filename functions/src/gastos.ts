import { CallableRequest, onCall } from 'firebase-functions/v2/https';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { getDocument } from './suporte/dados';
import * as functions from 'firebase-functions';

admin.initializeApp();

export const getGastos = onCall(async (request: CallableRequest<any>) => {
    const pin = request.data.pin as string;
    const documentID = request.data.documentID as string;

    if (!documentID) {
        throw new functions.https.HttpsError('invalid-argument', 'O ID do documento não foi fornecido.');
    }

    try {
        const documentData = await getDocument(`gastos/${documentID}`);
        const storedPin = documentData?.pin;

        if (storedPin) {
            const isPinValid = await bcrypt.compare(pin, storedPin);
            if (!isPinValid) {
                throw new functions.https.HttpsError('permission-denied', 'PIN inválido');
            }
        }
        delete documentData?.pin;
        return documentData;
    } catch (error) {
        console.error('Erro ao acessar o Firestore:', error);
        throw new functions.https.HttpsError('internal', 'Erro interno do servidor');
    }
});
