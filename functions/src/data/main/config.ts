import * as functions from "firebase-functions";
import { _getDataFromPath } from "../main/get";

// Exporta dados gerais para o app
export const getConfig = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    const callSyncOrder = await _getDataFromPath(
      "config/call-sync-order",
      response
    );
    const information = await _getDataFromPath("config/information", response);
    const places = await _getDataFromPath("config/places", response);
    const transportes = await _getDataFromPath("config/transportes", response);
    const cores = await _getDataFromPath("config/cores", response);

    const config = {
      callSyncOrder: callSyncOrder,
      information: information,
      places: places,
      transportes: transportes,
      cores: cores,
    };

    response.send(config);
  }
);
