function _getDestinosBoxHTML({ j, item, innerProgramacao, valores, moeda }) {
    const identifiers = innerProgramacao ? '' : `class="accordion-body" id="accordion-body-${j}"`;
    const valoresValue = valores || CONFIG.moedas.escala[FIRESTORE_DESTINOS_DATA.moeda];
    const moedaValue = moeda || FIRESTORE_DESTINOS_DATA.moeda;

    return `<div ${identifiers}>
    <div class="destinos-titulo" style="display: ${_getDestinosTituloVisibility(item)}">
        <div class="notas-box">
            <i class="iconify nota-sem-margem ${_getNotaClass(item)}" data-icon="${_getNotaIcon(item)}"></i>
            <span class="nota-texto">${translate(`destination.scores.${item.nota}`)}</span>
        </div>
        <div class="links-container" style="display: ${_getLinksContainerVisibility(item)}">
            <i class="iconify link" data-icon="f7:map" style="display: ${item.mapa ? 'block' : 'none'}"${_getLinkOnClick(item, 'mapa')}></i>
            <i class="iconify link" data-icon="ri:instagram-line" style="display: ${item.instagram ? 'block' : 'none'}"${_getLinkOnClick(item, 'instagram')}></i>
            <i class="iconify link" data-icon="tabler:world" style="display: ${item.website ? 'block' : 'none'}"${_getLinkOnClick(item, 'website')}></i>
        </div>
    </div>
    <div class="destinos-text">
        <div class="destinos-topicos-box" style="display: block">
            <div class="destinos-topico" style="display: ${_getValorVisibility(item)}">
                <i class="iconify color-icon" data-icon="bx:dollar"></i>
                ${_getValorValue(item, valoresValue, moedaValue)}
            </div>
        </div>
        <div class="destinos-descricao" style="display: ${_getDescricaoVisibility(item)}">
            ${_getDescricaoValue(item)}
        </div>
        <div id="midia-${j}" class="midia-container"></div>
        <div class="edit-container" style="display: none">
            <button class="edit" id="edit-${j}">Editar</button>
        </div>
    </div>
</div>`
}