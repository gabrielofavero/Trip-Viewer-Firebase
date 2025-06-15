var HOSPEDAGEM_IMAGENS = {};

function _getHospedagemImages(j) {
    const result = [];
    for (const imagem of HOSPEDAGEM_IMAGENS[j]) {
        if (imagem.file) {
            CUSTOM_UPLOADS.hospedagens.push(imagem);
        }
        result.push({
            descricao: imagem.descricao,
            link: imagem.link
        });
    }
    return result;
}

function _loadCheckIn(hospedagem, j) {
    _loadHospeagemCheck('checkin', 'in', hospedagem, j);
}

function _loadCheckOut(hospedagem, j) {
    _loadHospeagemCheck('checkout', 'out', hospedagem, j);
}

function _loadHospeagemCheck(chave, checkTipo, hospedagem, j) {
    const data = _convertFromDateObject(hospedagem.datas[chave]);
    if (data) {
        getID(`check-${checkTipo}-${j}`).value = _getDateString(data, 'yyyy-mm-dd');
        getID(`check-${checkTipo}-horario-${j}`).value = _getTimeString(data);
    }
}

// Listener
function _loadHospedagemListeners(j) {
    // Validação de Link
    getID(`reserva-hospedagens-link-${j}`).addEventListener('change', () => _validateLink(`reserva-hospedagens-link-${j}`));

    // Nome
    getID(`hospedagens-nome-${j}`).addEventListener('change', function () {
        if (getID(`hospedagens-nome-${j}`).value) {
            getID(`hospedagens-title-${j}`).innerText = getID(`hospedagens-nome-${j}`).value;
        }
    });
}

function _hospedagensAdicionarListenerAction() {
    _closeAccordions('hospedagens');
    _addHospedagens();
    _openLastAccordion('hospedagens');
}

// Carregamento Interno (Modal)
function _openImagensHospedagem(j) {
    const size = 5;
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);

    propriedades.titulo = "Adicionar Imagens";
    propriedades.containers = _getContainersInput();
    propriedades.conteudo = _getImagemHospedagemContent(size);
    propriedades.icones = [{ tipo: 'voltar', acao: `_closeInnerImagemHospedagem()` }];
    propriedades.botoes = [{
        tipo: 'cancelar',
    }, {
        tipo: 'confirmar',
        acao: `_saveImagensHospedagem(${j})`,
    }];

    _displayFullMessage(propriedades);
    _initializeSortableForGroup(`imagem-hospedagens`, { onEnd: '' });

    for (let k = 1; k <= size; k++) {
        const imagem = HOSPEDAGEM_IMAGENS[j][k - 1];
        if (imagem) {
            getID(`hospedagens-imagem-descricao-${k}`).value = imagem.descricao;
            getID(`link-hospedagens-${k}`).value = imagem.link;
            getID(`hospedagens-imagem-botao-${k}`).innerText = imagem.descricao || `Imagem ${k}`;
        }

        _loadImageSelector(`hospedagens-${k}`);
        getID(`link-hospedagens-${k}`).addEventListener('change', () => _validateImageLink(`link-hospedagens-${k}`));
    }

}

function _getImagemHospedagemContent(size = 5) {
    let botoes = '';
    let inner = '';
    for (let k = 1; k <= size; k++) {
        botoes += `
        <div class="input-botao-container" id="input-botao-container-${k}">
            <button id="hospedagens-imagem-botao-${k}" class="btn input-botao draggable" onclick="_openInnerImagemHospedagem(${k})" style="margin-top:1em">Adicionar Imagem</button>
            <i class="iconify drag-icon" data-icon="mdi:drag"></i>
        </div>`;

        inner += `
        <div id="hospedagens-imagem-${k}" style="display: none">
            <div class="nice-form-group">
                <label>Descrição da Imagem <span class="opcional"> (Opcional)</span></label>
                <input id="hospedagens-imagem-descricao-${k}" type="text" placeholder="Suíte de casal" />
            </div>

            <div class="nice-form-group customization-box" id="hospedagens-box-${k}">
                <label>Imagens <span class="opcional"> (Opcional)</span></label>
                <input id="upload-hospedagens-${k}" class="imagem-uploadbox" type="file" accept=".jpg, .jpeg, .png" />
                <p id="upload-hospedagens-${k}-size-message" class="message-text"> <i class='red'>*</i> Insira uma imagem de até 1.5MB</p>
            </div>

            <div class="nice-form-group">
                <input id="link-hospedagens-${k}" class="imagem-input" type="url" placeholder="https://link.com/imagem.jpg" value=""
                class="icon-right">
            </div>

            <fieldset class="nice-form-group imagem-checkbox" id="upload-checkbox-hospedagens-${k}">
                <div class="nice-form-group">
                <input type="radio" name="type-hospedagens-${k}" id="enable-link-hospedagens-${k}" checked>
                <label for="enable-link-hospedagens-${k}">Fornecer link</label>
                </div>

                <div class="nice-form-group">
                <input type="radio" name="type-hospedagens-${k}" id="enable-upload-hospedagens-${k}">
                <label for="enable-upload-hospedagens-${k}">Carregar imagem <span class="opcional"> (Até 1.5MB)</span></label>
                </div>
            </fieldset>
        </div>
        `;
    }

    return `
    <p style="font-size: 0.8em; margin-top: -20px">Você pode adicionar até 5 imagens</p>
    <div class="draggable-area" data-group="imagem-hospedagens" id="imagem-hospedagens-botoes">
        ${botoes}
    </div>
    <div id="inner-hospedagens-imagem">
        ${inner}
    </div>
    `;
}

function _openInnerImagemHospedagem(k) {
    _fade([`imagem-hospedagens-botoes`], [`hospedagens-imagem-${k}`]);
    getID('back-icon').style.visibility = 'visible';
}

function _closeInnerImagemHospedagem() {
    for (const orderId of _getChildIDs('inner-hospedagens-imagem')) {
        const k = _getJ(orderId);
        const id = `hospedagens-imagem-${k}`;
        if (getID(id).style.display == 'block') {
            let titulo = 'Adicionar Imagem';

            if (_hasInnerImagemHospedagem(k)) {
                titulo = getID(`hospedagens-imagem-descricao-${k}`).value || `Imagem ${k}`;
            }

            getID(`hospedagens-imagem-botao-${k}`).innerText = titulo;
            _fade([`hospedagens-imagem-${k}`], [`imagem-hospedagens-botoes`]);
            break;
        }
    }
    getID('back-icon').style.visibility = 'hidden';
}

function _hasInnerImagemHospedagem(k) {
    return (getID(`enable-link-hospedagens-${k}`).checked && getID(`link-hospedagens-${k}`).value)
        || (getID(`enable-upload-hospedagens-${k}`).checked && getID(`upload-hospedagens-${k}`).value);
}

function _saveImagensHospedagem(j) {
    const result = [];
    for (const id of _getChildIDs('imagem-hospedagens-botoes')) {
        const k = _getJ(id);
        if (_hasInnerImagemHospedagem(k)) {
            result.push({
                descricao: getID(`hospedagens-imagem-descricao-${k}`).value,
                link: getID(`enable-link-hospedagens-${k}`).checked ? getID(`link-hospedagens-${k}`).value : '',
                file: getID(`enable-upload-hospedagens-${k}`).checked ? getID(`upload-hospedagens-${k}`)?.files[0] : '',
                position: [j, k]
            })
        }
    }
    
    HOSPEDAGEM_IMAGENS[j] = result;
    _closeMessage();
}

function _removeHospedagemImagens(j) {
    HOSPEDAGEM_IMAGENS[j] = [];
}

async function _uploadAndSetHospedagemImages() {
    if (IMAGE_UPLOAD_STATUS.hasErrors || CUSTOM_UPLOADS.hospedagens.length === 0) {
        return;
    }

    const hospedagensFiles = CUSTOM_UPLOADS.hospedagens.map(file => file.file);
    const hospedagemResult = await _uploadImages('viagens', hospedagensFiles);

    if (IMAGE_UPLOAD_STATUS.hasErrors === false) {
        for (let i = 0; i < hospedagemResult.length; i++) {
            const outerPosition = CUSTOM_UPLOADS.hospedagens[i].position[0] - 1;
            const innerPosition = CUSTOM_UPLOADS.hospedagens[i].position[1] - 1;
            FIRESTORE_NEW_DATA.hospedagens[outerPosition].imagens[innerPosition].link = hospedagemResult[i].link;
        }
    }
}