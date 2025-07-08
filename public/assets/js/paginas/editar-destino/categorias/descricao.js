
var DESCRIPTIONS = {};

function _addDescricao(categoria, i, descricao) {
    if (!DESCRIPTIONS[categoria]) {
        DESCRIPTIONS[categoria] = {};
    }
    DESCRIPTIONS[categoria][i] = descricao;
}

function _isDescriptionPreset(categoria, i) {
    const data = DESCRIPTIONS[categoria];

    if (!data || !data[i]) {
        return false;
    }

    let valueFound = false;
    for (const key in data[i]) {
        if (data[i][key]) {
            valueFound = true;
            break;
        }
    }

    return valueFound;
}

function _getDescriptionLabel(categoria, j) {
    return _isDescriptionPreset(categoria, j-1) ? translate('labels.description.edit') : translate('labels.description.add');
}

function _updateDescriptionButtonLabel(categoria, j) {
    const button = getID(`${categoria}-descricao-button-${j}`);
    if (!button) {
        console.warn(`Description button not found for category: ${categoria} and index: ${j}`);
        return;
    }
    const text = _getDescriptionLabel(categoria, j);
    button.innerText = text;
}

function _getDescription(categoria, j) {
    const descricao = DESCRIPTIONS[categoria][j-1];
    return descricao ? descricao : {};
}

function _openDescription(categoria, j) {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = _getDescriptionLabel(categoria, j);
    propriedades.containers = _getContainersInput();
    propriedades.conteudo = _getDescriptionContent(categoria);
    propriedades.botoes = [{
        tipo: 'cancelar',
    }, {
        tipo: 'confirmar',
        acao: `_saveDescription('${categoria}', ${j})`,
    }];

    _displayFullMessage(propriedades);

    if (!_isDescriptionPreset(categoria, j-1)) {
        return;
    }

    _loadDescriptionInputs(categoria, j);
    getID('description-language-select').addEventListener('change', _descriptionSelectChangeAction);
}

function _getDescriptionContent(categoria) {
    const selectedLanguage = _getUserLanguage();
    const translation = CONFIG.destinos.translation[categoria];
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
                ${_getSelectOptionsHTML(languages, selectedLanguage)}
            </select>
        </div>

        ${_getDescriptionContainers(languages, placeholders)}
    </div>`

    function _getDescriptionContainers(languages, placeholders, selected) {
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
            description[lang] = input.value.trim();
        }
    }
    _addDescricao(categoria, j-1, description);
    _closeMessage();
}

function _descriptionSelectChangeAction() {
    const value = getID('description-language-select').value;
    for (const lang of LANGUAGES) {
        const container = getID(`description-container-${lang}`);
        if (container) {
            container.style.display = lang === value ? 'block' : 'none';
        }
    }
}