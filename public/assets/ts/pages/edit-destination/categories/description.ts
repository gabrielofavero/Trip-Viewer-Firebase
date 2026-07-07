import { getDestinations } from '../../../app/config.js';
import { cloneObject, firstCharToUpperCase, getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { getUserLanguage, LANGUAGES, translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { getSelectOptionsHTML } from '../../../ui/fields.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';

export function getDescriptionHTML(category, j) {
	let content = '';

	for (const lang of LANGUAGES) {
		content += `
        <div class="nice-form-group" style="display: none">
            <label>${translate('labels.description.title')} (${lang}) <span class="opcional"> (${translate('labels.optional')})</span></label>
            <input id="${category}-description-${lang}-${j}" type="text" disabled />
        </div>`;
	}

	return content;
}

export function setDescription(category, j, description) {
	for (const lang of LANGUAGES) {
		const input = getID(`${category}-description-${lang}-${j}`);
		if (input) {
			input.value = description[lang] || '';
		}
	}
}

export function updateDescriptionButtonLabel(category, j) {
	const button = getID(`${category}-description-button-${j}`);
	const text = getDescriptionLabel(category, j);
	button.innerText = text;
}

function getDescriptionLabel(category, j) {
	if (!isDescriptionPreset(category, j)) {
		return translate('labels.description.add');
	}

	const description = getDescription(category, j);
	const lang = getUserLanguage();
	return description[lang] || translate('labels.description.edit');
}

function isDescriptionPreset(category, j) {
	for (const lang of LANGUAGES) {
		const input = getID(`${category}-description-${lang}-${j}`);
		if (input && input.value.trim() !== '') {
			return true;
		}
	}
	return false;
}

export function getDescription(category, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`${category}-description-${lang}-${j}`);
		description[lang] = input ? input.value.trim() : '';
	}
	return description;
}

export function openDescriptionModal(category, j) {
	const modalProperties = cloneObject(MESSAGE_PROPERTIES);
	const defaultTitle = isDescriptionPreset(category, j)
		? translate('labels.description.edit')
		: translate('labels.description.add');
	modalProperties.title = getID(`${category}-name-${j}`).value || defaultTitle;
	modalProperties.containers = getContainersInput();
	modalProperties.content = getDescriptionContent(category);
	modalProperties.botoes = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: `saveDescription('${category}', ${j})`,
		},
	];

	displayFullMessage(modalProperties);

	if (!isDescriptionPreset(category, j)) {
		return;
	}

	loadDescriptionInputs(category, j);
	getID('description-language-select').addEventListener('change', descriptionSelectChangeAction);
}

function getDescriptionContent(category) {
	const selectedLanguage = getUserLanguage();
	const translation = getDestinations().translation[category];
	const placeholders = {};
	const languages = {};

	for (const lang of LANGUAGES) {
		placeholders[lang] = translate(`destination.${translation}.placeholders.description.${lang}`);
		languages[lang] = translate(`labels.language.${lang}`);
	}

	return `
    <div>
        <div class="nice-form-group">
            <label>${translate('labels.language.title')}</label>
            <select id="description-language-select" class="form-control select">
                ${getSelectOptionsHTML(languages, selectedLanguage)}
            </select>
        </div>

        ${getDescriptionContainers(languages, placeholders)}
    </div>`;

	function getDescriptionContainers(languages, placeholders) {
		let result = '';
		for (const lang in languages) {
			const display = lang === selectedLanguage ? 'block' : 'none';
			result += `
            <div class="nice-form-group" id="description-container-${lang}" style="display:${display};">
                <label>${translate('labels.description.title')}</label>
                <textarea id="description-${lang}" rows="3"
                placeholder="${placeholders[lang]}"></textarea>
            </div>`;
		}
		return result;
	}
}

function loadDescriptionInputs(category, j) {
	const description = getDescription(category, j);
	for (const lang in description) {
		const input = getID(`description-${lang}`);
		if (input) {
			input.value = description[lang];
		}
	}
}

export function saveDescription(category, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`description-${lang}`);
		if (input) {
			description[lang] = firstCharToUpperCase(input.value.trim());
		}
	}
	setDescription(category, j, description);
	updateDescriptionButtonLabel(category, j);
	closeMessage();
}

function descriptionSelectChangeAction() {
	const value = getID('description-language-select').value;
	for (const lang of LANGUAGES) {
		const container = getID(`description-container-${lang}`);
		if (container) {
			container.style.display = lang === value ? 'block' : 'none';
		}
	}
}

function getAllDescriptions() {
	const result = {};
	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		result[category] = {};
		for (const childID of getChildIDs(`${category}-box`)) {
			const j = getJ(childID);
			const id = getID(`${category}-id-${j}`).value;
			const name = getID(`${category}-name-${j}`).value;
			const description = getDescription(category, j);
			result[category][id] = {
				name: name,
				description: description,
			};
		}
	}
	return result;
}

function updateAllDescriptions(data) {
	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		for (const childID of getChildIDs(`${category}-box`)) {
			const j = getJ(childID);
			const id = getID(`${category}-id-${j}`).value;
			if (data[category] && data[category][id]) {
				const description = data[category][id].description;
				setDescription(category, j, description);
				updateDescriptionButtonLabel(category, j);
			}
		}
	}
}

function exportPTtranslations() {
	const result = {};
	const input = FIRESTORE_DESTINATIONS_DATA;

	for (const key in input) {
		if (Array.isArray(input[key])) {
			result[key] = input[key].map((item) => item?.description?.pt);
		}
	}

	console.log(result);
}

function importPTtranslations(input, lang = 'en') {
	const keys = ['snacks', 'shopping', 'restaurants', 'nightlife', 'tourism'];

	for (const key of keys) {
		const categoryData = FIRESTORE_DESTINATIONS_DATA?.[key];
		if (!categoryData) continue;
		for (let i = 0; i < categoryData.length; i++) {
			const item = categoryData[i];
			const description = item.description || {};
			description[lang] = input[key][i];
			item.description = description;
		}
	}
}
