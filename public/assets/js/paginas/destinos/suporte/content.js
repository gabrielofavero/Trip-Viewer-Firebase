function _getDestinosHTML(j, id, item, valores) {
    const params = { j, id, item, valores }
    return `
    <div class="accordion-group" id='destinos-box-${j}'>
        <div id="destinos-${j}" class="accordion-item"  data-drag-listener="true">
            <h2 class="accordion-header" id="heading-destinos-${j}">
                <button id="destinos-titulo-${j}" class="accordion-button flex-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-destinos-${j}" aria-expanded="false" aria-controls="collapse-destinos-${j}" onclick="_processAccordion(${j})">
                    <span class="title-text" id="destinos-titulo-text-${j}">${_getTitulo(item)}</span>
                    <div class="icon-container new-box" style="display: ${item.novo ? 'block' : 'none'}">
                        <svg class="new" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 11.4 5.3" style="enable-background:new 0 0 11.4 5.3;" xml:space="preserve" height="1em"> <style type="text/css"> .st0 { fill: none; }</style>
                            <path d="M11.4,4.8l-1.3-2.2l1.3-2.1c0.1-0.2,0-0.4-0.1-0.5c-0.1,0-0.1,0-0.2,0H0.7C0.3,0,0,0.3,0,0.7v4C0,5,0.3,5.3,0.7,5.3h10.4 c0.2,0,0.3-0.1,0.3-0.3C11.4,4.9,11.4,4.9,11.4,4.8 M3.5,3.7H3.1L2,2.3v1.5H1.7V1.7H2l1.1,1.5V1.7h0.4L3.5,3.7z M5.6,2H4.4v0.5h1.1 v0.3H4.4v0.5h1.2v0.3H4.1v-2h1.5L5.6,2z M8.4,3.7H8L7.5,2.2L7,3.7H6.6L5.9,1.7h0.4l0.4,1.5l0.5-1.5h0.4l0.5,1.5l0.4-1.5H9L8.4,3.7z" />
                            <path class="st0" d="M0-3.3h12v12H0V-3.3z" />
                        </svg>
                    </div>
                    <div class="icon-container" style="display: ${_isPlanned(id) ? 'block' : 'none'}">
                        <i class="iconify planejado" data-icon="fa-solid:check"></i>
                    </div>
                    <div class="icon-container" style="display: ${item.nota ? 'block' : 'none'}">
                        <i class="iconify nota ${_getNotaClass(item)}" data-icon="${_getNotaIcon(item)}"></i>
                    </div>
                </button>
            </h2>
            <div id="collapse-destinos-${j}" class="accordion-collapse collapse" aria-labelledby="heading-destinos-${j}" data-bs-parent="#destinos-box">
                ${_getDestinosBoxHTML(params)}
            </div>
        </div>
    </div>`;
}

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