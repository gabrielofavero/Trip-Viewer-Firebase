// Apenas uma pré verificação. A verificação final é feita no Firebase Console com dados não adulteráveis
var PERMISSOES;
var PERMISSIONS_STATUS = {
    isOwner: "Unknown",
    isEditor: "Unknown",
    isAdmin: "Unknown",
    canUpload: "Unknown",
    isUploadSizeValid: "Unknown"
}

function _getStorageReadDeletePermissionMessage(type, data=FIRESTORE_DATA) {
        const sp = _getStoragePermissions(data);
    if (sp.read === true) {
        return 'Você possui todas as permissões necessárias, mas não foi possível ler as imagens do sistema. Contate o administrador do sistema.';
    } else if (PERMISSIONS_STATUS.isOwner === false && PERMISSIONS_STATUS.isEditor === false && PERMISSIONS_STATUS.isAdmin === false) {
        return 'Não foi possível ler as imagens do sistema. Você precisa ser o dono do documento, um editor do documento ou um administrador do sistema.';
    } else {
        return 'Não foi possível ler as imagens do sistema. Falha na checagem de permissões. Contate o administrador do sistema.';
    }
}

function _getStorageReadPermissionMessage(data=FIRESTORE_DATA) {

}

async function _getStoragePermissions(data=FIRESTORE_DATA) {
    const uid = await _getUID();
    const size = IMAGES_SIZES.length > 0 ? Math.max(...IMAGES_SIZES) : 0;

    var result = {
        read: 'Unknown',
        delete: 'Unknown',
        writeOnAuthorizedPaths: 'Unknown'
    }

    if (PERMISSOES && uid && data) {
        const hasUserPermissions = hasUserPermissions(uid);
        const hasPermissions = hasPermissions(uid, size);

        result.read = hasUserPermissions;
        result.delete = hasUserPermissions;
        result.writeOnAuthorizedPaths = hasPermissions;
    }

    return result
}

function isOwner(uid, data=FIRESTORE_DATA) {
    const result = data.compartilhamento.dono == uid;
    PERMISSIONS_STATUS.isOwner = result;
    return result
}

function isEditor(uid, data=FIRESTORE_DATA) {
    const result = data.compartilhamento.editores.includes(uid);
    PERMISSIONS_STATUS.isEditor = result;
    return result
}

function isAdmin() {
    const result = PERMISSOES.admin === true;
    PERMISSIONS_STATUS.isAdmin = result;
    return result
}

function hasUserPermissions(uid) {
    return (isOwner(uid) || isEditor(uid) || isAdmin())
}

function canUpload() {
    const result = PERMISSOES.upload === true;
    PERMISSIONS_STATUS.canUpload = result;
    return result
}

function isUploadSizeValid(size) {
    const result = PERMISSOES.tamanhoUploadIrrestrito === true || size <= UPLOAD_SIZE;
    PERMISSIONS_STATUS.isUploadSizeValid = result;
    return result
}

function hasImagePermissions(size) {
    return (canUpload() && isUploadSizeValid(size))
}

function hasPermissions(uid, size) {
    return (hasUserPermissions(uid) && hasImagePermissions(size))
}

