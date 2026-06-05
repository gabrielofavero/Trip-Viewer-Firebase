function _getDescriptionHTML(categoria, j) {
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

function _setDescription(categoria, j, descricao) {
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		if (input) {
			input.value = descricao[lang] || "";
		}
	}
}

function _updateDescriptionButtonLabel(categoria, j) {
	const button = getID(`${categoria}-descricao-button-${j}`);
	const text = _getDescriptionLabel(categoria, j);
	button.innerText = text;
}

function _getDescriptionLabel(categoria, j) {
	if (!_isDescriptionPreset(categoria, j)) {
		return translate("labels.description.add");
	}

	const description = _getDescription(categoria, j);
	const lang = _getUserLanguage();
	return description[lang] || translate("labels.description.edit");
}

function _isDescriptionPreset(categoria, j) {
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		if (input && input.value.trim() !== "") {
			return true;
		}
	}
	return false;
}

function _getDescription(categoria, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`${categoria}-descricao-${lang}-${j}`);
		description[lang] = input ? input.value.trim() : "";
	}
	return description;
}

function _openDescriptionModal(categoria, j) {
	const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
	const defaultTitle = _isDescriptionPreset(categoria, j)
		? translate("labels.description.edit")
		: translate("labels.description.add");
	propriedades.titulo = getID(`${categoria}-nome-${j}`).value || defaultTitle;
	propriedades.containers = _getContainersInput();
	propriedades.conteudo = _getDescriptionContent(categoria);
	propriedades.botoes = [
		{
			tipo: "cancelar",
		},
		{
			tipo: "confirmar",
			acao: `_saveDescription('${categoria}', ${j})`,
		},
	];

	_displayFullMessage(propriedades);

	if (!_isDescriptionPreset(categoria, j)) {
		return;
	}

	_loadDescriptionInputs(categoria, j);
	getID("description-language-select").addEventListener(
		"change",
		_descriptionSelectChangeAction,
	);
}

function _getDescriptionContent(categoria) {
	const selectedLanguage = _getUserLanguage();
	const translation = CONFIG.destinos.translation[categoria];
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
                ${_getSelectOptionsHTML(languages, selectedLanguage)}
            </select>
        </div>

        ${_getDescriptionContainers(languages, placeholders)}
    </div>`;

	function _getDescriptionContainers(languages, placeholders) {
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

function _loadDescriptionInputs(categoria, j) {
	const description = _getDescription(categoria, j);
	for (const lang in description) {
		const input = getID(`description-${lang}`);
		if (input) {
			input.value = description[lang];
		}
	}
}

function _saveDescription(categoria, j) {
	const description = {};
	for (const lang of LANGUAGES) {
		const input = getID(`description-${lang}`);
		if (input) {
			description[lang] = _firstCharToUpperCase(input.value.trim());
		}
	}
	_setDescription(categoria, j, description);
	_updateDescriptionButtonLabel(categoria, j);
	_closeMessage();
}

function _descriptionSelectChangeAction() {
	const value = getID("description-language-select").value;
	for (const lang of LANGUAGES) {
		const container = getID(`description-container-${lang}`);
		if (container) {
			container.style.display = lang === value ? "block" : "none";
		}
	}
}

function _getAllDescriptions() {
	const result = {};
	for (const categoria of CONFIG.destinos.categorias.passeios) {
		result[categoria] = {};
		for (const childID of _getChildIDs(`${categoria}-box`)) {
			const j = _getJ(childID);
			const id = getID(`${categoria}-id-${j}`).value;
			const nome = getID(`${categoria}-nome-${j}`).value;
			const descricao = _getDescription(categoria, j);
			result[categoria][id] = {
				nome: nome,
				descricao: descricao,
			};
		}
	}
	return result;
}

function _updateAllDescriptions(data) {
	for (const categoria of CONFIG.destinos.categorias.passeios) {
		for (const childID of _getChildIDs(`${categoria}-box`)) {
			const j = _getJ(childID);
			const id = getID(`${categoria}-id-${j}`).value;
			if (data[categoria] && data[categoria][id]) {
				const descricao = data[categoria][id].descricao;
				_setDescription(categoria, j, descricao);
				_updateDescriptionButtonLabel(categoria, j);
			}
		}
	}
}

function _exportPTtranslations() {
	const result = {};
	const input = FIRESTORE_DESTINOS_DATA;

	for (const key in input) {
		if (Array.isArray(input[key])) {
			result[key] = input[key].map((item) => item?.descricao?.pt);
		}
	}

	console.log(result);
}

function _importPTtranslations(input, lang = "en") {
	const keys = ["lanches", "lojas", "restaurantes", "saidas", "turismo"];

	for (const key of keys) {
		for (let i = 0; i < FIRESTORE_DESTINOS_DATA[key].length; i++) {
			const item = FIRESTORE_DESTINOS_DATA[key][i];
			const descricao = item.descricao || {};
			descricao[lang] = input[key][i];
			item.descricao = descricao;
		}
	}
}
