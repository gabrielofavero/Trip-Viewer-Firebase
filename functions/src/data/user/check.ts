import * as interfaces from "../interfaces";
import { _getData } from "../viagem/get";

export function _isUserOwner (viagemID: string, usuario: interfaces.Usuario) {
    const viagens = usuario.viagens;

    for (let i = 0; i < viagens.length; i++) {
        const viagem = viagens[i];
        if (viagem._path.segments[1] === viagemID) {
            return true;
        }
    }

    return false;
};

export function _isUserEditor(viagem: interfaces.Viagem, uid: string) {
    const editores = viagem.compartilhamento.editores;

    for (let i = 0; i < editores.length; i++) {
        const editor = editores[i];
        if (editor._path.segments[1] === uid) {
            return true;
        }
    }

    return false;
}
