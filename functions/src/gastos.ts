import { Request, Response} from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as bcrypt from "bcrypt";
import * as admin from "firebase-admin";
import { handleCors } from "./suporte/cors";
import { isSameOwner } from "./suporte/usuario";
import { getDocument, setDocument } from "./suporte/dados";

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

export const getGastosEdit = onRequest(async (request, response) => {
    if (!handleCors(request, response)) return;
    if (!await handleEditPermission(request, response)) return;

    const data = await getDocument(response, `gastos/${request.body.documentID}`);
    response.json(data);
});

export const setGastosEdit = onRequest(async (request, response) => {
    if (!handleCors(request, response)) return;
    if (!await handleEditPermission(request, response)) return;

    const documentID = request.body.documentID as string;
    const data = request.body.data;

    await setDocument(response, `gastos/${documentID}`, data);
    response.json({ success: true });
});

async function handleEditPermission(request: Request, response: Response) {
    const path = request.path as string;
    if (!path) {
        response.status(400).json({ error: "O caminho da página não foi fornecido." });
        return false;
    }
    if (!path.includes("editar-viagem")) {
        response.status(400).json({ error: "O caminho da página não é válido." });
        return false;
    }

    const documentID = request.body.documentID as string;
    if (!documentID) {
        response.status(400).json({ error: "O ID do documento não foi fornecido." });
        return false;
    }

    const ownerViagem = await isSameOwner(request, response, `viagem/${documentID}`);
    const ownerGastos = await isSameOwner(request, response, `gastos/${documentID}`);

    if (!ownerViagem || !ownerGastos) {
        response.status(403).json({ error: "Você não tem permissão para editar este documento." });
        return false;
    }

    return true;
}
