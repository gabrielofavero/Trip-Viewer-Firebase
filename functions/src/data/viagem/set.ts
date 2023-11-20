import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../main/interfaces";
import { _getUser, _getAuthUserUID} from "../user/get";
import {_isUserTripOwner, _isUserTripEditor } from "../user/check";

// Atualiza uma viagem já existente
export const updateTrip = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    const viagemID = request.body.viagem.id as string;
    const hospedagemID = request.body.hospedagem.id as string;
    const programacoesIDs = request.body.programacao.id as string;
    const transporteID = request.body.transporte.id as string;

    if (!viagemID || !hospedagemID || !programacoesIDs || !transporteID) {
        response.status(400).send("Não foram fornecidos todos os IDs necessários para atualizar a viagem");
        return;
    }

    let viagem
    try {
        viagem = request.body.viagem.data as interfaces.Viagem;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Viagem' válido");
        return;
    }

    let hospedagem;
    try {
        hospedagem = request.body.hospedagem.data as interfaces.Hospedagem;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Hospedagem' válido");
        return;
    }

    let programacao;
    try {
        programacao = request.body.programacao.data as interfaces.Programacao;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Programação' válido");
        return;
    }

    let transporte;
    try {
        transporte = request.body.transporte.data as interfaces.Transporte;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Transporte' válido");
        return;
    }

    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response) as string;

    const isUserOwner = _isUserTripOwner(viagemID, user);
    const isUserEditor = _isUserTripEditor(viagem, uid);

    if (!isUserOwner && !isUserEditor) {
        response.status(401).send("Usuário não tem permissão para editar esta viagem");
    }

    try {
        await admin.firestore().doc(`viagens/${viagemID}`).set(viagem);
        await admin.firestore().doc(`hospedagens/${hospedagemID}`).set(hospedagem);
        await admin.firestore().doc(`programacoes/${programacoesIDs}`).set(programacao);
        await admin.firestore().doc(`transportes/${transporteID}`).set(transporte);
        response.send("ok");
    } catch (e) {
        response.send(e);
    }

});

export const newTrip = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    let viagem
    try {
        viagem = request.body.viagem.data as interfaces.Viagem;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Viagem' válido");
        return;
    }

    let hospedagem;
    try {
        hospedagem = request.body.hospedagem.data as interfaces.Hospedagem;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Hospedagem' válido");
        return;
    }

    let programacao;
    try {
        programacao = request.body.programacao.data as interfaces.Programacao;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Programação' válido");
        return;
    }

    let transporte;
    try {
        transporte = request.body.transporte.data as interfaces.Transporte;
    } catch (e) {
        response.status(400).send("Não foi fornecido um objeto 'Transporte' válido");
        return;
    }

    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response) as string;
    let viagens = user.viagens;

    try {
        const viagemRef = await admin.firestore().collection("viagens").add(viagem);
        const viagemID = viagemRef.id;
        const viagemPath = "viagens/" + viagemID;

        hospedagem.viagem = viagemPath;
        const hospedagemRef = await admin.firestore().collection("hospedagens").add(hospedagem);
        const hospedagemID = hospedagemRef.id;

        programacao.viagem = viagemPath;
        const programacaoRef = await admin.firestore().collection("programacoes").add(programacao);
        const programacaoID = programacaoRef.id;

        transporte.viagem = viagemPath;
        const transporteRef = await admin.firestore().collection("transportes").add(transporte);
        const transporteID = transporteRef.id;

        await admin.firestore().doc(viagemPath).update({
            hospedagensRef: hospedagemID,
            programacoesRef: programacaoID,
            transportesRef: transporteID
        });

        viagens.push(viagemPath);

        await admin.firestore().doc(`users/${uid}`).update({
            viagens: viagens
        });

        response.send("ok");
    } catch (e) {
        response.status(500).send(e);
    }

});