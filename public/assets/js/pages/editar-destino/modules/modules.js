const VALORES_KEYS = ['-', '$', '$$', '$$$', '$$$$', 'default'];
const DESTINOS_CATEGORIAS = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas'];

var VALOR_OPTIONS = '';
var SELECT_REGIOES = {
    'restaurantes': [],
    'lanches': [],
    'saidas': [],
    'turismo': [],
    'lojas': []
}

// Moeda
function _loadCurrencySelects() {
    _loadMoedaOptions();

    for (const categoria of DESTINOS_CATEGORIAS) {
        const childs = _getChildIDs(`${categoria}-box`);
        for (const child of childs) {
            const i = child.split('-').pop();
            if (VALOR_OPTIONS) {
                const select = getID(`${categoria}-valor-${i}`);
                const value = select.value;
                select.innerHTML = VALOR_OPTIONS;
                select.value = value;
            } else {
                getID(`${categoria}-valor-${i}`).style.display = 'none';
                getID(`${categoria}-outro-valor-${i}`).style.display = 'none';
            }
        }
    }
}

function _loadMoedaOptions() {
    const moeda = getID('moeda').value;
    VALOR_OPTIONS = '';

    if (moeda != 'outra' && CONFIG.destinos.currency[moeda]) {
        for (const categoria of VALORES_KEYS) {
            VALOR_OPTIONS += `<option value="${categoria}">${CONFIG.destinos.currency[moeda][categoria]}</option>`;
        }
        if (VALOR_OPTIONS) {
            VALOR_OPTIONS += '<option value="outro">Outro</option>';
        }
    }
}

function _getValorVisibility() {
    if (VALOR_OPTIONS) return 'block';
    else return 'none';
}

function _getOutroValorVisibility() {
    if (VALOR_OPTIONS) return 'none';
    else return 'block';
}

function _loadMoedaValorAndVisibility(valor, categoria, i) {
    const valorSelect = getID(`${categoria}-valor-${i}`);
    const outroValorDiv = getID(`${categoria}-outro-valor-${i}`);

    const texts = Array.from(valorSelect.options).map(option => option.text);
    const values = Array.from(valorSelect.options).map(option => option.value);

    if (VALOR_OPTIONS && values.includes(valor)) {
        valorSelect.value = valor;
        outroValorDiv.style.display = 'none';
    } else if (VALOR_OPTIONS && texts.includes(valor)) {
        valorSelect.value = values[texts.indexOf(valor)];
        outroValorDiv.style.display = 'none';
    } else {
        valorSelect.value = 'outro';
        outroValorDiv.style.display = 'block';
        outroValorDiv.value = valor;
    }
}

// Região
function _regiaoSelectAction(categoria, init = false, updateLast = false) {
    let copy = SELECT_REGIOES[categoria];
    SELECT_REGIOES[categoria] = _getUpdatedDynamicSelectArray(categoria, 'regiao');
    _loadDynamicSelect(categoria, 'regiao', copy, SELECT_REGIOES[categoria], init, updateLast);
}

function _loadNewRegiaoSelect(categoria) {
    _regiaoSelectAction(categoria, false, true);
}

function _loadRegiaoListeners(i, categoria) {
    const select = getID(`${categoria}-regiao-select-${i}`);
    const input = getID(`${categoria}-regiao-${i}`);

    select.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
        if (select.value === 'outra') {
            input.style.display = 'block';
        }
    });

    input.addEventListener('change', function () {
        _regiaoSelectAction(categoria);
    });
}

// Validação de links
function _validateLink(i, categoria) {
    const div = getID(`${categoria}-link-${i}`);
    const link = div.value;

    if (link.startsWith('http://') || link.startsWith('https://')) return;

    const linkI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>'
    _displayMessage('Link Inválido ' + linkI, `O link fornecido não é válido. Certifique-se de que ele comece com "http://" ou "https://".`);
    div.value = '';
}

function _validateMediaLink(i, categoria) {
    const div = getID(`${categoria}-midia-${i}`);
    const link = div.value;

    const validDomains = ['spotify.com', 'youtu.be/', 'youtube.com', 'tiktok.com'];
    const ishttp = link.startsWith('http://') || link.startsWith('https://');

    if (!link || (ishttp && validDomains.some(domain => link.includes(domain)) && !link.includes('vm.tiktok.com'))) return;

    if (ishttp && link.includes("vm.tiktok")) {
        div.value = '';
        const tiktokI = '<i class="iconify" data-icon="cib:tiktok"></i>'
        const copyI = `<i class="iconify icon-button" style="margin-left: 5px" data-icon="ph:copy" onclick="_copyToClipboard('${link}')"></i>`;
        const copiedDiv = `<div id="copy-msg" class="hidden">Link copiado com sucesso</div>`;
        _displayMessage('Link de TikTok Inválido ' + tiktokI, `Você forneceu um link de TikTok Móvel (vm.tiktok.com), mas apenas links da versão web são suportados.<br><br>
                                                               Copie o seu link e cole em uma nova aba de seu navegador para obter o link correto.<br><br>
                                                               <input type="text" disabled="" style="width: auto" placeholder="${link}" value=""> ${copyI}
                                                               ${copiedDiv}`);
    } else {
        div.value = '';
        const linkI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>'
        const tiktokI = '<i class="iconify" data-icon="cib:tiktok"></i>'
        const spotifyI = '<i class="iconify" data-icon="mdi:spotify"></i>'
        const youtubeI = '<i class="iconify" data-icon="mdi:youtube"></i>'
        _displayMessage('Link Inválido ' + linkI, `O link fornecido não é válido. Certifique-se de que ele comece com "http://" ou "https://" e que seja de uma das seguintes plataformas: <br><br>
                                                   ${tiktokI} <strong>TikTok</strong> (Versão Web)<br>
                                                   ${youtubeI} <strong>Youtube</strong><br>
                                                   ${spotifyI} <strong>Spotify</strong>`);
    }
}