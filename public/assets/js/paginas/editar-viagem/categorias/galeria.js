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

// Listeners
function _loadGaleriaListeners(j) {
    // Dynamic Select: Categoria
    getID(`galeria-categoria-select-${j}`).addEventListener('change', () => _galeriaSelectAction());
    getID(`galeria-categoria-${j}`).addEventListener('change', () => _galeriaSelectAction());

    // Dynamic Title
    getID(`galeria-titulo-${j}`).addEventListener('change', () => getID(`galeria-title-${j}`).innerText = getID(`galeria-titulo-${j}`).value);

    // Load Listener Actions
    _galeriaSelectAction(true);

    // Validação de Link
    getID(`link-galeria-${j}`).addEventListener('change', () => _validateImageLink(`link-galeria-${j}`));
}

function _galeriaAdicionarListenerAction() {
    _closeAccordions('galeria');
    _addGaleria();
    _loadNewGaleriaSelect();
    _openLastAccordion('galeria');
}