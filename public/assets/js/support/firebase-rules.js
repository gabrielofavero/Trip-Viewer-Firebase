// Apenas uma pré verificação. A verificação final é feita no Firebase Console com dados não adulteráveis
var PERMISSOES;
var PERMISSOES_STATUS = {
    isOwner: "Unknown",
    isEditor: "Unknown",
    isAdmin: "Unknown",
    canUpload: "Unknown",
    isUploadSizeValid: "Unknown",
    isStoragePathAuthorized: 'Unknown'
}

///////////////////////
// Storage Functions //
///////////////////////

async function _getStoragePermissionMessage(path, type, action, data = FIRESTORE_DATA) {
    switch (action) {
        case 'ler':
            return await _getStorageReadPermissionMessage(path, type, data);
        case 'deletar':
            return await _getStorageDeletePermissionMessage(path, type, data);
        case 'escrever':
            return await _getStorageWritePermissionMessage(path, type, data);
        default:
            return `Não foi possível ${action} as imagens do sistema. Ação não autorizada.`;
    }
}

async function _getStorageWritePermissionMessage(path, type, data = FIRESTORE_DATA) {
    const sp = await _getStoragePermissions(path, type, data);
    if (sp.escrever === true) {
        return `Você possui todas as permissões necessárias, mas não foi possível fazer o upload das imagens do sistema. Contate o administrador do sistema para solucionar o problema.`;
    } else if (PERMISSOES_STATUS.isStoragePathAuthorized === false) {
        return `Não foi possível fazer o upload das imagens. O caminho do arquivo não é autorizado.`;
    } else if (PERMISSOES_STATUS.isOwner === false && PERMISSOES_STATUS.isEditor === false && PERMISSOES_STATUS.isAdmin === false) {
        return `Não foi possível fazer o upload das imagens. Você precisa ser o dono do documento, um editor do documento ou um administrador do sistema.`;
    } else if (PERMISSOES_STATUS.canUpload === false) {
        return `Não foi possível fazer o upload das imagens. Você não está autorizado a fazer uploads.`;
    } else if (PERMISSOES_STATUS.isUploadSizeValid === false) {
        return `Não foi possível fazer o upload das imagens. O tamanho do arquivo excede o limite permitido.`;
    } else {
        return `Não foi possível fazer o upload das imagens. Falha na checagem de permissões. Contate o administrador do sistema para verificar suas permissões.`;
    }
}

async function _getStorageReadDeletePermissionMessage(path, type, action, data = FIRESTORE_DATA) {
    const sp = await _getStoragePermissions(path, type, data);
    if (sp[action] === true) {
        return `Você possui todas as permissões necessárias, mas não foi possível ${action} as imagens do sistema. Contate o administrador do sistema para solucionar o problema.`;
    } else if (PERMISSOES_STATUS.isOwner === false && PERMISSOES_STATUS.isEditor === false && PERMISSOES_STATUS.isAdmin === false) {
        return `Não foi possível ${action} as imagens do sistema. Você precisa ser o dono do documento, um editor do documento ou um administrador do sistema.`;
    } else {
        return `Não foi possível ${action} as imagens do sistema. Falha na checagem de permissões. Contate o administrador do sistema para verificar suas permissões.`;
    }
}

function _getStorageReadPermissionMessage(path, type, data = FIRESTORE_DATA) {
    return _getStorageReadDeletePermissionMessage(path, type, 'ler', data);
}

function _getStorageDeletePermissionMessage(path, type, data = FIRESTORE_DATA) {
    return _getStorageReadDeletePermissionMessage(path, type, 'deletar', data);
}

async function _getStoragePermissions(path, type, data = FIRESTORE_DATA) {
    const uid = await _getUID();
    const size = IMAGES_SIZES.length > 0 ? Math.max(...IMAGES_SIZES) : 0;

    var result = {
        ler: 'Unknown',
        deletar: 'Unknown',
        escrever: 'Unknown'
    }

    let hasUserPermissions = 'Unknown';
    let hasPermissions = 'Unknown';

    if (PERMISSOES && uid && data) {
        hasUserPermissions = _hasUserPermissions(uid, data);
        if (path && type && DOCUMENT_ID) {
            hasPermissions = _hasStoragePermissions(uid, size, path, type);
        }
    }

    result.ler = hasUserPermissions;
    result.deletar = hasUserPermissions;
    result.escrever = hasPermissions;

    return result
}

function _isStoragePathAuthorized(path, type) {
    const splitPath = path.split('/');
    let authFolders = ['background', 'logo-light', 'logo-dark'];

    if (type === 'viagens') {
        authFolders.push('galeria');
        authFolders.push('hospedagens')
    }

    const result = (splitPath.length === 3 && splitPath[0] == type && splitPath[1] == DOCUMENT_ID 
        && authFolders.includes(splitPath[2]));

    PERMISSOES_STATUS.isStoragePathAuthorized = result;
    return result
}

function _canUpload() {
    const result = PERMISSOES.upload === true;
    PERMISSOES_STATUS.canUpload = result;
    return result
}

function _isUploadSizeValid(size) {
    const result = PERMISSOES.tamanhoUploadIrrestrito === true || size <= UPLOAD_SIZE;
    PERMISSOES_STATUS.isUploadSizeValid = result;
    return result
}

function _hasImagePermissions(size) {
    const canUpload = _canUpload();
    const isUploadSizeValid = _isUploadSizeValid(size);
    return (canUpload && isUploadSizeValid)
}

function _hasStoragePermissions(uid, size, path, type) {
    const hasUserPermissions = _hasUserPermissions(uid);
    const hasImagePermissions = _hasImagePermissions(size);
    const isStoragePathAuthorized = _isStoragePathAuthorized(path, type);
    return (hasUserPermissions && hasImagePermissions && isStoragePathAuthorized)
}

///////////////////////
// General Functions //
///////////////////////

function _isOwner(uid, data = FIRESTORE_DATA) {
    const result = data.compartilhamento.dono == uid;
    PERMISSOES_STATUS.isOwner = result;
    return result
}

function _isEditor(uid, data = FIRESTORE_DATA) {
    const result = data.compartilhamento.editores.includes(uid);
    PERMISSOES_STATUS.isEditor = result;
    return result
}

function _isAdmin() {
    const result = PERMISSOES.admin === true;
    PERMISSOES_STATUS.isAdmin = result;
    return result
}

function _hasUserPermissions(uid, data) {
    const isAdmin = _isAdmin();
    const isOwner = _isOwner(uid, data);
    const isEditor = _isEditor(uid, data);
    return (isAdmin || isOwner || isEditor)
}

