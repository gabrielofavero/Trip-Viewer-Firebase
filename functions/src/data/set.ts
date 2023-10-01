import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const testSet = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const data = {
        "costs":[
            {
                "titulo": "Total",
                "icone": "bx bxs-dollar-circle",
                "texto": ""
            },
            {
                "titulo": "Passagem",
                "icone": "bx bxs-plane-alt",
                "texto": ""
            },
            {
                "titulo": "Hospedagem",
                "icone": "bx bxs-hotel",
                "texto": ""
            },
            {
                "titulo": "Dia-A-Dia",
                "icone": "bx bxs-sun",
                "texto": ""
            }
        ],
        "keypoints":[
            {
                "titulo": "Ida",
                "icone": "bx bxs-plane-take-off",
                "texto": "13/10"
            },
            {
                "titulo": "Volta",
                "icone": "bx bxs-plane-land",
                "texto": "24/10"
            },
            {
                "titulo": "Dias de Turismo",
                "icone": "bx bxs-sun",
                "texto": 9
            },
            {
                "titulo": "Dias de Voos",
                "icone": "bx bxs-plane-alt",
                "texto": 2
            }
        ]
    };

    try {
        await admin.firestore().doc('config/information').set(data);
        response.send("ok");
    } catch (e) {
        response.send(e);
    }
    
});