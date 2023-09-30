import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const testGet = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const data = {
        "datas": [
            {
                "partida": {
                    "_seconds": 1697221200,
                    "_nanoseconds": 45000000
                },
                "chegada": {
                    "_seconds": 1697226000,
                    "_nanoseconds": 702000000
                }
            },
            {
                "partida": {
                    "_seconds": 1697248200,
                    "_nanoseconds": 910000000
                },
                "chegada": {
                    "_seconds": 1697280000,
                    "_nanoseconds": 248000000
                }
            },
            {
                "partida": {
                    "_seconds": 1697288340,
                    "_nanoseconds": 866000000
                },
                "chegada": {
                    "_seconds": 1697292300,
                    "_nanoseconds": 220000000
                }
            },
            {
                "partida": {
                    "_seconds": 1698155100,
                    "_nanoseconds": 633000000
                },
                "chegada": {
                    "_seconds": 1698180480,
                    "_nanoseconds": 997000000
                }
            },
            {
                "partida": {
                    "_seconds": 1698184800,
                    "_nanoseconds": 480000000
                },
                "chegada": {
                    "_seconds": 1698223200,
                    "_nanoseconds": 361000000
                }
            },
            {
                "partida": {
                    "_seconds": 1698231600,
                    "_nanoseconds": 242000000
                },
                "chegada": {
                    "_seconds": 1698235800,
                    "_nanoseconds": 619000000
                }
            }
        ],
        "reservas": [
            "XPSQSE",
            "XPSQSE",
            "XPSQSE",
            "XPSQSE",
            "XPSQSE",
            "XPSQSE"
        ],
        "trajetos": [
            "BH → SP",
            "SP → ATL",
            "ATL → LV",
            "LV → ATL",
            "ATL → SP",
            "SP → BH"
        ],
        "empresas": [
            "LATAM",
            "LATAM",
            "Delta",
            "Delta",
            "Delta",
            "LATAM"
        ],
        "viagem": {
            "_firestore": {
                "projectId": "trip-viewer-tcc"
            },
            "_path": {
                "segments": [
                    "viagens",
                    "g4nx5cyNKW2geSnQVXX8"
                ]
            },
            "_converter": {}
        },
        "tipos": {
            "idaVolta": [
                "ida",
                "ida",
                "ida",
                "volta",
                "volta",
                "volta"
            ],
            "transporte": [
                "Voo",
                "Voo",
                "Voo",
                "Voo",
                "Voo",
                "Voo"
            ]
        },
        "pontos": [
            {
                "chegada": "Congonhas",
                "partida": "Confins"
            },
            {
                "chegada": "Atlanta International",
                "partida": "Guarulhos"
            },
            {
                "chegada": "Harry Reid International",
                "partida": "Atlanta International"
            },
            {
                "chegada": "Atlanta International",
                "partida": "Harry Reid International"
            },
            {
                "chegada": "Guarulhos",
                "partida": "Atlanta International"
            },
            {
                "chegada": "Confins",
                "partida": "Guarulhos"
            }
        ]
    };

    try {
        await admin.firestore().doc('transportes/TEZdFiRAUD2wsZTej3LS').set(data);
        response.send("ok");
    } catch (e) {
        response.send(e);
    }
    
});