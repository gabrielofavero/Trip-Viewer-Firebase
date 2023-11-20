import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../main/interfaces";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _checkParam } from "../viagem/check";

// Principal Método de Coleta de dados
export async function _getDataFromPath(path: string, response: functions.Response) {
    _checkParam(path, 'path', response);

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

export function _getRefDataPath(refObject: interfaces.Referencia, response: functions.Response) {
    if (
        !refObject ||
        !refObject._firestore ||
        !refObject._path ||
        refObject._path.segments.length !== 2
    ) {
        response.status(400).send("O objeto referenciado não possui a estrutura esperada.");
        return;
    }

    return `${refObject._path.segments[0]}/${refObject._path.segments[1]}`;
}

export async function _getDataFromReference(refObject: interfaces.Referencia, response: functions.Response) {
    const path = _getRefDataPath(refObject, response);
    return await _getDataFromPath(path as string, response);
}