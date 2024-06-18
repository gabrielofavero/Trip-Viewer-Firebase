import { onRequest } from "firebase-functions/v2/https";
import * as bcrypt from "bcrypt";
import * as admin from "firebase-admin";
import { handleCors } from "./suporte/cors";
import { getDocument } from "./suporte/dados";

admin.initializeApp();

export const getGastos = onRequest(async (request, response) => {
    if (!handleCors(request, response)) return;
    const pin = request.body.pin as string;
    const documentID = request.body.documentID as string;

    if (!documentID) {
        response.status(400).json({ error: "O ID do documento não foi fornecido." });
        return;
    }

    try {
        const documentData = await getDocument(response, `gastos/${documentID}`);
        const storedPin = documentData?.pin;

        if (storedPin) {
            const isPinValid = await bcrypt.compare(pin, storedPin);
            if (!isPinValid) {
                response.status(403).json({ error: "PIN inválido" });
                return;
            }
        }
        delete documentData?.pin;
        response.json(documentData);
    } catch (error) {
        console.error("Erro ao acessar o Firestore:", error);
        response.status(500).json({ error: "Erro interno do servidor" });
    }
});
