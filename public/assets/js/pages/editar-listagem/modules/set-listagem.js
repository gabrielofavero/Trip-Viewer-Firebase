var uploadBackground = false;
var uploadLogoLight = false;
var uploadLogoDark = false;
var uploadGaleria = [];

var CLEAR_IMAGES = {
    background: false,
    claro: false,
    escuro: false
}

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
                resumo: true,
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

    if (listID) {
        result.id = listID;
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

        if (listID && listagem) {
            result = await _updateUserObjectDB(listagem.data, listagem.id, "listagens");
        } else if (listagem) {
            result = await _newUserObjectDB(listagem.data, "listagens");
            listID = result?.data?.id;
        }

        let message = result.message;

        if (result.success == true) {
            wasSaved = true;

            if (uploadLogoLight || uploadLogoDark || uploadBackground) {
                let newMessage = '';
                let logoLight = '';
                let logoDark = ''
                let background = '';

                if (uploadLogoLight) {
                    logoLight = await _uploadLogoLight(listID, 'destinosLists');
                }

                if (uploadLogoDark) {
                    logoDark = await _uploadLogoDark(listID, 'destinosLists');
                }

                if (uploadBackground) {
                    background = await _uploadBackground(listID, 'destinosLists');
                }

                body = {
                    id: listID,
                    type: 'listagens',
                    background: background,
                    logoLight: logoLight,
                    logoDark: logoDark,
                }

                newMessage = await _updateImages(body)

                if (!newMessage.includes('sucesso')) {
                    message += '. Falha no upload de imagem(s): ' + newMessage;
                } else {
                    await _checkAndClearFirebaseImages(listID);
                }
            }
        }

        document.getElementById('modal-inner-text').innerText = message;

        _stopLoadingScreen();
        _openModal('modal');
    }
}