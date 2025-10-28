var CURRENT_LIGHT;

function _loadCustomizacaoImageData(value, id) {
    if (value && typeof value === 'string') {
        getID(id).value = value;
    } else if (value && value.link) {
        getID(id).value = value.link;
    }
}

function _imageDataIncludes(value, includes) {
    if (value && typeof value === 'string') {
        return value.includes(includes);
    } else if (value && value.url) {
        return value.url.includes(includes);
    }
    return false;
}

function _autoFillDarkColor() {
    const escuro = getID('escuro');
    if (escuro.value == '#7f75b6' || (CURRENT_LIGHT && escuro.value == CURRENT_LIGHT)) {
        escuro.value = getID('claro').value;
    }
    CURRENT_LIGHT = getID('claro').value;
}