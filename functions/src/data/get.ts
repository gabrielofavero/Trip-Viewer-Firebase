import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "./interfaces";
//import * as passeios from "./passeios";

// Principais Métodos de Coleta de dados
async function _getData(path: string, response: functions.Response) {
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

async function _getRefData(refObject: interfaces.Referencia, response: functions.Response) {

    if (
        !refObject ||
        !refObject._firestore ||
        !refObject._path ||
        refObject._path.segments.length !== 2
    ) {
        response.status(400).send("O objeto referenciado não possui a estrutura esperada.");
        return;
    }

    const path = `${refObject._path.segments[0]}/${refObject._path.segments[1]}`;

    return await _getData(path, response);
}


// Coleta de Dados de módulos específicos
async function _getUsuario(request: functions.Request, response: functions.Response) {
    const userID = request.query.userID;

    _checkParam(userID, 'userID', response);

    const path = `usuarios/${userID}`;

   return await _getData(path, response) as unknown as interfaces.Usuario;
}

function _checkParam(param: any, name: string, response: functions.Response) {
    if (!param) {
        response.status(400).send(`O parâmetro '${name}' é obrigatório.`);
        throw new Error(`O parâmetro '${name}' é obrigatório.`);
    }
}


// Função exportada para o Firebase
export const getTripData = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const user = await _getUsuario(request, response);

    var viagens = [];

    for (const viagemRef of user.viagens) {
        const viagem = await _getRefData(viagemRef, response) as unknown as interfaces.Viagem;
        const voos = await _getRefData(viagem.voos, response);
        const programacoes = await _getRefData(viagem.programacoes, response);
        const hospedagens = await _getRefData(viagem.hospedagens, response);

        var passeios = [];

        for (const cidade of viagem.cidades) {
            const passeiosCidade = await _getRefData(cidade.passeios, response);
            const passeioObj = {
                nome: cidade.nome,
                passeios: passeiosCidade
            }
            passeios.push(passeioObj);
        }

        const result = {
            viagem: viagem,
            voos: voos,
            programacoes: programacoes,
            hospedagens: hospedagens,
            passeios: passeios
        }

        viagens.push(result);
    }

    response.send(viagens)
});