import { DOCUMENT_ID } from "../firebase/database";
import { setSuccessfulSave } from "../../main/app.js";
import { getID } from "../pages/selectors.js";
import { stopLoadingScreen } from "../pages/loading.js";
import { firstCharToUpperCase } from "../pages/data/data.js";
import { displayMessage, openToast } from "../pages/messages.js";
import { closeModal, openModal } from "../styles/modal.js";

// Required Fields
export function validateRequiredFields(customChecks = []) {
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
        setSuccessfulSave(false)
        getID('modal-inner-text').innerHTML = getInvalidFieldsText(invalidFields, customChecks);
        openModal();
        stopLoadingScreen();
    }
}

export function setRequired(id) {
    const div = getID(id);
    if (div) {
        div.setAttribute('required', "");
    }
}

export function removeRequired(id) {
    const div = getID(id);
    if (div) {
        div.removeAttribute('required');
    }
}


function getInvalidFieldsText(invalidFields, customChecks) {
    const dadosBasicos = ['titulo', 'moeda'];

    let intro = 'Os seguintes campos obrigatórios não foram preenchidos:<br>'
    let title = '';
    let normalText = '';
    let customText = '';

    if (invalidFields.length > 0) {
        if (dadosBasicos.includes(invalidFields[0])) {
            title = 'Dados Básicos'
            normalText += `<strong>${title}:</strong><br><ul>`
        }

        for (const id of invalidFields) {
            const label = getID(id + '-label');
            const idSplit = id.split('-');

            let innerTitle = title;
            let innerText = "";

            if (label && label.innerText) {
                const lastChar = id[id.length - 1];

                innerTitle = firstCharToUpperCase(idSplit[0]);
                innerText = label.innerText;

                if (!isNaN(lastChar)) {
                    let position = idSplit[idSplit.length - 1];
                    const typeTitle = getID(`${innerTitle}-title-${position}`);
                    if (typeTitle && typeTitle.innerText) {
                        innerTitle = typeTitle.innerText;
                    }
                }
            } else {
                innerTitle = firstCharToUpperCase(idSplit[0])
                innerText = getFieldText(idSplit);
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

export function editFieldAgain(type, successfulSave = true) {
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

    if (param && DOCUMENT_ID && successfulSave) {
        window.location.href = `${url}?${param}=${DOCUMENT_ID}`;
    } else if (!successfulSave) {
        closeModal();
    } else {
        window.location.href = '../index.html';
    }
}

function getFieldText(idSplit) {
    let innerText = '';
    for (let i = 1; i < idSplit.length; i++) {
        innerText += firstCharToUpperCase(idSplit[i]) + " ";
    }
    return innerText.trim();
}

export function getFieldValueOrNotify(id) {
    const field = getID(id);
    if (!field.value) {
        field.reportValidity();
        return null;
    }
    return field.value;
}

// Selects
function closeAllSelects(excludeElement) {
    var selectElements = document.getElementsByTagName('select');
    for (var i = 0; i < selectElements.length; i++) {
        var select = selectElements[i];
        if (select !== excludeElement && select.hasAttribute('open')) {
            select.removeAttribute('open');
        }
    }
}

export function getSelectCurrentLabel(select) {
    return select.options[select.selectedIndex].innerText;
}

export function addValueToSelectIfExists(value, select) {
    if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
            select.value = value;
        }
    }
}

export function getAllValuesFromSelect(select) {
    var values = [];
    for (var i = 0; i < select.options.length; i++) {
        values.push(select.options[i].value);
    }
    return values;
}


// Link Validation
function isHttp(link) {
    return link.startsWith('http://') || link.startsWith('https://');
}

export function validateLink(id) {
    const div = getID(id);
    const link = div.value;

    if (!link || isHttp(link)) return;

    closeAllSelects();
    div.value = '';

    const genericI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>';
    title = translate('messages.error.invalid_link.generic.title', { genericI });
    content = translate('messages.error.invalid_link.generic.content');

    openToast(`${title}: ${content}`);
}

export function validateMapLink(id) {
    const div = getID(id);
    const link = div.value;

    const isGoogleMaps = (link.includes('google') && link.includes('maps')) || link.includes('goo.gl/maps') || link.includes('maps.app.goo.gl');
    const isAppleMaps = link.includes('maps.apple.com');

    if (!link || (isHttp(link) && (isGoogleMaps || isAppleMaps))) return;

    closeAllSelects();
    div.value = '';

    const mapsI = '<i class="iconify" data-icon="hugeicons:maps"></i>'
    const googleMapsI = '<i class="iconify" data-icon="simple-icons:googlemaps"></i>'
    const appleMapsI = '<i class="iconify" data-icon="ic:baseline-apple"></i>'
    
    const title = translate('messages.error.invalid_link.map.title', { mapsI });
    const content = translate('messages.error.invalid_link.map.content', { googleMapsI, appleMapsI});
    displayMessage(title, content);
}

export function validateInstagramLink(id) {
    const div = getID(id);
    const link = div.value;

    if (!link || (isHttp(link) && link.includes('instagram.com'))) return;

    div.value = '';

    const linkI = '<i class="iconify" data-icon="mdi:instagram"></i>';

    const title = translate('messages.error.invalid_link.instagram.title', { linkI });
    const content = translate('messages.error.invalid_link.instagram.content');
    displayMessage(title, content);
}

export function validateMediaLink(id) {
    const div = getID(id);
    const link = div.value;

    const validDomains = ['youtu.be/', 'youtube.com', 'tiktok.com', 'instagram.com/reel/', 'instagram.com/reels/', 'instagram.com/p/'];

    if (!link || (isHttp(link) && validDomains.some(domain => link.includes(domain)))) {
        return;
    } else {
        div.value = '';
        const linkI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>'
        const tiktokI = '<i class="iconify" data-icon="cib:tiktok"></i>'
        const youtubeI = '<i class="iconify" data-icon="mdi:youtube"></i>'
        const instagramI = '<i class="iconify" data-icon="mdi:instagram"></i>'

        const title = translate('messages.error.invalid_link.media.title', { linkI });
        const content = translate('messages.error.invalid_link.media.content', { tiktokI, youtubeI, instagramI });
        displayMessage(title, content);
    }
}

export function validateImageLink(id) {
    const div = getID(id);
    const imageLink = div.value;

    if (isHttp(imageLink) && !imageLink.includes('pbs.twimg.com')) return;

    let title = '';
    let content = '';

    if (imageLink.includes('pbs.twimg.com')) {
        const twitterI = '<i class="iconify" data-icon="mdi:twitter"></i>'
        const xI = '<i class="iconify" data-icon="fa6-brands:x-twitter"></i>'
        title = translate('messages.error.invalid_link.twitter_image.title', { twitterI });
        content = translate('messages.error.invalid_link.twitter_image.content', { xI });;
    } else {
        const genericI = '<i class="iconify" data-icon="ic:twotone-link-off"></i>';
        title = translate('messages.error.invalid_link.generic.title', { genericI });
        content = translate('messages.error.invalid_link.generic.content');
    }

    closeAllSelects();
    div.value = '';

    displayMessage(title, content);
}

export function getSelectOptionsHTML(object, selectedKey) {
    let result = '';
    for (const key in object) {
        const selected = (key == selectedKey) ? 'selected' : '';
        result += `<option value="${key}" ${selected}>${object[key]}</option>`;
    }
    return result;
}