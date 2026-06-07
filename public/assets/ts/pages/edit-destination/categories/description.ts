import { getDestinations } from '../../../app/config.js';
import { cloneObject, firstCharToUpperCase, getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { getUserLanguage, LANGUAGES, translate } from '../../../i18n/translation.js';
import { closeMessage, displayFullMessage, getContainersInput, MESSAGE_PROPERTIES } from '../../../utils/messages.js';
import { getSelectOptionsHTML } from "../../../ui/fields.js";
import { FIRESTORE_DESTINATIONS_DATA } from '../../../data/state.js';

export function getDescriptionHTML(categoria, j) {
	let content = "";

	for (const lang of LANGUAGES) {
		content += `
        <div class="nice-form-group" style="display: none">
            <label>${translate("labels.description.title")} (${lang}) <span class="opcional"> (${translate("labels.optional")})</span></label>
            <input id="${categoria}-descricao-${lang}-${j}" type="text" disabled />
        </div>`;
	}

	return content;
}

export function setDescription(categoria, j, descricao) {
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		if (input) {
			input.value = descricao[lang] || "";
		}
	}
}

export function updateDescriptionButtonLabel(categoria, j) {
	const button = getID(`${categoria}-descricao-button-${j}`);
	const text = getDescriptionLabel(categoria, j);
	button.innerText = text;
}

function getDescriptionLabel(categoria, j) {
	if (!isDescriptionPreset(categoria, j)) {
		return translate("labels.description.add");
	}

	const description = getDescription(categoria, j);
	const lang = getUserLanguage();
	return description[lang] || translate("labels.description.edit");
}

function isDescriptionPreset(categoria, j) {
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		if (input && input.value.trim() !== "") {
			return true;
		}
	}
	return false;
}

export function getDescription(categoria, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		description[lang] = input ? input.value.trim() : "";
	}
	return description;
}

export function openDescriptionModal(categoria, j) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	const defaultTitle = isDescriptionPreset(categoria, j)
		? translate("labels.description.edit")
		: translate("labels.description.add");
	propriedades.titulo = getID(`${categoria}-nome-${j}`).value || defaultTitle;
	propriedades.containers = getContainersInput();
	propriedades.conteudo = getDescriptionContent(categoria);
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `saveDescription('${categoria}', ${j})`,
		},
	];

	displayFullMessage(propriedades);

	if (!isDescriptionPreset(categoria, j)) {
		return;
	}

	loadDescriptionInputs(categoria, j);
	getID("description-language-select").addEventListener(
		"change",
		descriptionSelectChangeAction,
	);
}

function getDescriptionContent(categoria) {
	const selectedLanguage = getUserLanguage();
	const translation = getDestinations().translation[categoria];
	const placeholders = {};
	const languages = {};

	for (const lang of LANGUAGES) {
		placeholders[lang] = translate(
			`destination.${translation}.placeholders.description.${lang}`,
		);
		languages[lang] = translate(`labels.language.${lang}`);
	}

	return `
    <div>
        <div class="nice-form-group">
            <label>${translate("labels.language.title")}</label>
            <select id="description-language-select" class="form-control select">
                ${getSelectOptionsHTML(languages, selectedLanguage)}
            </select>
        </div>

        ${getDescriptionContainers(languages, placeholders)}
    </div>`;

	function getDescriptionContainers(languages, placeholders) {
		let result = "";
		for (const lang in languages) {
			const display = lang === selectedLanguage ? "block" : "none";
			result += `
            <div class="nice-form-group" id="description-container-${lang}" style="display:${display};">
                <label>${translate("labels.description.title")}</label>
                <textarea id="description-${lang}" rows="3"
                placeholder="${placeholders[lang]}"></textarea>
            </div>`;
		}
		return result;
	}
}

function loadDescriptionInputs(categoria, j) {
	const description = getDescription(categoria, j);
	for (const lang in description) {
		const input = getID(`description-${lang}`);
		if (input) {
			input.value = description[lang];
		}
	}
}

function saveDescription(categoria, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`description-${lang}`);
		if (input) {
			description[lang] = firstCharToUpperCase(input.value.trim());
		}
	}
	setDescription(categoria, j, description);
	updateDescriptionButtonLabel(categoria, j);
	closeMessage();
}

function descriptionSelectChangeAction() {
	const value = getID("description-language-select").value;
	for (const lang of LANGUAGES) {
		const container = getID(`description-container-${lang}`);
		if (container) {
			container.style.display = lang === value ? "block" : "none";
		}
	}
}

function getAllDescriptions() {
	const result = {};
	const destinos = getDestinations();
	for (const categoria of destinos.categorias.passeios) {
		result[categoria] = {};
		for (const childID of getChildIDs(`${categoria}-box`)) {
			const j = getJ(childID);
			const id = getID(`${categoria}-id-${j}`).value;
			const nome = getID(`${categoria}-nome-${j}`).value;
			const descricao = getDescription(categoria, j);
			result[categoria][id] = {
				nome: nome,
				descricao: descricao,
			};
		}
	}
	return result;
}

function updateAllDescriptions(data) {
	const destinos = getDestinations();
	for (const categoria of destinos.categorias.passeios) {
		for (const childID of getChildIDs(`${categoria}-box`)) {
			const j = getJ(childID);
			const id = getID(`${categoria}-id-${j}`).value;
			if (data[categoria] && data[categoria][id]) {
				const descricao = data[categoria][id].descricao;
				setDescription(categoria, j, descricao);
				updateDescriptionButtonLabel(categoria, j);
			}
		}
	}
}

function exportPTtranslations() {
	const result = {};
	const input = FIRESTORE_DESTINATIONS_DATA;

	for (const key in input) {
		if (Array.isArray(input[key])) {
			result[key] = input[key].map((item) => item?.descricao?.pt);
		}
	}

	console.log(result);
}

function importPTtranslations(input, lang = "en") {
	const keys = ["lanches", "lojas", "restaurantes", "saidas", "turismo"];

	for (const key of keys) {
		for (let i = 0; i < FIRESTORE_DESTINATIONS_DATA[key].length; i++) {
			const item = FIRESTORE_DESTINATIONS_DATA[key][i];
			const descricao = item.descricao || {};
			descricao[lang] = input[key][i];
			item.descricao = descricao;
		}
	}
}
