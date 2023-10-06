import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export async function _registerUser (request: functions.Request, response: functions.Response) {
    response.set("Access-Control-Allow-Origin", "*");
    const uid = request.query.uid;

    if (!uid) console.log("Usuário não informado");

    try {
        const doc = await admin.firestore().doc(`usuarios/${uid}`).get();
        if (doc.exists) {
            console.log("Usuário já cadastrado no Firestore");
            return;
        } else {
            await admin.firestore().doc(`usuarios/${uid}`).set({});
            console.log("Usuário cadastrado no Firestore");
        }
    } catch (e) {
        console.error(e);
    } 
    
};