import * as functions from "firebase-functions";
import { _getUser } from "../user/get";
import { _getDataFromPath } from "../main/get";
import { _checkParam } from "../viagem/check";

// Exporta todos os passeios do usuário
export const getPlacesList = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    try {
      const user = await _getUser(request, response);
      const passeios = [];

      for (const passeioRef of user.passeios) {
        const passeioCode = passeioRef._path.segments[1];
        const passeio = await _getDataFromPath(passeioRef, response);
        const passeioObj = {
          code: passeioCode,
          titulo: null,
        };
        if (passeio) {
          passeioObj.titulo = passeio.titulo;
        }
        passeios.push(passeioObj);
      }

      response.json(passeios);
    } catch (error) {
      response.status(500).send(error);
    }
  }
);

// Exporta dados de um passeio específico
export const getSinglePlace = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    _checkParam(request.query.passeioRef, "passeioRef", response);

    const passeioRef = request.query.passeioRef as string;
    const passeio = await _getDataFromPath("/passeios/" + passeioRef, response);

    response.send(passeio);
  }
);
