var TO_UPLOAD = {
    background: false,
    logoLight: false,
    logoDark: false
};

var CLEAR_IMAGES = {
    background: false,
    claro: false,
    escuro: false
}

var FIRESTORE_NEW_DATA = {};

async function _buildListObject() {
    let result = {
        id: "",
        data: {
            destinos: [],
            compartilhamento: {},
            cores: {},
            imagem: {},
            links: {},
            modulos: {
                hospedagens: false,
                destinos: true,
                programacao: false,
                resumo: false,
                transportes: false,
                galeria: false
            },
            titulo: "",
            subtitulo: "",
            descricao: "",
            versao: {
                ultimaAtualizacao: new Date().toISOString(),
                exibirEmDestinos: false
            }
        }
    }

    const divTitulo = document.getElementById(`titulo`);
    result.data.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

    const divSubtitulo = document.getElementById(`subtitulo`);
    result.data.subtitulo = divSubtitulo ? _returnEmptyIfNoValue(divSubtitulo.value) : "";

    const divDescricao = document.getElementById(`descricao`);
    result.data.descricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";

    const exibirEmDestinos = document.getElementById(`exibir-em-destinos`);
    result.data.versao.exibirEmDestinos = exibirEmDestinos ? exibirEmDestinos.checked : false;

    result.data.compartilhamento = await _buildCompartilhamentoObject();
    result.data.imagem = _buildImagemObject();
    result.data.links = _buildLinksObject();

    result.data.cores = {
        ativo: document.getElementById('habilitado-cores').checked,
        claro: _returnEmptyIfNoValue(document.getElementById('claro').value),
        escuro: _returnEmptyIfNoValue(document.getElementById('escuro').value)
    }

    result.data.destinos = _buildDestinosArray();

    if (DOCUMENT_ID) {
        result.id = DOCUMENT_ID;
    }

    return result;
}

async function _setListagem() {
    _startLoadingScreen();

    for (const child of _getChildIDs('com-destinos')) {
        const i = parseInt(child.split("-")[2]);
        _setRequired(`select-destinos-${i}`)
    }

    _validateRequiredFields();

    if (!_isModalOpen()) {
        const listagem = await _buildListObject();
        let result;

        if (DOCUMENT_ID && listagem) {
            result = await _updateUserObjectDB(listagem.data, DOCUMENT_ID, "listagens");
        } else if (listagem) {
            result = await _newUserObjectDB(listagem.data, "listagens");
            DOCUMENT_ID = result?.data?.id;
        }

        FIRESTORE_NEW_DATA = listagem.data;
        let message = result.message;

        if (result.success == true) {
            wasSaved = true;

            try {
                const body = {
                    id: DOCUMENT_ID,
                    type: "viagens",
                    background: TO_UPLOAD.background ? await _uploadBackground('listagens') : '',
                    logoLight: TO_UPLOAD.logoLight ? await _uploadLogoLight('listagens') : '',
                    logoDark: TO_UPLOAD.logoDark ? await _uploadLogoDark('listagens') : '',
                    custom: {}
                }

                await _updateImages(body);
                await _deleteUnusedImages(FIRESTORE_DATA, await _get(`listagens/${DOCUMENT_ID}`));

            } catch (error) {
                IMAGE_UPLOAD_ERROR.status = true;
                _logger(ERROR, error);
            }

            if (IMAGE_UPLOAD_ERROR.status === true) {
                const errorsHTML = _printObjectHTML(IMAGE_UPLOAD_ERROR.messages);
                message += `, porém houve um erro ao tentar salvar as imagens: ${errorsHTML}`;
            }
        }

        document.getElementById('modal-inner-text').innerHTML = message;

        _stopLoadingScreen();
        _openModal('modal');
    }
}