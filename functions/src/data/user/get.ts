import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../interfaces";
import { _getData } from "../viagem/get";

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

export function _isUserOwner (viagemID: string, usuario: interfaces.Usuario) {
    const viagens = usuario.viagens;

    for (let i = 0; i < viagens.length; i++) {
        const viagem = viagens[i];
        if (viagem._path.segments[1] === viagemID) {
            return true;
        }
    }

    return false;
};

export function _isUserEditor(viagem: interfaces.Viagem, uid: string) {
    const editores = viagem.compartilhamento.editores;

    for (let i = 0; i < editores.length; i++) {
        const editor = editores[i];
        if (editor._path.segments[1] === uid) {
            return true;
        }
    }

    return false;
}
