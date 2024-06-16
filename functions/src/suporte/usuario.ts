import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getDocument } from "./dados";

export async function isSameOwner(
    request: functions.Request,
    response: functions.Response,
    documentPath: string
) {
    const uid = await getAuthUserUID(request, response);
    const dados = await getDocument(response, documentPath);

    if (uid && dados && dados.compartilhamento && dados.compartilhamento.dono === uid) {
        return true;
    } else return false
}

export async function getAuthUserUID(
    request: functions.Request,
    response: functions.Response
) {
    const authToken = request.query.token;

    if (!authToken) {
        response.status(401).json({ error: "Authentication token is missing" });
    }

    try {
        const AuthUser = await admin.auth().verifyIdToken(authToken as string);
        return AuthUser.uid;
    } catch (e) {
        response.status(401).json({ error: "A autenticação falhou" });
    }

    return null;
}
