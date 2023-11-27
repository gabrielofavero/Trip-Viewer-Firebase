import * as functions from "firebase-functions";
import { _getUser } from "../user/get";
import { _getDataFromPath } from "../main/get";
import { _checkParam } from "../viagem/check";

// Exporta todos os passeios do usuário
export const getPlacesList = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    const user = await _getUser(request, response);
    const passeios = [];

    for (const passeioRef of user.passeios) {
      const passeioCode = passeioRef._path.segments[1];
      const passeio = await _getDataFromPath("passeios/" + passeioCode, response);
      
      if (passeio) {
        const passeioObj = {
          code: passeioCode,
          titulo: passeio.titulo
        }
        passeios.push(passeioObj);
      }
      
    }

    response.send(passeios);
  }
);

// Exporta dados de um passeio específico
export const getSinglePlaces = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    _checkParam(request.query.passeioRef, "passeioRef", response);

    const passeioRef = request.query.passeioRef as string;
    const passeio = await _getDataFromPath("passeios/" + passeioRef, response);

    response.send(passeio);
  }
);
