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

    } catch (e) {
        _displayErrorMessage(e);
        throw e;
    }
}

function _loadDadosBasicosViagemData(FIRESTORE_DATA) {
    document.getElementById('titulo').value = FIRESTORE_DATA.titulo;
    document.getElementById('moeda').value = FIRESTORE_DATA.moeda;

    document.getElementById('inicio').value = _formatFirestoreDate(FIRESTORE_DATA.inicio, 'yyyy-mm-dd');
    document.getElementById('fim').value = _formatFirestoreDate(FIRESTORE_DATA.fim, 'yyyy-mm-dd');

    document.getElementById('quantidadePessoas').value = FIRESTORE_DATA.quantidadePessoas;
}

function _loadCompartilhamentoData(FIRESTORE_DATA) {
    document.getElementById('habilitado-publico').checked = FIRESTORE_DATA.compartilhamento.ativo;
    const editores = FIRESTORE_DATA.compartilhamento.editores;

    if (editores && editores.length > 0) {
        document.getElementById('habilitado-editores').checked = true;
        for (let i = 1; i <= editores.length; i++) {
            _addEditores();
            document.getElementById(`editores-email-${i}`).value = editores[i - 1];
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
        document.getElementById('habilitado-imagens').checked = true;
        document.getElementById('habilitado-imagens-content').style.display = 'block';
    }

    _loadCustomizacaoImageData(background, 'link-background');
    _loadCustomizacaoImageData(logoClaro, 'link-logo-light');
    _loadCustomizacaoImageData(logoEscuro, 'link-logo-dark');

    if (altura) {
        const alturaValue = altura.replace('px', '');
        if (alturaValue > 25 && alturaValue < 500) {
            document.getElementById('logo-tamanho').value = alturaValue / 25;
            document.getElementById('logo-tamanho-tooltip').innerText = `(${altura})`;
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
    const claro = document.getElementById('claro');
    const escuro = document.getElementById('escuro');

    const claroFB = FIRESTORE_DATA.cores.claro;
    const escuroFB = FIRESTORE_DATA.cores.escuro

    if (FIRESTORE_DATA.cores.ativo === true) {
        document.getElementById('habilitado-cores').checked = true;
        claro.value = claroFB;
        escuro.value = escuroFB;
        document.getElementById('habilitado-cores-content').style.display = 'block';
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
        document.getElementById('habilitado-imagens').checked = true;
    }

    if (attachments) {
        document.getElementById('link-attachments').value = attachments;
    }

    if (drive) {
        document.getElementById('link-drive').value = drive;
    }

    if (maps) {
        document.getElementById('link-maps').value = maps;
    }

    if (pdf) {
        document.getElementById('link-pdf').value = pdf;
    }

    if (ppt) {
        document.getElementById('link-ppt').value = ppt;
    }

    if (sheet) {
        document.getElementById('link-sheet').value = sheet;
    }

    if (vacina) {
        document.getElementById('link-vacina').value = vacina;
    }
}

function _loadCustomizacaoImageData(value, id) {
    if (value && typeof value === 'string') {
        document.getElementById(id).value = value;
    } else if (value && value.link) {
        document.getElementById(id).value = value.link;
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
        document.getElementById('habilitado-transporte').checked = true;
        document.getElementById('habilitado-transporte-content').style.display = 'block';
        document.getElementById('transporte-adicionar-box').style.display = 'block';
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
                    document.getElementById(`ida-${i}`).checked = true;
                    break;
                case 'durante':
                    document.getElementById(`durante-${i}`).checked = true;
                    break;
                case 'volta':
                    document.getElementById(`volta-${i}`).checked = true;
            }

            const partida = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].partida);
            const chegada = _convertFromFirestoreDate(FIRESTORE_DATA.transportes.datas[j].chegada);

            if (partida) {
                document.getElementById(`partida-${i}`).value = _jsDateToDate(partida, 'yyyy-mm-dd');
                document.getElementById(`partida-horario-${i}`).value = _jsDateToTime(partida);
            }

            if (chegada) {
                document.getElementById(`chegada-${i}`).value = _jsDateToDate(chegada, 'yyyy-mm-dd');
                document.getElementById(`chegada-horario-${i}`).value = _jsDateToTime(chegada);
            }

            const transportes = FIRESTORE_DATA.transportes?.transportes
            if (transportes && transportes[j]) {
                document.getElementById(`transporte-codigo-${i}`).value = transportes[j];
            }

            const duracoes = FIRESTORE_DATA.transportes.duracoes;
            if (duracoes && duracoes[j]) {
                document.getElementById(`transporte-duracao-${i}`).value = duracoes[j];
            }

            const empresas = FIRESTORE_DATA.transportes.empresas;
            if (empresas && empresas[j]) {
                if (_getOptionsFromSelect(`empresa-select-${i}`).includes(empresas[j])) {
                    document.getElementById(`empresa-select-${i}`).value = empresas[j];
                } else {
                    document.getElementById(`empresa-select-${i}`).value = 'outra';
                    document.getElementById(`empresa-${i}`).value = _firstCharToUpperCase(empresas[j]);
                }
            }

            const reservas = FIRESTORE_DATA.transportes.reservas;
            if (reservas[j]) {
                document.getElementById(`reserva-transp-${i}`).value = reservas[j];
            }

            const pontoPartida = FIRESTORE_DATA.transportes.pontos[j].partida;
            const pontoChegada = FIRESTORE_DATA.transportes.pontos[j].chegada;

            if (pontoPartida) {
                document.getElementById(`ponto-partida-${i}`).value = pontoPartida;
            }

            if (pontoChegada) {
                document.getElementById(`ponto-chegada-${i}`).value = pontoChegada;
            }

            const links = FIRESTORE_DATA.transportes.links;
            if (links && links[j]) {
                document.getElementById(`link-transp-${i}`).value = links[j];
            }

            _updateTransporteTitle(i);
        }
        _applyIdaVoltaVisibility();
    }
}

function _loadHospedagemData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.hospedagens === true) {
        document.getElementById('habilitado-hospedagens').checked = true;
        document.getElementById('habilitado-hospedagens-content').style.display = 'block';
        document.getElementById('hospedagens-adicionar-box').style.display = 'block';
    }

    const hospedagemSize = FIRESTORE_DATA.hospedagens.hospedagem.length;
    if (hospedagemSize > 0) {
        for (let i = 1; i <= hospedagemSize; i++) {
            const j = i - 1;
            _addHospedagem();

            const hospedagemTitle = document.getElementById(`hospedagens-title-${i}`);
            const hospedagemNome = document.getElementById(`hospedagens-nome-${i}`);

            const hospedagem = FIRESTORE_DATA.hospedagens.hospedagem[j];
            if (hospedagem) {
                hospedagemNome.value = hospedagem;
                hospedagemTitle.innerText = hospedagem;
            }

            const endereco = FIRESTORE_DATA.hospedagens.endereco[j];
            if (endereco) {
                document.getElementById(`hospedagens-endereco-${i}`).value = endereco;
            }

            const dataCheckIn = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkin);
            if (dataCheckIn) {
                const dataFormattedCheckIn = _jsDateToDate(dataCheckIn, 'yyyy-mm-dd');
                const horarioCheckIn = _jsDateToTime(dataCheckIn);
                document.getElementById(`check-in-${i}`).value = dataFormattedCheckIn;
                document.getElementById(`check-in-horario-${i}`).value = horarioCheckIn;
            }

            const dataCheckOut = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[j].checkout)
            if (dataCheckOut) {
                const dataFormattedCheckOut = _jsDateToDate(dataCheckOut, "yyyy-mm-dd");
                const horarioCheckOut = _jsDateToTime(dataCheckOut);

                document.getElementById(`check-out-${i}`).value = dataFormattedCheckOut;
                document.getElementById(`check-out-horario-${i}`).value = horarioCheckOut;
            }

            const descricao = FIRESTORE_DATA.hospedagens.descricao[j];
            if (descricao) {
                document.getElementById(`hospedagens-descricao-${i}`).value = descricao;
            }

            const reserva = FIRESTORE_DATA.hospedagens.reservas[j];
            if (reserva) {
                document.getElementById(`hospedagens-descricao-${i}`).value = reserva;
            }

            const linkReserva = FIRESTORE_DATA.hospedagens.links[j];
            if (linkReserva) {
                document.getElementById(`link-reserva-hospedagens-${i}`).value = linkReserva;
            }

            const imagem = FIRESTORE_DATA.hospedagens.imagens[j];
            if (_isInternalImage(imagem)) {
                document.getElementById(`link-hospedagens-${i}`).value = imagem.link;
            } else if (_isExternalImage(imagem)) {
                document.getElementById(`link-hospedagens-${i}`).value = imagem;
            }

            hospedagemNome.addEventListener('change', function () {
                hospedagemTitle.innerText = hospedagemNome.value;
            });

        }
    }
}

function _loadProgramacaoData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.programacao === true) {
        document.getElementById('habilitado-programacao').checked = true;
        document.getElementById('habilitado-programacao-content').style.display = 'block';
    }
    _loadProgramacao();

    let i = 1;

    while (document.getElementById(`programacao-title-${i}`)) {
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
            document.getElementById(`programacao-inner-title-${i}`).value = titulo;
            prog.titulo = titulo;
        }

        const manha = FIRESTORE_DATA.programacoes.programacao[j]?.manha;
        if (manha && manha.length > 0) {
            for (let k = 1; k <= manha.length; k++) {
                document.getElementById(`manha-${k}-${i}`).value = manha[k - 1];
                prog[`manha-${k}`] = manha[k - 1];
            }
        }

        const tarde = FIRESTORE_DATA.programacoes.programacao[j]?.tarde;
        if (tarde && tarde.length > 0) {
            for (let k = 1; k <= tarde.length; k++) {
                document.getElementById(`tarde-${k}-${i}`).value = tarde[k - 1];
                prog[`tarde-${k}`] = tarde[k - 1];
            }
        }

        const noite = FIRESTORE_DATA.programacoes.programacao[j]?.noite;
        if (noite && noite.length > 0) {
            for (let k = 1; k <= noite.length; k++) {
                document.getElementById(`noite-${k}-${i}`).value = noite[k - 1];
                prog[`noite-${k}`] = noite[k - 1];
            }
        }

        PROGRAMACAO[progTitle] = prog;
        i++;
    }
}

function _loadDestinosData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.destinos === true) {
        const habilitadoDestinos = document.getElementById('habilitado-destinos');

        if (habilitadoDestinos) {
            habilitadoDestinos.checked = true;
        }

        document.getElementById('habilitado-destinos-content').style.display = 'block';
        document.getElementById('sem-destinos').style.display = 'none';
        document.getElementById('com-destinos').style.display = 'block';
        document.getElementById('destinos-adicionar-box').style.display = 'block';
    } else {
        document.getElementById('sem-destinos').style.display = 'block';
        document.getElementById('com-destinos').style.display = 'none';
        document.getElementById('destinos-adicionar-box').style.display = 'none';
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
        document.getElementById('habilitado-lineup').checked = true;
        document.getElementById('habilitado-lineup-content').style.display = 'block';
        document.getElementById('lineup-adicionar-box').style.display = 'block';

        const keys = Object.keys(FIRESTORE_DATA.lineup);
        if (keys.length > 0) {
            let i = 1;
            for (const key of keys) {
                const size = FIRESTORE_DATA.lineup[key].nome.length;
                for (let j = 0; j < size; j++, i++) {
                    _addLineup();

                    const nome = FIRESTORE_DATA.lineup[key].nome;
                    if (nome && nome[j]) {
                        document.getElementById(`lineup-nome-${i}`).value = nome[j];
                        document.getElementById(`lineup-title-${i}`).innerText = nome[j];
                    }

                    const headliner = FIRESTORE_DATA.lineup[key].head;
                    if (headliner && headliner[j]) {
                        document.getElementById(`lineup-headliner-${i}`).checked = headliner[j];
                        document.getElementById(`lineup-title-${i}`).innerText += ' ⭐';
                    }

                    document.getElementById(`lineup-local-${i}`).value = key;

                    const genero = FIRESTORE_DATA.lineup[key].genero;
                    if (genero && genero[j]) {
                        document.getElementById(`lineup-genero-${i}`).value = genero[j];
                    }

                    const palco = FIRESTORE_DATA.lineup[key].palco;
                    if (palco && palco[j]) {
                        document.getElementById(`lineup-palco-${i}`).value = palco[j];
                    }

                    const data = FIRESTORE_DATA.lineup[key].data;
                    if (data && data[j]) {
                        document.getElementById(`lineup-data-${i}`).value = data[j];
                    }

                    const inicio = FIRESTORE_DATA.lineup[key].inicio;
                    if (inicio && inicio[j]) {
                        document.getElementById(`lineup-inicio-${i}`).value = inicio[j];
                    }

                    const fim = FIRESTORE_DATA.lineup[key].fim;
                    if (fim && fim[j]) {
                        document.getElementById(`lineup-fim-${i}`).value = fim[j];
                    }

                    const midia = FIRESTORE_DATA.lineup[key].hyperlink.video;
                    if (midia && midia[j]) {
                        document.getElementById(`lineup-midia-${i}`).value = midia[j];
                    }

                    const nota = FIRESTORE_DATA.lineup[key].nota;
                    if (nota && nota[j]) {
                        document.getElementById(`lineup-nota-${i}`).value = nota[j];
                    }
                }
            }
            _lineupGeneroSelectAction('lineup', 'genero');
            _lineupPalcoSelectAction('lineup', 'palco');
        }
    }
}

function _loadGaleriaData(FIRESTORE_DATA) {
    if (FIRESTORE_DATA.modulos.galeria === true) {
        document.getElementById('habilitado-galeria').checked = true;
        document.getElementById('habilitado-galeria-content').style.display = 'block';
        document.getElementById('galeria-adicionar-box').style.display = 'block';
    }

    const galeriaSize = FIRESTORE_DATA.galeria?.imagens.length;
    if (galeriaSize > 0) {
        for (let i = 1; i <= galeriaSize; i++) {
            const j = i - 1;
            _addGaleria();

            const titulo = FIRESTORE_DATA.galeria.titulos[j];
            if (titulo) {
                document.getElementById(`galeria-titulo-${i}`).value = titulo;
                document.getElementById(`galeria-title-${i}`).innerText = titulo;
            }

            const categoria = FIRESTORE_DATA.galeria.categorias[j];
            if (categoria) {
                document.getElementById(`galeria-categoria-${i}`).value = categoria;
            }

            const descricao = FIRESTORE_DATA.galeria.descricoes[j];
            if (descricao) {
                document.getElementById(`galeria-descricao-${i}`).value = descricao;
            }

            const imagem = FIRESTORE_DATA.galeria.imagens[j];
            if (_isInternalImage(imagem)) {
                document.getElementById(`link-galeria-${i}`).value = imagem.link;
            } else if (_isExternalImage(imagem)) {
                document.getElementById(`link-galeria-${i}`).value = imagem;
            }
        }

        _galeriaSelectAction('galeria', 'categoria');
    }
}

function _formatAltura(value) {
    if (value == 0) {
        value = 1;
        document.getElementById('logo-tamanho').value = value;
    }
    document.getElementById('logo-tamanho-tooltip').innerText = `(${value * 25}px)`
}