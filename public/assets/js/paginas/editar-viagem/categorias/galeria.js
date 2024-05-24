function _galeriaSelectAction(init = false, updateLast = false) {
    let copy = GALERIA_CATEGORIAS;
    GALERIA_CATEGORIAS = _getUpdatedDynamicSelectArray('galeria', 'categoria');
    _loadDynamicSelect('galeria', 'categoria', copy, GALERIA_CATEGORIAS, init, updateLast);
}

function _loadNewGaleriaSelect() {
    _galeriaSelectAction(false, true);
}

async function _uploadGaleria(uploadItens) {
    return await _uploadViagemItens(uploadItens, 'galeria');
}

function _deleteGaleria(i) {
    const id = `galeria-${i}`;
    _removeImageSelectorListeners(id);
    const div = getID(id);
    div.parentNode.removeChild(div);
}