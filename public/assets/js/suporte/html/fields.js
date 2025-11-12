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

    if (invalidFields.length > 0) {
        SUCCESSFUL_SAVE = false;
        getID('modal-inner-text').innerHTML = _getInvalidFieldsText(invalidFields, customChecks);
        _openModal();
        _stopLoadingScreen();
    }
}

function _getInvalidFieldsText(invalidFields, customChecks) {
    const dadosBasicos = ['titulo', 'moeda'];

    let intro = `${translate('messages.fields.invalid')}<br>`
    let title = '';
    let normalText = '';
    let customText = '';

    if (invalidFields.length > 0) {
        if (dadosBasicos.includes(invalidFields[0])) {
            title = translate('labels.basic_information')
            normalText += `<strong>${title}:</strong><br><ul>`
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
                normalText += `
                <li>
                    ${innerText || innerTitle}
                </li>`
            } else {
    
                if (innerTitle == 'Select') {
                    innerTitle = innerText.replace(/[0-9]/g, '').trim();
                }
    
                title = innerTitle
                normalText += `
                </ul><br>
                <strong>${title}:</strong><br>
                <ul>
                    <li>
                        ${innerText}
                    </li>`
            }
        }

        normalText += '</ul>';
    }

    if (customChecks.length > 0) {
        customText = '<strong>Outros:</strong><br><ul>'
        for (const check of customChecks) {
            customText += `
            <li>
                ${check}
            </li>`
        }
        customText += '</ul>';
    }

    const result = [intro, normalText, customText].join('<br>');
    return result;
}

function _reEdit(type, SUCCESSFUL_SAVE = true) {
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

    if (param && DOCUMENT_ID && SUCCESSFUL_SAVE) {
        window.location.href = `${url}?${param}=${DOCUMENT_ID}`;
    } else if (!SUCCESSFUL_SAVE) {
        _closeModal();
    } else {
        window.location.href = '../index.html';
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

    const title = translate('messages.fields.link.title', {icon: '<i class="iconify" data-icon="ic:twotone-link-off"></i>'});
    const content = translate('messages.fields.link.message');

    _openToast(`${title}: ${content}`);
}

function _validateMapLink(id) {
    const div = getID(id);
    const link = div.value;

    const isGoogleMaps = (link.includes('google') && link.includes('maps')) || link.includes('goo.gl/maps') || link.includes('maps.app.goo.gl');
    const isAppleMaps = link.includes('maps.apple.com');

    if (!link || (_isHttp(link) && (isGoogleMaps || isAppleMaps))) return;

    _closeAllSelects();
    div.value = '';

    const icon = '<i class="iconify" data-icon="hugeicons:maps"></i>'
    const googleMapsIcon = '<i class="iconify" data-icon="simple-icons:googlemaps"></i>'
    const appleMapsIcon = '<i class="iconify" data-icon="ic:baseline-apple"></i>'

    const title = translate('messages.fields.map_link.title', { icon });
    const content = translate('messages.fields.map_link.message', { googleMapsIcon, appleMapsIcon });

    _openToast(`${title}: ${content}`);
}

function _validateInstagramLink(id) {
    const div = getID(id);
    const link = div.value;

    if (!link || (_isHttp(link) && link.includes('instagram.com'))) return;

    div.value = '';

    const icon = '<i class="iconify" data-icon="mdi:instagram"></i>';
    
    const title = translate('messages.fields.instagram_link.title', { icon });
    const content = translate('messages.fields.instagram_link.message');

    _openToast(`${title}: ${content}`);
}

function _validateMediaLink(id) {
    const div = getID(id);
    const link = div.value;

    const validDomains = ['youtu.be/', 'youtube.com', 'tiktok.com', 'instagram.com/reel/', 'instagram.com/reels/', 'instagram.com/p/'];

    if (!link || (_isHttp(link) && validDomains.some(domain => link.includes(domain)))) {
        return;
    } else {
        div.value = '';
        const icon = '<i class="iconify" data-icon="ic:twotone-link-off"></i>';
        const tiktokIcon = '<i class="iconify" data-icon="cib:tiktok"></i>';
        const youtubeIcon = '<i class="iconify" data-icon="mdi:youtube"></i>';
        const instagramIcon = '<i class="iconify" data-icon="mdi:instagram"></i>';

        const title = translate('messages.fields.media_link.title', { icon });
        const content = translate('messages.fields.media_link.message', { youtubeIcon, tiktokIcon, instagramIcon });

        _openToast(`${title}: ${content}`);
    }
}

function _validateImageLink(id) {
    const div = getID(id);
    const imageLink = div.value;

    if (_isHttp(imageLink) && !imageLink.includes('pbs.twimg.com')) return;

    let icon = '';
    let title = '';
    let content = '';

    if (imageLink.includes('pbs.twimg.com')) {
        title = translate('messages.fields.twitter_link.title', {icon: '<i class="iconify" data-icon="mdi:twitter"></i>'});
        content = translate('messages.fields.twitter_link.message', {xIcon: '<i class="iconify" data-icon="fa6-brands:x-twitter"></i>'});
    } else {
        title = translate('messages.fields.link.title', {icon: '<i class="iconify" data-icon="ic:twotone-link-off"></i>'});
        content = translate('messages.fields.link.message');
    }

    _closeAllSelects();
    div.value = '';

    _openToast(`${title}: ${content}`);
}

function _getSelectOptionsHTML(object, selectedKey) {
    let result = '';
    for (const key in object) {
        const selected = (key == selectedKey) ? 'selected' : '';
        result += `<option value="${key}" ${selected}>${object[key]}</option>`;
    }
    return result;
}