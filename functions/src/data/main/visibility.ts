import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getUser, _getAuthUserUID } from "../user/get";
import { _isUserPlacesOwner } from "../user/check";

export const updateVisibility = functions.https.onRequest(
    async (request, response) => {
        response.set("Access-Control-Allow-Origin", "*");

        const visibility = request.query.visibility as string;

        if (!visibility || !["dinamico", "claro", "escuro"].includes(visibility)) {
            response.status(400).send("Visibilidade inválida");
        } else {
            const uid = (await _getAuthUserUID(request, response)) as string;

            try {
                await admin.firestore().doc(`usuarios/${uid}`).update({ visibilidade: visibility });
                response.send("Visibilidade Atualizada com Sucesso");
            } catch (e) {
                response.send(e);
            }
        }
    }
);

export const getVisibility = functions.https.onRequest(
    async (request, response) => {
        response.set("Access-Control-Allow-Origin", "*");
        try {
            const user = await _getUser(request, response);
            response.send(user.visibilidade);
        } catch (e) {
            response.send(e);
        }
    }
);
