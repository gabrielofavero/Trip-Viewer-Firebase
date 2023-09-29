import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const testGet = functions.https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const data = { };

    try {
        await admin.firestore().doc('programacoes/EzryyEMaNV9TPRZQQrq1').set(data);
        response.send("ok");
    } catch (e) {
        response.send(e);
    }
    
});