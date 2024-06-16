import { Response } from "firebase-functions";
import * as admin from "firebase-admin";

export async function getDocument(response: Response, stringPath: string) {
    const documentRef = admin.firestore().doc(stringPath);
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
        response.status(404).json({ error: "Documento não encontrado" });
        return;
    }
    return documentSnapshot.data();
}

export async function setDocument(response: Response, stringPath: string, data: any) {
    const documentRef = admin.firestore().doc(stringPath);
    await documentRef.set(data, { merge: true });
    response.json({ success: true });
}