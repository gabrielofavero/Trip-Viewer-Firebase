// Required Fields
function _validateRequiredFields(customChecks=[]) {
    var invalidFields = [];

    var inputs = document.querySelectorAll('input[required]');
    var selects = document.querySelectorAll('select[required]');
    var fields = Array.from(inputs).concat(Array.from(selects));

    fields.forEach(function (field) {
        const value = field.value.trim();
        if (value == '' || value == 'selecione' || value == 'outra') {
            invalidFields.push(field.id);
        }
    });

    if (customChecks && customChecks instanceof Array && customChecks.length > 0) {
        invalidFields.concat(customChecks);
    }

    if (invalidFields.length > 0) {
        WAS_SAVED = false;
        getID('modal-inner-text').innerHTML = _getInvalidFieldsText(invalidFields);
        _openModal();
        _stopLoadingScreen();
    }
}

function _getInvalidFieldsText(invalidFields) {
    const dadosBasicos = ['titulo', 'moeda'];

    let text = 'Os seguintes campos obrigatórios não foram preenchidos:<br><br>'
    let title = '';

    if (dadosBasicos.includes(invalidFields[0])) {
        title = 'Dados Básicos'
        text += `<strong>${title}:</strong><br><ul>`
    }

    for (const id of invalidFields) {
        const label = getID(id + '-label');
        const idSplit = id.split('-');

        let innerTitle = title;
        let innerText = "";

        if (label && label.innerText) {
            const lastChar = id[id.length - 1];

            innerTitle = _firstCharToUpperCase(idSplit[0]);
            innerText = label.innerText;

            if (!isNaN(lastChar)) {
                let position = idSplit[idSplit.length - 1];
                const typeTitle = getID(`${innerTitle}-title-${position}`);
                if (typeTitle && typeTitle.innerText) {
                    innerTitle = typeTitle.innerText;
                }
            }
        } else {
            innerTitle = _firstCharToUpperCase(idSplit[0])
            innerText = _getInnerText(idSplit);
        }

        if (title == innerTitle || dadosBasicos.includes(id)) {
            text += `
            <li>
                ${innerText || innerTitle}
            </li>`
        } else {

            if (innerTitle == 'Select') {
                innerTitle = innerText.replace(/[0-9]/g, '').trim();
            }

            title = innerTitle
            text += `
            </ul><br>
            <strong>${title}:</strong><br>
            <ul>
                <li>
                    ${innerText}
                </li>`
        }


    }
    return text + '</ul>';
}

function _reEdit(type, WAS_SAVED = true) {
    let param;
    let url;

    if (type == 'viagens') {
        param = 'v';
        url = 'trip.html';
    } else if (type == 'destinos') {
        param = 'd';
        url = 'destination.html';
    } else if (type == 'listagens') {
        param = 'l';
        url = 'listing.html';
    }

    if (param && DOCUMENT_ID && WAS_SAVED) {
        window.location.href = `${url}?${param}=${DOCUMENT_ID}`;
    } else if (!WAS_SAVED) {
        _closeModal();
    } else {
        window.location.href = 'index.html';
    }
}

function _getInnerText(idSplit) {
    let innerText = '';
    for (let i = 1; i < idSplit.length; i++) {
        innerText += _firstCharToUpperCase(idSplit[i]) + " ";
    }
    return innerText.trim();
}

function _notifyFieldIfAbsent(id) {
    const field = getID(id);
    if (!field.value) {
        field.reportValidity();
    }
}

function _getFieldValueOrNotify(id) {
    const field = getID(id);
    if (!field.value) {
        field.reportValidity();
        return null;
    }
    return field.value;
}

// Selects
function _closeAllSelects(excludeElement) {
    var selectElements = document.getElementsByTagName('select');
    for (var i = 0; i < selectElements.length; i++) {
        var select = selectElements[i];
        if (select !== excludeElement && select.hasAttribute('open')) {
            select.removeAttribute('open');
        }
    }
}

function _getSelectCurrentLabel(select) {
    return select.options[select.selectedIndex].innerText;
}

function _addValueToSelectIfExists(value, select) {
    if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            select.value = value;
        }
    }
}

function _getAllValuesFromSelect(select) {
    var values = [];
    for (var i = 0; i < select.options.length; i++) {
        values.push(select.options[i].value);
    }
    return values;
}

// Validação de links
function _isHttp(link) {
    return link.startsWith('http://') || link.startsWith('https://');
}

function _validateLink(id) {
    const div = getID(id);
    const link = div.value;

    if (!link || _isHttp(link)) return;

    _closeAllSelects();
    div.value = '';

    _displayMessage('Link Inválido <i class="iconify" data-icon="ic:twotone-link-off"></i>',
        `O link fornecido não é válido. Certifique-se de que ele comece com "http://" ou "https://".`);
}

function _validateMapLink(id) {
    const div = getID(id);
    const link = div.value;

    const isGoogleMaps = (link.includes('google') && link.includes('maps')) || link.includes('goo.gl/maps') || link.includes('maps.app.goo.gl');
    const isAppleMaps = link.includes('maps.apple.com');

    if (!link || (_isHttp(link) && (isGoogleMaps || isAppleMaps))) return;

    _closeAllSelects();
    div.value = '';

    const mapsI = '<i class="iconify" data-icon="hugeicons:maps"></i>'
    const googleMapsI = '<i class="iconify" data-icon="simple-icons:googlemaps"></i>'
    const appleMapsI = '<i class="iconify" data-icon="ic:baseline-apple"></i>'
    _displayMessage('Link de Mapa Inválido ' + mapsI, `O link de mapa fornecido não é válido. Certifique-se de que o link comece com "http://" ou "https://" e que seja de uma das seguintes plataformas: <br><br>
                                               ${googleMapsI} <strong>Google Maps</strong><br>
                                               ${appleMapsI} <strong>Apple Maps</strong><br>`);
}

function _validateInstagramLink(id) {
    const div = getID(id);
    const link = div.value;

    if (!link || (_isHttp(link) && link.includes('instagram.com'))) return;

    div.value = '';

    const linkI = '<i class="iconify" data-icon="mdi:instagram"></i>';
    _displayMessage('Link do Instagram Inválido ' + linkI, `O link fornecido não é válido. Certifique-se de que ele comece com "https://www.instagram.com".`);
}

function _validateMediaLink(id) {
    const div = getID(id);
    const link = div.value;

    const validDomains = ['youtu.be/', 'youtube.com', 'tiktok.com', 'instagram.com/reel/', 'instagram.com/reels/', 'instagram.com/p/'];

    if (!link || (_isHttp(link) && validDomains.some(domain => link.includes(domain)))) {
        return;
    } else {
        div.value = '';
        const linkI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>'
        const tiktokI = '<i class="iconify" data-icon="cib:tiktok"></i>'
        const youtubeI = '<i class="iconify" data-icon="mdi:youtube"></i>'
        const instagramI = '<i class="iconify" data-icon="mdi:instagram"></i>'
        _displayMessage('Link Inválido ' + linkI, `O link fornecido não é válido. Certifique-se de que ele comece com "http://" ou "https://" e que seja de uma das seguintes plataformas: <br><br>
                                                   ${tiktokI} <strong>TikTok</strong><br>
                                                   ${youtubeI} <strong>Youtube</strong><br>
                                                   ${instagramI} <strong>Instagram Reels</strong>`);
    }
}

function _validatePlaylistLink(id) {
    const div = getID(id);
    const link = div.value;

    const validDomains = ['spotify.com'];

    if (!link || (_isHttp(link) && validDomains.some(domain => link.includes(domain)))) return;

    div.value = '';

    const linkI = '<i class="iconify" data-icon="ic:baseline-music-off"></i>';
    const spotifyI = '<i class="iconify" data-icon="mdi:spotify"></i>';
    _displayMessage('Playlist / Página do Artista Inválida ' + linkI, `A playlist ou Página do do Artista fornecida não é válida. Certifique-se de que o link comece com "http://" ou "https://" e que seja de uma das seguintes plataformas: <br><br>
                                               ${spotifyI} <strong>Spotify</strong>`);
}

function _validateImageLink(id) {
    const div = getID(id);
    const imageLink = div.value;

    if (_isHttp(imageLink) && !imageLink.includes('pbs.twimg.com')) return;

    let title = '';
    let content = '';

    if (imageLink.includes('pbs.twimg.com')) {
        title = 'Imagem do Twitter Inválida <i class="iconify" data-icon="mdi:twitter"></i>';
        content = `O sistema não suporta imagens vindas do Twitter (Vulgo <i class="iconify" data-icon="fa6-brands:x-twitter"></i> se você for uma pessoa chata).<br><br> 
                   Por favor, utilize outra fonte externa para suas imagens.`;
    } else {
        title = 'Link Inválido <i class="iconify" data-icon="ic:twotone-link-off"></i>';
        content = `O link fornecido não é válido. Certifique-se de que ele comece com "http://" ou "https://".`;
    }

    _closeAllSelects();
    div.value = '';

    _displayMessage(title, content);
}