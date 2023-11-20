import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { _getAuthUserUID, _getUser } from "../user/get";
import { _getRefData, _getRefDataPath } from "../main/get";

export async function _deleteUser(request: functions.Request, response: functions.Response) {
    const user = await _getUser(request, response);
    const uid = await _getAuthUserUID(request, response);
    const deletePasseio = request.query.deletePasseio === 'true';

    let deletedData = {
        user: '',
        viagens: [] as string[],
        hospedagens: [] as string[],
        programacoes: [] as string[],
        transportes: [] as string[],
        passeios: [] as string[]
    };

    try {
        const viagensRefs = user.viagens;

        for (let i = 0; i < viagensRefs.length; i++) {
            const viagem = await _getRefData(viagensRefs[i], response);
            const viagemPath = _getRefDataPath(viagensRefs[i], response);

            if (!viagem || !viagem.hospedagensRef || !viagem.programacoesRef || !viagem.transportesRef) {
                response.status(404).send(`Viagem ${viagemPath} não encontrada ou não possui dados de hospedagem, programações ou transportes`);
                return;
            }

            const hospedagemPath = _getRefDataPath(viagem.hospedagensRef, response);
            const programacoesPath = _getRefDataPath(viagem.programacoesRef, response);
            const transportesPath = _getRefDataPath(viagem.transportesRef, response);

            await admin.firestore().doc(hospedagemPath as string).delete();
            deletedData.hospedagens.push(hospedagemPath as string);

            await admin.firestore().doc(programacoesPath as string).delete();
            deletedData.programacoes.push(programacoesPath as string);

            await admin.firestore().doc(transportesPath as string).delete();
            deletedData.transportes.push(transportesPath as string);

            if (deletePasseio) {
                const passeiosPath = _getRefDataPath(viagem.passeiosRef, response);
                await admin.firestore().doc(passeiosPath as string).delete();
                deletedData.passeios.push(passeiosPath as string);
            }

            await admin.firestore().doc(viagemPath as string).delete();
            deletedData.viagens.push(viagemPath as string);
        }

        await admin.auth().deleteUser(uid as string);
        await admin.firestore().doc(`usuarios/${uid}`).delete();
        deletedData.user = `usuarios/${uid}`;
        response.status(200).send(`Usuário e dados associados deletados com sucesso: ${JSON.stringify(deletedData)}`);
    } catch (error) {
        const errorObj = {
            error: error,
            deletedData: deletedData
        }
        response.status(500).send(`Erro ao deletar usuário: ${JSON.stringify(errorObj)}`);
    }
};
