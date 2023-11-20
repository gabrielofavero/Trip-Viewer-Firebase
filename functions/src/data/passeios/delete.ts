import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _getDataFromPath, _getRefDataPath } from "../main/get";
import { _checkParam } from "../viagem/check";

export async function _deletePlaces (request: functions.Request, response: functions.Response) {
    const placesID = request.params.placesID;

    _checkParam(placesID, 'placesID', response);
    
    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response);

    try {
        const passeios = user.passeios;

        for (let i = 0; i < passeios.length; i++) {
            if (passeios[i].id === placesID) {

                const path = 'passeios/' + placesID;

                await admin.firestore().doc(path).delete();

                passeios.splice(i, 1);
                await admin.firestore().doc(`usuarios/${uid}`).update({ passeios: passeios });

                const deletedContent = {
                    passeios: path,
                };
                response.status(200).send(`Passeio deletado com sucesso: ${JSON.stringify(deletedContent)}`);
                return;
            }
        }

        response.status(404).send(`Passeio ${placesID} não encontrado`);
    } catch (e) {
        response.status(500).send(`Erro ao deletar passeio ${placesID}: ${e}`);
    }
};
