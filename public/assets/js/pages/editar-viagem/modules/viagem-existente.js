async function _loadTripData(FIRESTORE_DATA) {
    try {
        DESTINOS = await _getUserList('destinos');
        _loadDadosBasicosViagemData(FIRESTORE_DATA);
        _loadCompartilhamentoData(FIRESTORE_DATA);
        _loadCustomizacaoData(FIRESTORE_DATA);
        _loadMeiosDeTransporteData(FIRESTORE_DATA);
        _loadHospedagemData(FIRESTORE_DATA);
        _loadProgramacaoData(FIRESTORE_DATA);
        _loadDestinosData(FIRESTORE_DATA);
        _loadLineupData(FIRESTORE_DATA);
        _loadGaleriaData(FIRESTORE_DATA);

        for (const child of _getChildIDs('programacao-box')) {
            const i = child.split('-')[child.split('-').length - 1];
            _updateProgramacaoTitle(i);
        }

    } catch (error) {
        _displayErrorMessage(error);
        throw error;
    }
}

function _loadDadosBasicosViagemData(FIRESTORE_DATA) {
    getID('titulo').value = FIRESTORE_DATA.titulo;
    getID('moeda').value = FIRESTORE_DATA.moeda;

    getID('inicio').value = _formatFirestoreDate(FIRESTORE_DATA.inicio, 'yyyy-mm-dd');
    getID('fim').value = _formatFirestoreDate(FIRESTORE_DATA.fim, 'yyyy-mm-dd');

    getID('quantidadePessoas').value = FIRESTORE_DATA.quantidadePessoas;
}

function _loadCompartilhamentoData(FIRESTORE_DATA) {
    getID('habilitado-publico').checked = FIRESTORE_DATA.compartilhamento.ativo;
    const editores = FIRESTORE_DATA.compartilhamento.editores;

    if (editores && editores.length > 0) {
        getID('habilitado-editores').checked = true;
        for (let i = 1; i <= editores.length; i++) {
            _addEditores();
            getID(`editores-email-${i}`).value = editores[i - 1];
        }
    }
}

function _loadCustomizacaoData(FIRESTORE_DATA) {
    // Imagens
    const background = FIRESTORE_DATA.imagem.background;
    const logoClaro = FIRESTORE_DATA.imagem.claro;
    const logoEscuro = FIRESTORE_DATA.imagem.escuro;
    const altura = FIRESTORE_DATA.imagem.altura;

    if (FIRESTORE_DATA.imagem.ativo === true) {
        getID('habilitado-imagens').checked = true;
        getID('habilitado-imagens-content').style.display = 'block';
    }

    _loadCustomizacaoImageData(background, 'link-background');
    _loadCustomizacaoImageData(logoClaro, 'link-logo-light');
    _loadCustomizacaoImageData(logoEscuro, 'link-logo-dark');

    if (altura) {
        const alturaValue = altura.replace('px', '');
        if (alturaValue > 25 && alturaValue < 500) {
            getID('logo-tamanho').value = alturaValue / 25;
            getID('logo-tamanho-tooltip').innerText = `(${altura})`;
        }
    }

    if (_imageDataIncludes(background, FIREBASE_IMAGE_ORIGIN)) {
        FIREBASE_IMAGES.background = true;
    }

    if (_imageDataIncludes(logoClaro, FIREBASE_IMAGE_ORIGIN)) {
        FIREBASE_IMAGES.claro = true;
    }

    if (_imageDataIncludes(logoEscuro, FIREBASE_IMAGE_ORIGIN)) {
        FIREBASE_IMAGES.escuro = true;
    }

    // Cores
    const claro = getID('claro');
    const escuro = getID('escuro');

    const claroFB = FIRESTORE_DATA.cores.claro;
    const escuroFB = FIRESTORE_DATA.cores.escuro

    if (FIRESTORE_DATA.cores.ativo === true) {
        getID('habilitado-cores').checked = true;
        claro.value = claroFB;
        escuro.value = escuroFB;
        getID('habilitado-cores-content').style.display = 'block';
    }

    // Links Personalizados
    const attachments = FIRESTORE_DATA.links.attachments;
    const drive = FIRESTORE_DATA.links.drive;
    const maps = FIRESTORE_DATA.links.maps;
    const pdf = FIRESTORE_DATA.links.pdf;
    const ppt = FIRESTORE_DATA.links.ppt;
    const sheet = FIRESTORE_DATA.links.sheet;
    const vacina = FIRESTORE_DATA.links.vacina;

    if (FIRESTORE_DATA.links.ativo === true) {
        getID('habilitado-imagens').checked = true;
    }

    if (attachments) {
        getID('link-attachments').value = attachments;
    }

    if (drive) {
        getID('link-drive').value = drive;
    }

    if (maps) {
        getID('link-maps').value = maps;
    }

    if (pdf) {
        getID('link-pdf').value = pdf;
    }

    if (ppt) {
        getID('link-ppt').value = ppt;
    }

    if (sheet) {
        getID('link-sheet').value = sheet;
    }

    if (vacina) {
        getID('link-vacina').value = vacina;
    }
}

function _loadCustomizacaoImageData(value, id) {
    if (value && typeof value === 'string') {
        getID(id).value = value;
    } else if (value && value.link) {
        getID(id).value = value.link;
    }
}

function _imageDataIncludes(value, includes) {
    if (value && typeof value === 'string') {
        return value.includes(includes);
    } else if (value && value.url) {
        return value.url.includes(includes);
    }
    return false;
}

function _loadMeiosDeTransporteData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.transportes === true) {
        getID('habilitado-transporte').checked = true;
        getID('habilitado-transporte-content').style.display = 'block';
        getID('transporte-adicionar-box').style.display = 'block';
    }

    if (FIRESTORE_DATA?.transportes?.visualizacaoSimplificada === false) {
        getID('separar').checked = true;
    }

    const transporteSize = FIRESTORE_DATA?.transportes?.datas.length;
    if (transporteSize > 0) {
        for (let i = 1; i <= transporteSize; i++) {
            const j = i - 1;
            _addTransporte();

            switch (FIRESTORE_DATA.transportes.idaVolta[j]) {
                case 'ida':
                    getID(`ida-${i}`).checked = true;
                    break;
                case 'durante':
                    getID(`durante-${i}`).checked = true;
                    break;
                case 'volta':
                    getID(`volta-${i}`).checked = true;
            }

            const partida = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].partida);
            const chegada = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].chegada);

            if (partida) {
                getID(`partida-${i}`).value = _jsDateToDate(partida, 'yyyy-mm-dd');
                getID(`partida-horario-${i}`).value = _jsDateToTime(partida);
            }

            if (chegada) {
                getID(`chegada-${i}`).value = _jsDateToDate(chegada, 'yyyy-mm-dd');
                getID(`chegada-horario-${i}`).value = _jsDateToTime(chegada);
            }

            const transportes = FIRESTORE_DATA.transportes?.transportes
            if (transportes && transportes[j]) {
                getID(`transporte-tipo-${i}`).value = transportes[j];
            }

            const duracoes = FIRESTORE_DATA.transportes.duracoes;
            if (duracoes && duracoes[j]) {
                getID(`transporte-duracao-${i}`).value = duracoes[j];
            }

            const empresas = FIRESTORE_DATA.transportes.empresas;
            if (empresas && empresas[j]) {
                _loadTransporteVisibility(i);
                if (_getOptionsFromSelect(`empresa-select-${i}`).includes(empresas[j])) {
                    getID(`empresa-select-${i}`).value = empresas[j];
                } else {
                    getID(`empresa-select-${i}`).value = 'outra';
                    getID(`empresa-${i}`).value = empresas[j];
                    _loadTransporteVisibility(i);
                }
            }

            const reservas = FIRESTORE_DATA.transportes.reservas;
            if (reservas[j]) {
                getID(`reserva-transporte-${i}`).value = reservas[j];
            }

            const pontoPartida = FIRESTORE_DATA.transportes.pontos[j].partida;
            const pontoChegada = FIRESTORE_DATA.transportes.pontos[j].chegada;

            if (pontoPartida) {
                getID(`ponto-partida-${i}`).value = pontoPartida;
            }

            if (pontoChegada) {
                getID(`ponto-chegada-${i}`).value = pontoChegada;
            }

            const links = FIRESTORE_DATA.transportes.links;
            if (links && links[j]) {
                getID(`transporte-link-${i}`).value = links[j];
            }

            _updateTransporteTitle(i);
        }
        _applyIdaVoltaVisibility();
    }
}

function _loadHospedagemData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.hospedagens === true) {
        getID('habilitado-hospedagens').checked = true;
        getID('habilitado-hospedagens-content').style.display = 'block';
        getID('hospedagens-adicionar-box').style.display = 'block';
    }

    const hospedagemSize = FIRESTORE_DATA.hospedagens.hospedagem.length;
    if (hospedagemSize > 0) {
        for (let i = 1; i <= hospedagemSize; i++) {
            const j = i - 1;
            _addHospedagens();

            const cafe = FIRESTORE_DATA.hospedagens.cafe;
            if (cafe && (cafe[j] === true || cafe[j] === false)) {
                getID(`hospedagens-cafe-${i}`).checked = cafe[j];
            }

            const hospedagemTitle = getID(`hospedagens-title-${i}`);
            const hospedagemNome = getID(`hospedagens-nome-${i}`);

            const hospedagem = FIRESTORE_DATA.hospedagens.hospedagem[j];
            if (hospedagem) {
                hospedagemNome.value = hospedagem;
                hospedagemTitle.innerText = hospedagem;
            }

            const endereco = FIRESTORE_DATA.hospedagens.endereco[j];
            if (endereco) {
                getID(`hospedagens-endereco-${i}`).value = endereco;
            }

            const dataCheckIn = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkin);
            if (dataCheckIn) {
                const dataFormattedCheckIn = _jsDateToDate(dataCheckIn, 'yyyy-mm-dd');
                const horarioCheckIn = _jsDateToTime(dataCheckIn);
                getID(`check-in-${i}`).value = dataFormattedCheckIn;
                getID(`check-in-horario-${i}`).value = horarioCheckIn;
            }

            const dataCheckOut = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkout)
            if (dataCheckOut) {
                const dataFormattedCheckOut = _jsDateToDate(dataCheckOut, "yyyy-mm-dd");
                const horarioCheckOut = _jsDateToTime(dataCheckOut);

                getID(`check-out-${i}`).value = dataFormattedCheckOut;
                getID(`check-out-horario-${i}`).value = horarioCheckOut;
            }

            const descricao = FIRESTORE_DATA.hospedagens.descricao[j];
            if (descricao) {
                getID(`hospedagens-descricao-${i}`).value = descricao;
            }

            const linkReserva = FIRESTORE_DATA.hospedagens.links[j];
            if (linkReserva) {
                getID(`reserva-hospedagens-link-${i}`).value = linkReserva;
            }

            const imagem = FIRESTORE_DATA.hospedagens.imagens[j];
            if (_isInternalImage(imagem)) {
                getID(`link-hospedagens-${i}`).value = imagem.link;
            } else if (_isExternalImage(imagem)) {
                getID(`link-hospedagens-${i}`).value = imagem;
            }

            hospedagemNome.addEventListener('change', function () {
                hospedagemTitle.innerText = hospedagemNome.value;
            });

        }
    }
}

function _loadProgramacaoData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.programacao === true) {
        getID('habilitado-programacao').checked = true;
        getID('habilitado-programacao-content').style.display = 'block';
    }
    _loadProgramacao();

    let i = 1;

    while (getID(`programacao-title-${i}`)) {
        let prog = {};
        const j = i - 1;
        let progTitle = j;

        const data = FIRESTORE_DATA.programacoes.programacao[j]?.data;
        if (data) {
            const formatted = _formatFirestoreDate(data, 'dd/mm/yyyy');
            prog.data = formatted;
            progTitle = _removeSlashesFromDate(formatted);
        }

        const titulo = FIRESTORE_DATA.programacoes.programacao[j]?.titulo;
        if (titulo) {
            getID(`programacao-inner-title-${i}`).value = titulo;
            prog.titulo = titulo;
        }

        const manha = FIRESTORE_DATA.programacoes.programacao[j]?.manha;
        if (manha && manha.length > 0) {
            for (let k = 1; k <= manha.length; k++) {
                getID(`manha-${k}-${i}`).value = manha[k - 1];
                prog[`manha-${k}`] = manha[k - 1];
            }
        }

        const tarde = FIRESTORE_DATA.programacoes.programacao[j]?.tarde;
        if (tarde && tarde.length > 0) {
            for (let k = 1; k <= tarde.length; k++) {
                getID(`tarde-${k}-${i}`).value = tarde[k - 1];
                prog[`tarde-${k}`] = tarde[k - 1];
            }
        }

        const noite = FIRESTORE_DATA.programacoes.programacao[j]?.noite;
        if (noite && noite.length > 0) {
            for (let k = 1; k <= noite.length; k++) {
                getID(`noite-${k}-${i}`).value = noite[k - 1];
                prog[`noite-${k}`] = noite[k - 1];
            }
        }

        PROGRAMACAO[progTitle] = prog;
        i++;
    }
}

function _loadDestinosData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.destinos === true) {
        const habilitadoDestinos = getID('habilitado-destinos');

        if (habilitadoDestinos) {
            habilitadoDestinos.checked = true;
        }

        getID('habilitado-destinos-content').style.display = 'block';
        getID('sem-destinos').style.display = 'none';
        getID('com-destinos').style.display = 'block';
        getID('destinos-adicionar-box').style.display = 'block';
    } else {
        getID('sem-destinos').style.display = 'block';
        getID('com-destinos').style.display = 'none';
        getID('destinos-adicionar-box').style.display = 'none';
    }

    const cidades = FIRESTORE_DATA.destinos;

    _loadDestinos();

    if (cidades && cidades.length > 0) {
        for (let i = 1; i <= cidades.length; i++) {
            const j = i - 1;
            const id = cidades[j].destinosID;

            if (i === 1) {
                _setDestinoSelectValue(1, id);
            } else {
                _addDestinos();
                _setDestinoSelectValue(i, id);
            }
        }
    }
}

function _loadLineupData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.lineup === true) {
        getID('habilitado-lineup').checked = true;
        getID('habilitado-lineup-content').style.display = 'block';
        getID('lineup-adicionar-box').style.display = 'block';

        const keys = Object.keys(FIRESTORE_DATA.lineup);
        if (keys.length > 0) {
            let i = 1;
            for (const key of keys) {
                const size = FIRESTORE_DATA.lineup[key].nome.length;
                for (let j = 0; j < size; j++, i++) {
                    _addLineup();

                    const nome = FIRESTORE_DATA.lineup[key].nome;
                    if (nome && nome[j]) {
                        getID(`lineup-nome-${i}`).value = nome[j];
                        getID(`lineup-title-${i}`).innerText = nome[j];
                    }

                    const headliner = FIRESTORE_DATA.lineup[key].head;
                    if (headliner && headliner[j]) {
                        getID(`lineup-headliner-${i}`).checked = headliner[j];
                        getID(`lineup-title-${i}`).innerText += ' ⭐';
                    }

                    getID(`lineup-local-${i}`).value = key;

                    const genero = FIRESTORE_DATA.lineup[key].genero;
                    if (genero && genero[j]) {
                        getID(`lineup-genero-${i}`).value = genero[j];
                    }

                    const palco = FIRESTORE_DATA.lineup[key].palco;
                    if (palco && palco[j]) {
                        getID(`lineup-palco-${i}`).value = palco[j];
                    }

                    const data = FIRESTORE_DATA.lineup[key].data;
                    if (data && data[j]) {
                        getID(`lineup-data-${i}`).value = data[j];
                    }

                    const inicio = FIRESTORE_DATA.lineup[key].inicio;
                    if (inicio && inicio[j]) {
                        getID(`lineup-inicio-${i}`).value = inicio[j];
                    }

                    const fim = FIRESTORE_DATA.lineup[key].fim;
                    if (fim && fim[j]) {
                        getID(`lineup-fim-${i}`).value = fim[j];
                    }

                    const midia = FIRESTORE_DATA.lineup[key].hyperlink.video;
                    if (midia && midia[j]) {
                        getID(`lineup-midia-${i}`).value = midia[j];
                    }

                    const nota = FIRESTORE_DATA.lineup[key].nota;
                    if (nota && nota[j]) {
                        getID(`lineup-nota-${i}`).value = nota[j];
                    }
                }
            }
            _lineupGeneroSelectAction();
            _lineupPalcoSelectAction();
        }
    }
}

function _loadGaleriaData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.galeria === true) {
        getID('habilitado-galeria').checked = true;
        getID('habilitado-galeria-content').style.display = 'block';
        getID('galeria-adicionar-box').style.display = 'block';
    }

    const galeriaSize = FIRESTORE_DATA.galeria?.imagens.length;
    if (galeriaSize > 0) {
        for (let i = 1; i <= galeriaSize; i++) {
            const j = i - 1;
            _addGaleria();

            const titulo = FIRESTORE_DATA.galeria.titulos[j];
            if (titulo) {
                getID(`galeria-titulo-${i}`).value = titulo;
                getID(`galeria-title-${i}`).innerText = titulo;
            }

            const categoria = FIRESTORE_DATA.galeria.categorias[j];
            if (categoria) {
                getID(`galeria-categoria-${i}`).value = categoria;
            }

            const descricao = FIRESTORE_DATA.galeria.descricoes[j];
            if (descricao) {
                getID(`galeria-descricao-${i}`).value = descricao;
            }

            const imagem = FIRESTORE_DATA.galeria.imagens[j];
            if (_isInternalImage(imagem)) {
                getID(`link-galeria-${i}`).value = imagem.link;
            } else if (_isExternalImage(imagem)) {
                getID(`link-galeria-${i}`).value = imagem;
            }
        }

        _galeriaSelectAction();
    }
}

function _formatAltura(value) {
    if (value == 0) {
        value = 1;
        getID('logo-tamanho').value = value;
    }
    getID('logo-tamanho-tooltip').innerText = `(${value * 25}px)`
}