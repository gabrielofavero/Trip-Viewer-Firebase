import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getUser, _getAuthUserUID } from "../user/get";
import { _isUserPlacesOwner } from "../user/check";

export const updatePlaces = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type");
      response.status(200).send();
      return;
    }

    const passeiosID = request.body.passeios.id as string;
    let passeios;
    
    try {
      passeios = request.body.passeios.data;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Passeios' válido");
      return;
    }

    const user = await _getUser(request, response);
    const isUserOwner = _isUserPlacesOwner(passeiosID, user);

    if (!isUserOwner) {
      response
        .status(401)
        .send("Usuário não tem permissão para editar este passeio");
      return;
    }

    try {
      await admin.firestore().doc(`passeios/${passeiosID}`).set(passeios);
      response.status(200).send(`Passeio '${passeiosID}' com Sucesso`);
    } catch (e) {
      response.status(500).send(e);
    }
  }
);

export const newPlaces = functions.https.onRequest(
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Origin", "*");
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type");
      response.status(200).send();
      return;
    }

    response.set("Access-Control-Allow-Origin", "*");

    let passeio;
    try {
      passeio = request.body.passeios.data;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Passeios' válido");
      return;
    }

    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response);
    const passeios = user.passeios;

    try {
      const passeiosRef = await admin
        .firestore()
        .collection("passeios")
        .add(passeio);
      const passeiosID = passeiosRef.id;
      const passeiosPath = admin.firestore().doc("passeios/" + passeiosID);

      passeios.push(passeiosPath);

      await admin.firestore().doc(`usuarios/${uid}`).update({
        passeios: passeios,
      });

      response.send(`Passeio '${passeiosID}' criado com sucesso`);
    } catch (e) {
      response.status(500).send(e);
    }
  }
);
