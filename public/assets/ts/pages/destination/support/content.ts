import { getCurrencies } from '../../../app/config.js';
import { LANGUAGES, translate } from '../../../i18n/translation.js';
import { getDescriptionValue } from '../../../models/destination.model.js';
import { getPriceValue } from '../../../models/destination.model.js';
import { getPeriod } from '../categories.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';
import { getDescriptionVisibility } from './visibility.js';
import { getPriceVisibility } from './visibility.js';

export function getDestinationsAccordionBodyHTML({
	j,
	item,
	values,
	currency,
	planned,
	editBtn = true,
}) {
	if (!values) {
		values =
			getCurrencies().scale[FIRESTORE_DESTINATIONS_DATA?.currency] ||
			getCurrencies().scale['BRL'];
	}

	if (!currency) {
		currency = FIRESTORE_DESTINATIONS_DATA?.currency || 'BRL';
	}

	// The edit button moved to the card shell (support/card-edit.ts, P5) — this
	// shared detail renderer no longer emits one. `editBtn` is kept in the
	// signature for backward compatibility with `getDestinationsBoxHTML`.
	const regions = getRegionsList(item);
	return `
        <div class="destinations-text">
            <div class="destinations-topic" style="display: ${planned ? 'block' : 'none'}">
                <i class="iconify color-icon" data-icon="fa-solid:check"></i>
                ${planned}
            </div>
            <div class="destinations-topic" style="display: ${regions.length ? 'block' : 'none'}">
                <i class="iconify color-icon" data-icon="mingcute:location-line"></i>
                ${getRegionsHTML(regions)}
            </div>
            <div class="destinations-topicos-box" style="display: block">
                <div class="destinations-topic" style="display: ${getPriceVisibility(item)}">
                    <i class="iconify color-icon" data-icon="bx:dollar"></i>
                    ${getPriceValue(item, values, currency)}
                </div>
            </div>
            <div class="destinations-description" style="display: ${getDescriptionVisibility(item)}">
                ${getDescriptionValue(item)}
            </div>
        </div>`;
}

export function getEditHTML(j) {
	return `
        <div class="edit-close-container">
            <button id="close-btn-${j}" class="close-btn">✕</button>
        </div>
        <div class="edit-title-container">
             <input required id="edit-name-${j}" class="edit-input name" type="text" placeholder="${translate('labels.name')}" />
             <input id="edit-emoji-${j}" class="edit-input emoji" type="text" placeholder="😁" />
        </div>
        <div class="edit-column-container">
            <div class="edit-double-container aligned">
                <div id="edit-rating-icon-${j}">
                    <i class="iconify rating-no-margin rating-absent" data-icon="ic:outline-question-mark"></i>
                </div>
                <select class="edit-input" id="edit-rating-${j}">
                    <option value="default">${translate(`destination.scores.default`)}</option>
                    <option value="5">${translate(`destination.scores.5`)}</option>
                    <option value="4">${translate(`destination.scores.4`)}</option>
                    <option value="3">${translate(`destination.scores.3`)}</option>
                    <option value="2">${translate(`destination.scores.2`)}</option>
                    <option value="1">${translate(`destination.scores.1`)}</option>
                </select>
            </div>
            <div class="edit-double-container" id="edit-planned-container-${j}" style="display: none;"}>
                <i class="iconify color-icon edit" data-icon="fa-solid:check"></i>
                <div class="edit-column-container">
                    <select class="edit-input" id="edit-planned-select-data-${j}"></select>
                    <select class="edit-input" id="edit-planned-select-period-${j}">
                        <option value="early_morning">${getPeriod('early_morning')}</option>
                        <option value="morning">${getPeriod('morning')}</option>
                        <option value="afternoon">${getPeriod('afternoon')}</option>
                        <option value="night">${getPeriod('night')}</option>
                    </select>
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="f7:map"></i>
                <div class="edit-column-container">
                    <input id="edit-map-${j}" class="edit-input" type="text" placeholder="${translate('labels.customization.links.map')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="ri:instagram-line"></i>
                <div class="edit-column-container">
                    <input id="edit-instagram-${j}" class="edit-input" type="text" placeholder="${translate('labels.social.instagram')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="tabler:world"></i>
                <div class="edit-column-container">
                    <input id="edit-website-${j}" class="edit-input" type="text" placeholder="${translate('labels.social.website')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="mingcute:location-line"></i>
                <div class="edit-column-container">
                    <div class="region-pills" id="edit-regions-${j}"></div>
                    <select class="edit-input" id="edit-region-select-${j}" style="display: none"></select>
                    <input id="edit-region-input-${j}" style="display: none" class="edit-input" type="text" placeholder="${translate('labels.region')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="bx:dollar"></i>
                <div class="edit-column-container">
                    <select class="edit-input" id="edit-price-select-${j}">
                        <option value="default">${translate('destination.price.default')}</option>
                        <option value="-">${translate('destination.price.free')}</option>
                        ${getValuesOptionsHTML()}
                        <option value="custom">${translate('labels.custom')}</option>
                    </select>
                    <input id="edit-price-input-${j}" style="display: none" class="edit-input" type="text" placeholder="${translate('labels.cost')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-double-container" id="edit-description-container-${j}">
                <i class="iconify color-icon edit" data-icon="tabler:edit"></i>
                <div class="edit-column-container">
                    <select class="edit-input" id="edit-description-lang-${j}">
                        ${getDescriptionLanguageOptionsHTML()}
                    </select>
                    <textarea id="edit-description-en-${j}" class="edit-input edit-textarea description-textarea" type="text" placeholder="${translate('labels.description.title')} (${translate('labels.optional')})"></textarea>
                    <textarea id="edit-description-pt-${j}" class="edit-input edit-textarea description-textarea" type="text" placeholder="${translate('labels.description.title')} (${translate('labels.optional')})"></textarea>
                </div>
            </div>
            <div class="edit-double-container">
                <i class="iconify color-icon edit" data-icon="lets-icons:video-fill"></i>
                <div class="edit-column-container">
                    <input id="edit-media-${j}" class="edit-input" type="text" placeholder="${translate('labels.video')} (${translate('labels.optional')})" />
                </div>
            </div>
            <div class="edit-button-container">
                <button class="edit-btn" id="edit-delete-${j}">
                    <i class="iconify color-icon edit" data-icon="material-symbols:delete-outline-rounded"></i>
                </button>
                <button class="edit-btn" id="edit-save-${j}">
                        <i class="iconify color-icon edit" data-icon="material-symbols:save-outline"></i>
                </button>
            </div>
        </div>`;
}

function getRegionsList(item) {
	if (Array.isArray(item?.regions)) {
		return item.regions
			.map((region: unknown) => (region == null ? '' : String(region).trim()))
			.filter(Boolean);
	}
	if (item?.region) return [item.region];
	return [];
}

/** Single region → plain text (unchanged); multiple → pill list. */
function getRegionsHTML(regions: string[]): string {
	if (regions.length <= 1) return escapeHtml(regions[0] || '');
	return `<span class="region-pills">${regions
		.map((region) => `<span class="region-pill">${escapeHtml(region)}</span>`)
		.join('')}</span>`;
}

function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function getValuesOptionsHTML() {
	const currencies =
		getCurrencies().scale[FIRESTORE_DESTINATIONS_DATA?.currency] || getCurrencies().scale['BRL'];
	return `
        <option value="$">${currencies['$']}</option>
        <option value="$$">${currencies['$$']}</option>
        <option value="$$$">${currencies['$$$']}</option>
        <option value="$$$$">${translate('destination.price.max', { value: currencies['$$$$'] })}</option>`;
}

function getDescriptionLanguageOptionsHTML() {
	let optionsHTML = '';
	for (const key of LANGUAGES) {
		const lang = translate(`labels.language.${key}`);
		optionsHTML += `<option value="${key}">${translate('labels.description.lang', { lang })}</option>`;
	}
	return optionsHTML;
}
