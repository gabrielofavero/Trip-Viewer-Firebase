import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../main/interfaces";
import { _getUser, _getAuthUserUID } from "../user/get";
import { _isUserPlacesOwner } from "../user/check";

export const updatePlaces = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    const passeiosID = request.body.passeios.id as string;
    const passeios = request.body.passeios.data as interfaces.Passeios;

    const user = await _getUser(request, response);
    const isUserOwner = _isUserPlacesOwner(passeiosID, user);

    if (!isUserOwner) {
      response
        .status(401)
        .send("Usuário não tem permissão para editar este passeio");
    }

    try {
      await admin.firestore().doc(`viagens/${passeiosID}`).set(passeios);
      response.send("Passeio Atualizado com Sucesso");
    } catch (e) {
      response.send(e);
    }
  }
);

export const newPlaces = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    let passeio;
    try {
      passeio = request.body.passeios.data as interfaces.Passeios;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Passeios' válido");
      return;
    }
    const user = await _getUser(request, response);
    const uid = (await _getAuthUserUID(request, response)) as string;
    const passeios = user.passeios;

    try {
      const passeiosRef = await admin
        .firestore()
        .collection("passeios")
        .add(passeio);
      const passeiosID = passeiosRef.id;
      const passeiosPath = "passeios/" + passeiosID;

      passeios.push(passeiosPath);

      await admin.firestore().doc(`users/${uid}`).update({
        passeios: passeios,
      });

      response.send("ok");
    } catch (e) {
      response.status(500).send(e);
    }
  }
);
