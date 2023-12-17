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
    const hospedagemPath = request.body.hospedagem.id as string;
    const programacoesPath = request.body.programacao.id as string;
    const transportePath = request.body.transporte.id as string;

    if (!viagemPath || !hospedagemPath || !programacoesPath || !transportePath) {
      response
        .status(400)
        .send(
          "Não foram fornecidas todos as referências necessárias para atualizar a viagem"
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

    let hospedagem;
    try {
      hospedagem = request.body.hospedagem.data;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Hospedagem' válido");
      return;
    }

    let programacao;
    try {
      programacao = request.body.programacao.data;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Programação' válido");
      return;
    }

    let transporte;
    try {
      transporte = request.body.transporte.data;
    } catch (e) {
      response
        .status(400)
        .send("Não foi fornecido um objeto 'Transporte' válido");
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

      const hospedagemDoc = admin.firestore().doc(hospedagemPath);
      await hospedagemDoc.set(hospedagem);

      const programacoesDoc = admin.firestore().doc(programacoesPath);
      await programacoesDoc.set(programacao);

      const transporteDoc = admin.firestore().doc(transportePath);
      await transporteDoc.set(transporte);

      const userDoc = admin.firestore().doc(`usuarios/${uid}`);

      await viagemDoc.update({
        hospedagensRef: hospedagemDoc,
        programacoesRef: programacoesDoc,
        transportesRef: transporteDoc,
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

  let hospedagem;
  try {
    hospedagem = request.body.hospedagem.data;
  } catch (e) {
    response
      .status(400)
      .send("Não foi fornecido um objeto 'Hospedagem' válido");
    return;
  }

  let programacao;
  try {
    programacao = request.body.programacao.data;
  } catch (e) {
    response
      .status(400)
      .send("Não foi fornecido um objeto 'Programação' válido");
    return;
  }

  let transporte;
  try {
    transporte = request.body.transporte.data;
  } catch (e) {
    response
      .status(400)
      .send("Não foi fornecido um objeto 'Transporte' válido");
    return;
  }

  const user = await _getUser(request, response);
  const uid = (await _getAuthUserUID(request, response)) as string;
  const viagens = user.viagens;

  try {
    const viagemRef = await admin.firestore().collection("viagens").add(viagem);
    const viagemID = viagemRef.id;
    const viagemPath = admin.firestore().doc("viagens/" + viagemID);

    hospedagem.viagem = viagemPath;
    const hospedagemRef = await admin
      .firestore()
      .collection("hospedagens")
      .add(hospedagem);
    const hospedagemID = hospedagemRef.id;
    const hospedagemPath = admin.firestore().doc("hospedagens/" + hospedagemID);

    programacao.viagem = viagemPath;
    const programacaoRef = await admin
      .firestore()
      .collection("programacoes")
      .add(programacao);
    const programacaoID = programacaoRef.id;
    const programacaoPath = admin.firestore().doc("programacoes/" + programacaoID);

    transporte.viagem = viagemPath;
    const transporteRef = await admin
      .firestore()
      .collection("transportes")
      .add(transporte);
    const transporteID = transporteRef.id;
    const transportePath = admin.firestore().doc("transportes/" + transporteID);

    const userPath = admin.firestore().doc(`usuarios/${uid}`);

    await admin.firestore().doc('viagens/' + viagemID).update({
      hospedagensRef: hospedagemPath,
      programacoesRef: programacaoPath,
      transportesRef: transportePath,
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
