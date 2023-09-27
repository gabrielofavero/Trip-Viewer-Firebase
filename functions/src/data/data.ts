import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "./interfaces";

// Principais Métodos de Coleta de dados
async function _getData(path: string, response: functions.Response) {
    if (!path) {
        response.status(400).send("O parâmetro 'path' é obrigatório.");
        return;
    }

    try {
        const snapshot = await admin.firestore().doc(path).get();
        const data = snapshot.data();
        if (data) {
            response.send(data);
        } else {
            response.status(404).send("Documento não encontrado");
        }
    } catch (error) {
        response.status(500).send(error);
    }
}

// async function _getRefData(refObject: interfaces.Referencia, response: functions.Response) {

//     if (
//         !refObject ||
//         !refObject._firestore ||
//         !refObject._path ||
//         refObject._path.segments.length !== 2
//     ) {
//         response.status(400).send("O objeto referenciado não possui a estrutura esperada.");
//         return;
//     }

//     const path = `${refObject._path.segments[0]}/${refObject._path.segments[1]}`;

//     await _getData(path, response);
// }


// Coleta de Dados de módulos específicos
async function _getUsuario(request: functions.Request, response: functions.Response) {
    const userID = request.query.userID;

    _checkParam(userID, 'userID', response);

    const path = `usuarios/${userID}`;

   return await _getData(path, response) as unknown as interfaces.Usuario;
}

// async function _getViagem(viagemID: any, response: functions.Response) {
//     _checkParam(viagemID, 'viagemID', response);

//     const path = `viagens/${viagemID}`;

//     await _getData(path, response);
// }

function _checkParam(param: any, name: string, response: functions.Response) {
    if (!param) {
        response.status(400).send(`O parâmetro '${name}' é obrigatório.`);
        throw new Error(`O parâmetro '${name}' é obrigatório.`);
    }
}


// Função exportada para o Firebase
export const getTripData = functions.https.onRequest(async (request, response) => {
    await _getUsuario(request, response);
});