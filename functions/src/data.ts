import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

async function _getData(path: string | undefined, response: functions.Response) {
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

// async function _getUsuario(userID: string | undefined, response: functions.Response) {
//     if (!userID) {
//         response.status(400).send("O parâmetro 'userID' é obrigatório.");
//         return;
//     }

//     const path = `usuarios/${userID}`;

//     await _getData(path, response);
// }

// async function _getViagem(viagemID: string | undefined, response: functions.Response) {
//     if (!viagemID) {
//         response.status(400).send("O parâmetro 'viagemID' é obrigatório.");
//         return;
//     }

//     const path = `viagens/${viagemID}`;

//     await _getData(path, response);
// }



export const getTripData = functions.https.onRequest((request, response) => {
    const userID = request.query.userID;
    
    if (!userID) {
        response.status(400).send("O parâmetro 'userID' é obrigatório.");
        return;
    }

    const path = `usuarios/${userID}`;

    _getData(path, response);
});