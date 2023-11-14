import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../interfaces";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _checkParam } from "./check";

// Principais Métodos de Coleta de dados
export async function _getData(path: string, response: functions.Response) {
    if (!path) {
        response.status(400).send("O parâmetro 'path' é obrigatório.");
        return null;
    }

    try {
        const snapshot = await admin.firestore().doc(path).get();
        const data = snapshot.data();
        if (data) {
            return data;
        } else {
            response.status(404).send("Documento não encontrado");
            return null;
        }
    } catch (error) {
        response.status(500).send(error);
        return null;
    }
}

export function _getRefDataPath(refObject: interfaces.Referencia, response: functions.Response) {
    if (
        !refObject ||
        !refObject._firestore ||
        !refObject._path ||
        refObject._path.segments.length !== 2
    ) {
        response.status(400).send("O objeto referenciado não possui a estrutura esperada.");
        return;
    }

    return `${refObject._path.segments[0]}/${refObject._path.segments[1]}`;
}

export async function _getRefData(refObject: interfaces.Referencia, response: functions.Response) {
    const path = _getRefDataPath(refObject, response);
    return await _getData(path as string, response);
}

// Retorna a viagem a partir da referência
async function _getViagem(viagemRef: interfaces.Referencia | string, response: functions.Response) {
    var viagem;
    
    if (typeof viagemRef === 'string') {
        viagem = await _getData(viagemRef, response) as unknown as interfaces.Viagem;
    } else {
        viagem = await _getRefData(viagemRef, response) as unknown as interfaces.Viagem;
    }4
        
    const transportes = await _getRefData(viagem.transportesRef, response);
    viagem.transportes = transportes;
    
    const programacoes = await _getRefData(viagem.programacoesRef, response);
    viagem.programacoes = programacoes;
    
    const hospedagens = await _getRefData(viagem.hospedagensRef, response);
    viagem.hospedagens = hospedagens;

    for (let i = 0; i < viagem.cidades.length; i++) {
        const passeiosCidade = await _getRefData(viagem.cidades[i].passeiosRef, response);
        viagem.cidades[i].passeios = passeiosCidade;
    }

    for (let i = 0; i < viagem.cidades.length; i++) {
        const passeiosCidade = await _getRefData(viagem.cidades[i].passeiosRef, response);
        viagem.cidades[i].passeios = passeiosCidade;
    }

    return viagem;
}

// Exporta dados da viagem para o app
export const getAllTripsFromUser = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const user = await _getUser(request, response);

    var viagens = [];

    for (const viagemRef of user.viagens) {
        const viagem = await _getViagem(viagemRef, response);
        viagens.push(viagem);
    }

    response.send(viagens)
});

// Exporta dados gerais para o app
export const getConfig = functions.https.onRequest(async (request, response) => { 
    response.set("Access-Control-Allow-Origin", "*");

    const callSyncOrder = await _getData('config/call-sync-order', response);
    const information = await _getData('config/information', response);
    const places = await _getData('config/places', response);
    const transportes = await _getData('config/transportes', response);
    const cores = await _getData('config/cores', response);

    const config = {
        callSyncOrder: callSyncOrder,
        information: information,
        places: places,
        transportes: transportes,
        cores: cores
    };

    response.send(config);
});

// Exporta dados de uma viagem específica
export const getSingleTrip = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    
    _checkParam(request.query.viagemRef, 'viagemRef', response);
    const viagemRef = request.query.viagemRef as string;
    
    var viagem = await _getViagem('/viagens/' + viagemRef, response);
    
    response.send(viagem);
});

// Exporta todas as viagens do usuário
export const getTripList = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    
    try {
        const user = await _getUser(request, response);
        var viagens = [];

        for (const viagemRef of user.viagens) {
            const viagemCode = viagemRef._path.segments[1];
            const viagem = await _getViagem(viagemRef, response);
            viagens.push({
                code: viagemCode,
                titulo: viagem.titulo,
                inicio: viagem.inicio,
                fim: viagem.fim
            });
        }

        response.json(viagens);
    } catch (error) {
        response.status(500).send(error);
    }
});