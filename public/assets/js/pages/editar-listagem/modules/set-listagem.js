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
            cidades: [],
            compartilhamento: {
                hospedagens: false,
                passeios: true,
                programacao: false,
                resumo: true,
                transportes: false,
                galeria: false
            },
            cores: {},
            imagem: {},
            links: {},
            modulos: {},
            titulo: "",
            subtitulo: "",
            descricao: "",
            versao: {
                ultimaAtualizacao: new Date().toISOString(),
                exibirEmPasseios: false
            }
        }
    }

    const divTitulo = document.getElementById(`titulo`);
    result.data.titulo = divTitulo ? _returnEmptyIfNoValue(divTitulo.value) : "";

    const divSubtitulo = document.getElementById(`subtitulo`);
    result.data.subtitulo = divSubtitulo ? _returnEmptyIfNoValue(divSubtitulo.value) : "";

    const divDescricao = document.getElementById(`descricao`);
    result.data.descricao = divDescricao ? _returnEmptyIfNoValue(divDescricao.value) : "";

    const exibirEmPasseios = document.getElementById(`exibir-em-passeios`);
    result.data.versao.exibirEmPasseios = exibirEmPasseios ? exibirEmPasseios.checked : false;

    result.data.compartilhamento = await _buildCompartilhamentoObject();
    result.data.imagem = _buildImagemObject();
    result.data.links = _buildLinksObject();

    result.data.cores = {
        ativo: document.getElementById('habilitado-cores').checked,
        claro: _returnEmptyIfNoValue(document.getElementById('claro').value),
        escuro: _returnEmptyIfNoValue(document.getElementById('escuro').value)
    }

    result.data.cidades = _buildCidadesArray();

    if (listID) {
        result.id = listID;
    }

    return result;
}

async function _setListagem() {
    _startLoadingScreen();

    for (const child of _getChildIDs('com-passeios')) {
        const i = parseInt(child.split("-")[2]);
        _setRequired(`select-passeios-${i}`)
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
                    logoLight = await _uploadLogoLight(listID, 'placesLists');
                }

                if (uploadLogoDark) {
                    logoDark = await _uploadLogoDark(listID, 'placesLists');
                }

                if (uploadBackground) {
                    background = await _uploadBackground(listID, 'placesLists');
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