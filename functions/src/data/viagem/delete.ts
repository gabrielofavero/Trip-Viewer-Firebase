import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _getRefDataPath } from "../main/get";
import { _checkParam } from "./check";

export const deleteTrip = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const tripID = request.params.tripID;

    _checkParam(tripID, "tripID", response);

    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response);

    try {
      const viagens = user.viagens;

      for (let i = 0; i < viagens.length; i++) {
        if (viagens[i].id === tripID) {
          const hospedagemPath = _getRefDataPath(
            viagens[i].hospedagensRef,
            response
          );
          const programacoesPath = _getRefDataPath(
            viagens[i].programacoesRef,
            response
          );
          const transportesPath = _getRefDataPath(
            viagens[i].transportesRef,
            response
          );

          await admin
            .firestore()
            .doc(hospedagemPath as string)
            .delete();
          await admin
            .firestore()
            .doc(programacoesPath as string)
            .delete();
          await admin
            .firestore()
            .doc(transportesPath as string)
            .delete();

          viagens.splice(i, 1);
          await admin
            .firestore()
            .doc(`usuarios/${uid}`)
            .update({ viagens: viagens });

          const viagensPath = `viagens/${tripID}`;
          await admin.firestore().doc(viagensPath).delete();

          const deletedContent = {
            hospedagem: hospedagemPath,
            programacoes: programacoesPath,
            transportes: transportesPath,
            viagem: viagensPath,
          };
          response
            .status(200)
            .send(
              `Viagem deletada com sucesso: ${JSON.stringify(deletedContent)}`
            );
          return;
        }
      }

      response.status(404).send(`Viagem ${tripID} não encontrada`);
    } catch (e) {
      response.status(500).send(`Erro ao deletar viagem ${tripID}: ${e}`);
    }
  }
);
