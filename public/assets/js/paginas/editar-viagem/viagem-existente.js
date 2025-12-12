async function _loadTripData() {
    try {
        DESTINOS = await _getUserList('destinos', true);
        _loadDadosBasicosViagemData();
        _loadCustomizacaoData();
        await _loadExpensesData();
        _loadTransportesData();
        _loadHospedagemData();
        _loadDestinosData();
        _loadProgramacaoData();
        _loadGaleriaData();

        document.title = `${translate('labels.edit')} ${FIRESTORE_DATA.titulo}`;
    } catch (error) {
        _displayError(error);
        throw error;
    }
}

function _loadDadosBasicosViagemData() {
    getID('titulo').value = FIRESTORE_DATA.titulo;
    getID('moeda').value = FIRESTORE_DATA.moeda;

    const inicio = _convertFromDateObject(FIRESTORE_DATA.inicio);
    const fim = _convertFromDateObject(FIRESTORE_DATA.fim);

    getID('inicio').value = _getDateString(inicio, 'yyyy-mm-dd');
    getID('fim').value = _getDateString(fim, 'yyyy-mm-dd');

    TRAVELERS = _cloneObject(FIRESTORE_DATA.pessoas);
    _validateTravelersObject();
    _updateTravelersButtonLabel();
    _setCurrentPreferencePIN(FIRESTORE_DATA.pin);
    _switchPinVisibility();
    _switchPinLabel();
}

function _loadCustomizacaoData() {
    // Imagens
    const background = FIRESTORE_DATA.imagem.background;
    const logoClaro = FIRESTORE_DATA.imagem.claro;
    const logoEscuro = FIRESTORE_DATA.imagem.escuro;

    if (FIRESTORE_DATA.imagem.ativo === true) {
        getID('habilitado-imagens').checked = true;
        getID('habilitado-imagens-content').style.display = 'block';
    }

    _loadCustomizacaoImageData(background, 'link-background');
    _loadCustomizacaoImageData(logoClaro, 'link-logo-light');
    _loadCustomizacaoImageData(logoEscuro, 'link-logo-dark');

    // Cores
    const claro = getID('claro');
    const escuro = getID('escuro');

    if (FIRESTORE_DATA.cores.ativo === true) {
        getID('habilitado-cores').checked = true;
        claro.value = FIRESTORE_DATA.cores.claro;
        escuro.value = FIRESTORE_DATA.cores.escuro;
        CURRENT_LIGHT = FIRESTORE_DATA.cores.claro;
        getID('habilitado-cores-content').style.display = 'block';
    }

    // Visibilidade
    const visibilidade = FIRESTORE_DATA.visibilidade;
    if (visibilidade) {
        _visibilityListenerAction(visibilidade);
        getID('dark-and-light').checked = visibilidade.claro && visibilidade.escuro;
        getID('light-exclusive').checked = visibilidade.claro && !visibilidade.escuro;
        getID('dark-exclusive').checked = !visibilidade.claro && visibilidade.escuro;
    }

    // Links Personalizados
    getID('habilitado-links').checked = FIRESTORE_DATA.links.ativo;
    getID('link-attachments').value = FIRESTORE_DATA.links.attachments;
    getID('link-drive').value = FIRESTORE_DATA.links.drive;
    getID('link-maps').value = FIRESTORE_DATA.links.maps;
    getID('link-pdf').value = FIRESTORE_DATA.links.pdf;
    getID('link-ppt').value = FIRESTORE_DATA.links.ppt;
    getID('link-sheet').value = FIRESTORE_DATA.links.sheet;
    getID('link-vacina').value = FIRESTORE_DATA.links.vacina;
}

async function _loadExpensesData() {
    if (FIRESTORE_DATA.modulos.gastos === true) {
        getID('habilitado-gastos').checked = true;
        getID('habilitado-gastos-content').style.display = 'block';
    }

    const getPath = PIN.current ? `gastos/protected/${PIN.current}/${DOCUMENT_ID}` : `gastos/${DOCUMENT_ID}`; 

    FIRESTORE_GASTOS_DATA = await _get(getPath, true, true);
    
    if (ERROR_FROM_GET_REQUEST) {
        _displayError(ERROR_FROM_GET_REQUEST);
        return;
    }

    _loadGastos();
}

async function _loadTransportesData() {
    if (FIRESTORE_DATA.modulos.transportes === true) {
        getID('habilitado-transporte').checked = true;
        getID('habilitado-transporte-content').style.display = 'block';
        getID('transporte-adicionar-box').style.display = 'block';
    }
    getID(FIRESTORE_DATA.transportes.visualizacao || 'simple-view').checked = true;

    for (let j = 1; j <= FIRESTORE_DATA.transportes.dados.length; j++) {
        _addTransporte();
        const transporte = FIRESTORE_DATA.transportes.dados[j - 1];

        getID(`${transporte.idaVolta}-${j}`).checked = true;

        const pessoa = transporte.pessoa;
        if (pessoa) {
            getID(`transporte-pessoa-${j}`).value = pessoa;
            _updateValueDS('transporte-pessoa', pessoa, `transporte-pessoa-select-${j}`);
            _buildDS('transporte-pessoa');
        }

        const partida = _convertFromDateObject(transporte.datas.partida);
        const chegada = _convertFromDateObject(transporte.datas.chegada);

        if (partida) {
            getID(`partida-${j}`).value = _getDateString(partida, 'yyyy-mm-dd');
            getID(`partida-horario-${j}`).value = _getTimeString(partida);
        }

        if (chegada) {
            getID(`chegada-${j}`).value = _getDateString(chegada, 'yyyy-mm-dd');
            getID(`chegada-horario-${j}`).value = _getTimeString(chegada);
        }

        const empresa = transporte.empresa;
        if (empresa) {
            _loadTransporteVisibility(j);
            if (_getOptionsFromSelect(`empresa-select-${j}`).includes(empresa)) {
                getID(`empresa-select-${j}`).value = empresa;
            } else {
                getID(`empresa-select-${j}`).value = 'outra';
                getID(`empresa-${j}`).value = empresa;
                _loadTransporteVisibility(j);
            }
        }

        getID(`transporte-id-${j}`).value = transporte.id;
        getID(`transporte-tipo-${j}`).value = transporte.transporte;
        getID(`transporte-duracao-${j}`).value = transporte.duracao;
        getID(`reserva-transporte-${j}`).value = transporte.reserva;
        getID(`ponto-partida-${j}`).value = transporte.pontos.partida;
        getID(`ponto-chegada-${j}`).value = transporte.pontos.chegada;
        getID(`transporte-link-${j}`).value = transporte.link;

        _updateTransporteTitle(j);
    }
    _applyTransportationTypeVisualization();
}

function _loadHospedagemData() {
    if (FIRESTORE_DATA.modulos.hospedagens === true) {
        getID('habilitado-hospedagens').checked = true;
        getID('habilitado-hospedagens-content').style.display = 'block';
        getID('hospedagens-adicionar-box').style.display = 'block';
    }

    for (let j = 1; j <= FIRESTORE_DATA.hospedagens.length; j++) {
        _addHospedagens();
        const hospedagem = FIRESTORE_DATA.hospedagens[j - 1];
        HOSPEDAGEM_IMAGENS[j] = hospedagem.imagens || [];

        getID(`hospedagens-id-${j}`).value = hospedagem.id;
        getID(`hospedagens-cafe-${j}`).checked = hospedagem.cafe;
        getID(`hospedagens-nome-${j}`).value = hospedagem.nome;
        getID(`hospedagens-title-${j}`).innerText = hospedagem.nome || getID(`hospedagens-title-${j}`).innerText;
        getID(`hospedagens-endereco-${j}`).value = hospedagem.endereco;
        getID(`hospedagens-descricao-${j}`).value = hospedagem.descricao;
        getID(`reserva-hospedagens-${j}`).value = hospedagem.reserva || "";
        getID(`reserva-hospedagens-link-${j}`).value = hospedagem.link;
        
        _setImagemButtonLabel(j);
        _loadCheckIn(hospedagem, j);
        _loadCheckOut(hospedagem, j);
    }
}

function _loadDestinosData() {
    if (_getHTMLpage() === 'editar-listagem' || FIRESTORE_DATA.modulos.destinos === true) {
        if (getID('habilitado-destinos')) {
            getID('habilitado-destinos').checked = true;
        }
        getID('habilitado-destinos-content').style.display = 'block';
        getID('sem-destinos').style.display = 'none';
        getID('com-destinos').style.display = 'block';
    } else {
        getID('sem-destinos').style.display = 'block';
        getID('com-destinos').style.display = 'none';
    }

    _loadDestinos();
    const checkboxes = document.querySelectorAll('#destinos-checkboxes input[type="checkbox"]');
    for (const destino of FIRESTORE_DATA.destinos) {
        const id = destino.destinosID;
        for (const checkbox of checkboxes) {
            if (checkbox.value === id) {
                checkbox.checked = true;
                break;
            }
        }
    }
    _loadDestinosAtivos();
}

function _loadProgramacaoData() {
    if (FIRESTORE_DATA.modulos.programacao === true) {
        getID('habilitado-programacao').checked = true;
        getID('habilitado-programacao-content').style.display = 'block';
    }

    _loadProgramacao();

    let j = 1;
    while (getID(`programacao-title-${j}`)) {
        const dados = FIRESTORE_DATA.programacoes[j - 1];
        if (dados?.data) {
            _applyLoadedProgramacaoData(j, dados);
        }
        j++;
    }
    _loadDestinosOrdenados();
    _updateDestinosAtivosCheckboxHTML('programacao');
    FIRESTORE_PROGRAMACAO_DATA = _cloneObject(FIRESTORE_DATA.programacoes);
}

function _loadGaleriaData() {
    if (FIRESTORE_DATA.modulos.galeria === true) {
        getID('habilitado-galeria').checked = true;
        getID('habilitado-galeria-content').style.display = 'block';
        getID('galeria-adicionar-box').style.display = 'block';
    }

    const galeriaSize = FIRESTORE_DATA.galeria?.imagens.length;
    if (galeriaSize > 0) {
        for (let j = 1; j <= galeriaSize; j++) {
            const i = j - 1;
            _addGaleria();

            const titulo = FIRESTORE_DATA.galeria.titulos[i];
            if (titulo) {
                getID(`galeria-titulo-${j}`).value = titulo;
                getID(`galeria-title-${j}`).innerText = titulo;
            }

            const categoria = FIRESTORE_DATA.galeria.categorias[i];
            if (categoria) {
                getID(`galeria-categoria-${j}`).value = categoria;
                _updateValueDS('galeria-categoria', categoria, `galeria-categoria-select-${j}`);
                _buildDS('galeria-categoria');
            }

            const descricao = FIRESTORE_DATA.galeria.descricoes[i];
            if (descricao) {
                getID(`galeria-descricao-${j}`).value = descricao;
            }

            getID(`link-galeria-${j}`).value = FIRESTORE_DATA.galeria.imagens[i];
        }
    }
}