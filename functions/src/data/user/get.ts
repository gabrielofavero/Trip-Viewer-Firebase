import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../main/interfaces";
import { _getData } from "../main/get";

export async function _getUser (request: functions.Request, response: functions.Response) {
    const uid = await _getAuthUserUID(request, response);
    const path = `usuarios/${uid}`;
    return await _getData(path, response) as unknown as interfaces.Usuario;
}

export async function _registerUser (request: functions.Request, response: functions.Response) {
    response.set("Access-Control-Allow-Origin", "*");

    const uid = await _getAuthUserUID(request, response);

    try {
        const doc = await admin.firestore().doc(`usuarios/${uid}`).get();
        if (doc.exists) {
            console.log("Usuário já cadastrado no Firestore");
            return;
        } else {
            await admin.firestore().doc(`usuarios/${uid}`).set({});
            console.log("Usuário cadastrado no Firestore");
        }
    } catch (e) {
        console.error(e);
    } 
};

export async function _getAuthUserUID (request: functions.Request, response: functions.Response) {
    const authToken = request.query.token;

    if (!authToken) {
        response.status(401).json({ error: 'Authentication token is missing' });
    }

    try {
        const AuthUser =  await admin.auth().verifyIdToken(authToken as string)
        return AuthUser.uid;
    } catch (e) {
        response.status(401).json({ error: 'A autenticação falhou' });
    }

    return null;
}