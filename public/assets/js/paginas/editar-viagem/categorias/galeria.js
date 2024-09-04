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
    // Dynamic Title
    getID(`galeria-titulo-${j}`).addEventListener('change', () => getID(`galeria-title-${j}`).innerText = getID(`galeria-titulo-${j}`).value);

    // Validação de Link
    getID(`link-galeria-${j}`).addEventListener('change', () => _validateImageLink(`link-galeria-${j}`));
}

function _galeriaAdicionarListenerAction() {
    _closeAccordions('galeria');
    _addGaleria();
    _openLastAccordion('galeria');
}