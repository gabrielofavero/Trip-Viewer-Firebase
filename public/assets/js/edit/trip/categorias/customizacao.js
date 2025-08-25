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