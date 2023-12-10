import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _checkParam } from "../viagem/check";

export const deletePlaces = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const placesID = request.params.placesID;

    _checkParam(placesID, "placesID", response);

    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response);

    try {
      let passeios = user.passeios;
      let passeioDeleted = false;

      for (let i = 0; i < passeios.length; i++) {
        if (passeios[i].id === placesID) {
          const path = "passeios/" + placesID;
          await admin.firestore().doc(path).delete();
          
          passeios.splice(i, 1);

          await admin.firestore().doc(`usuarios/${uid}`).update({ passeios: passeios });
          passeioDeleted = true;
          break;
        }
      }

      if (passeioDeleted) {
        response.status(200).send(`Passeio deletado com sucesso`);
      } else {
        response.status(404).send(`Passeio ${placesID} não encontrado`);
      }
    } catch (e) {
      response.status(500).send(`Erro ao deletar passeio ${placesID}: ${e}`);
    }
  }
);