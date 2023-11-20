import * as functions from "firebase-functions";
import * as interfaces from "../main/interfaces";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _checkParam } from "./check";
import {_getDataFromPath, _getDataFromReference, _getRefDataPath} from "../main/get";


// Retorna a viagem a partir da referência
export async function _getTrip(viagemRef: interfaces.Referencia | string, response: functions.Response) {
    var viagem;
    
    if (typeof viagemRef === 'string') {
        viagem = await _getDataFromPath(viagemRef, response) as unknown as interfaces.Viagem;
    } else {
        viagem = await _getDataFromReference(viagemRef, response) as unknown as interfaces.Viagem;
    }
        
    const transportes = await _getDataFromReference(viagem.transportesRef, response);
    viagem.transportes = transportes;
    
    const programacoes = await _getDataFromReference(viagem.programacoesRef, response);
    viagem.programacoes = programacoes;
    
    const hospedagens = await _getDataFromReference(viagem.hospedagensRef, response);
    viagem.hospedagens = hospedagens;

    for (let i = 0; i < viagem.cidades.length; i++) {
        const passeiosCidade = await _getDataFromReference(viagem.cidades[i].passeiosRef, response);
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
        const viagem = await _getTrip(viagemRef, response);
        viagens.push(viagem);
    }

    response.send(viagens)
});

// Exporta dados gerais para o app
export const getConfig = functions.https.onRequest(async (request, response) => { 
    response.set("Access-Control-Allow-Origin", "*");

    const callSyncOrder = await _getDataFromPath('config/call-sync-order', response);
    const information = await _getDataFromPath('config/information', response);
    const places = await _getDataFromPath('config/places', response);
    const transportes = await _getDataFromPath('config/transportes', response);
    const cores = await _getDataFromPath('config/cores', response);

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
    var viagem = await _getTrip('/viagens/' + viagemRef, response);
    
    response.send(viagem);
});

export const getSingleTripStripped = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    
    _checkParam(request.query.viagemRef, 'viagemRef', response);

    const viagemRef = request.query.viagemRef as string;
    var viagem = await _getDataFromPath('/viagens/' + viagemRef, response);
    
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
            const viagem = await _getTrip(viagemRef, response);
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