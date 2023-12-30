import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getUser, _getAuthUserUID } from "../user/get";
import { _isUserTripOwner, _isUserTripEditor } from "../user/check";

// Atualiza uma viagem já existente
export const updateTrip = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type");
      response.status(200).send();
      return;
    }

    const viagemPath = request.body.viagem.id as string;

    if (!viagemPath) {
      response
        .status(400)
        .send(
          "Não foi fornecida a referência da viagem"
        );
      return;
    }

    const viagemID = viagemPath.split("/")[1];

    let viagem;
    try {
      viagem = request.body.viagem.data;
    } catch (e) {
      response.status(400).send("Não foi fornecido um objeto 'Viagem' válido");
      return;
    }

    const user = await _getUser(request, response);
    const uid = (await _getAuthUserUID(request, response)) as string;

    const isUserOwner = _isUserTripOwner(viagemID, user);
    const isUserEditor = _isUserTripEditor(viagem, uid);

    if (!isUserOwner && !isUserEditor) {
      response
        .status(401)
        .send("Usuário não tem permissão para editar esta viagem");
      return;
    }

    try {
      const viagemDoc = admin.firestore().doc(`viagens/${viagemID}`);
      await viagemDoc.set(viagem);

      const userDoc = admin.firestore().doc(`usuarios/${uid}`);

      await viagemDoc.update({
        'compartilhamento.dono': userDoc,
      });

      response.send(`Viagem '${viagemID}' atualizada com sucesso`);
    } catch (e) {
      response.status(500).send(e);
    }
  }
);

export const updateTripImage = functions.https.onRequest(
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      response.set("Access-Control-Allow-Headers", "Content-Type");
      response.status(200).send();
      return;
    }

    const viagemID = request.body.viagemID as string;
    const background = request.body.background as string;
    const logo = request.body.logo as string;
    const logoAtivo = logo ? true : false;
    const uploadBackground = request.body.uploadBackground as boolean;
    const uploadLogo = request.body.uploadLogo as boolean;

    const viagemDoc = admin.firestore().doc(`viagens/${viagemID}`);

    try {
      if (uploadBackground && uploadLogo) {
        await viagemDoc.update({
          'imagem.background': background,
          'imagem.ativo': logoAtivo,
          'imagem.claro': logo,
          'imagem.escuro': logo,
        });
      } else if (uploadBackground) {
        await viagemDoc.update({
          'imagem.background': background,
        });
       } else if (uploadLogo) {
          await viagemDoc.update({
            'imagem.ativo': logoAtivo,
            'imagem.claro': logo,
            'imagem.escuro': logo,
          });
      }

      response.send(`Viagem '${viagemID}' atualizada com sucesso`);
    } catch (e) {
      response.status(500).send(e);
    }
  }
);

export const newTrip = functions.https.onRequest(async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  if (request.method === "OPTIONS") {
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");
    response.status(200).send();
    return;
  }

  let viagem;
  try {
    viagem = request.body.viagem.data;
  } catch (e) {
    response.status(400).send("Não foi fornecido um objeto 'Viagem' válido");
    return;
  }

  const user = await _getUser(request, response);
  const uid = (await _getAuthUserUID(request, response)) as string;
  const viagens = user.viagens;

  try {
    const viagemRef = await admin.firestore().collection("viagens").add(viagem);
    const viagemID = viagemRef.id;
    const viagemPath = admin.firestore().doc("viagens/" + viagemID);

    const userPath = admin.firestore().doc(`usuarios/${uid}`);

    await admin.firestore().doc('viagens/' + viagemID).update({
      'compartilhamento.dono': userPath,
    });

    viagens.push(viagemPath);

    await admin.firestore().doc(`usuarios/${uid}`).update({
      viagens: viagens,
    });

    response.send(`Viagem '${viagemID}' criada com sucesso`);
  } catch (e) {
    response.status(500).send(e);
  }
});
