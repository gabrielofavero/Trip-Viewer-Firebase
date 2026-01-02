function _getDestinosBoxHTML({ j, item, isLineup, innerProgramacao, notas, valores, moeda }) {
    const identifiers = innerProgramacao ? '' : `class="accordion-body" id="accordion-body-${j}"`;
    return `<div ${identifiers}>
    <div class="destinos-titulo" style="display: ${_getDestinosTituloVisibility(item)}">
        <div class="notas-box">
            <i class="iconify nota-sem-margem ${_getNotaClass(item)}" data-icon="${_getNotaIcon(item)}"></i>
            <span class="nota-texto">${_getNotaText(item, notas)}</span>
        </div>
        <div class="links-container" style="display: ${_getLinksContainerVisibility(item, isLineup)}">
            <i class="iconify link" data-icon="f7:map" style="display: ${item.mapa ? 'block' : 'none'}"${_getLinkOnClick(item, 'mapa')}></i>
            <i class="iconify link" data-icon="ri:instagram-line" style="display: ${item.instagram ? 'block' : 'none'}"${_getLinkOnClick(item, 'instagram')}></i>
            <i class="iconify link" data-icon="tabler:world" style="display: ${item.website ? 'block' : 'none'}"${_getLinkOnClick(item, 'website')}></i>
        </div>
    </div>
    <div class="destinos-text">
        <div class="destinos-topicos-box" style="display: block">
            <div class="destinos-topico" style="display: ${_getHeadlinerVisibility(item, isLineup)}">
                <i class="iconify color-icon" data-icon="ph:star-bold"></i>
                Headliner
            </div>
            <div class="destinos-topico" style="display: ${_getDisplayHorario(item, isLineup)}">
                <i class="iconify color-icon" data-icon="mingcute:time-line"></i>
                ${isLineup ? item.horario : ""}
            </div>
            <div class="destinos-topico" style="display: ${_getPalcoRegiaoVisibility(item, isLineup)}">
                <i class="iconify color-icon" data-icon="mingcute:location-line"></i>
                ${_getPalcoRegiaoValue(item, isLineup)}
            </div>
            <div class="destinos-topico" style="display: ${_getValorVisibility(item, isLineup)}">
                <i class="iconify color-icon" data-icon="bx:dollar"></i>
                ${_getValorValue(item, isLineup, (valores), (moeda || DESTINO.moeda))}
            </div>
            <div class="destinos-topico" style="display: ${_getGeneroVisibility(item, isLineup)}">
                <i class="iconify color-icon" data-icon="mingcute:music-fill"></i>
                ${isLineup ? item.genero : ""}
            </div>
        </div>
        <div class="destinos-descricao" style="display: ${_getDescricaoVisibility(item, isLineup)}">
            ${_getDescricaoValue(item, isLineup)}
        </div>
        <div id="midia-${j}" class="midia-container"></div>
        <div class="edit-container" style="display: none">
            <button class="edit" id="edit-${j}">Editar</button>
        </div>
    </div>
</div>`
}