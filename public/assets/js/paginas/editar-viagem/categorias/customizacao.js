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

function _formatAltura(value) {
    if (value == 0) {
        value = 1;
        getID('logo-tamanho').value = value;
    }
    getID('logo-tamanho-tooltip').innerText = `(${value * 25}px)`
}