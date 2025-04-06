async function _loadTripData() {
    try {
        DESTINOS = await _getUserList('destinos', true);
        _loadDadosBasicosViagemData();
        _loadCompartilhamentoData();
        _loadCustomizacaoData();
        await _loadGastosData();
        _loadTransportesData();
        _loadHospedagemData();
        _loadDestinosData();
        _loadProgramacaoData();
        _loadGaleriaData();

        document.title = `Editar ${FIRESTORE_DATA.titulo}`;
    } catch (error) {
        _displayError(error);
        throw error;
    }
}

function _loadDadosBasicosViagemData() {
    getID('titulo').value = FIRESTORE_DATA.titulo;
    getID('moeda').value = FIRESTORE_DATA.moeda;

    getID('inicio').value = _formatFirestoreDate(FIRESTORE_DATA.inicio, 'yyyy-mm-dd');
    getID('fim').value = _formatFirestoreDate(FIRESTORE_DATA.fim, 'yyyy-mm-dd');

    getID('offset').value = FIRESTORE_DATA.timezoneOffset || new Date().getTimezoneOffset();

    getID('quantidadePessoas').value = FIRESTORE_DATA.quantidadePessoas;
}

function _loadCompartilhamentoData() {
    getID('habilitado-publico').checked = FIRESTORE_DATA.compartilhamento.ativo;
    const editores = FIRESTORE_DATA.compartilhamento.editores;

    if (editores && editores.length > 0) {
        getID('habilitado-editores').checked = true;
        for (let j = 1; j <= editores.length; j++) {
            _addEditores();
            getID(`editores-email-${j}`).value = editores[j - 1];
        }
    }
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

    if (FIRESTORE_DATA.cores.ativo === true) {
        getID('habilitado-cores').checked = true;
        claro.value = FIRESTORE_DATA.cores.claro;
        escuro.value = FIRESTORE_DATA.cores.escuro;
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

async function _loadGastosData() {
    if (FIRESTORE_DATA.modulos.gastos === true) {
        getID('habilitado-gastos').checked = true;
        getID('habilitado-gastos-content').style.display = 'block';
    }
    if (FIRESTORE_DATA.gastosPin === true) {
        getID('pin-enable').checked = true;
        getID('pin-container').style.display = 'block';
        _setPinButtonText(false);
        const protectedGastos = await _get(`gastos/${DOCUMENT_ID}`);
        PIN_GASTOS.current = protectedGastos.pin;
        PIN_GASTOS.new = protectedGastos.pin;
        FIRESTORE_GASTOS_DATA = await _get(`gastos/protected/${PIN_GASTOS.current}/${DOCUMENT_ID}`);
    } else {
        FIRESTORE_GASTOS_DATA = await _get(`gastos/${DOCUMENT_ID}`);
    }
    
    if (ERROR_FROM_GET_REQUEST) {
        _displayError(ERROR_FROM_GET_REQUEST);
        return;
    }

    if (FIRESTORE_GASTOS_DATA) {
        _pushGasto('gastosPrevios');
        _pushGasto('gastosDurante');
    
        function _pushGasto(tipo) {
            for (const gasto of FIRESTORE_GASTOS_DATA[tipo]) {
                const tipos = INNER_GASTOS[tipo].map(gasto => gasto.tipo);
                const index = tipos.indexOf(gasto.tipo);
                if (index === -1) {
                    INNER_GASTOS[tipo].push({
                        tipo: gasto.tipo,
                        gastos: [gasto],
                    });
                } else {
                    INNER_GASTOS[tipo][index].gastos.push(gasto);
                }
            }
        }
    
        _loadGastosHTML();
    }
}

function _loadTransportesData() {
    if (FIRESTORE_DATA.modulos.transportes === true) {
        getID('habilitado-transporte').checked = true;
        getID('habilitado-transporte-content').style.display = 'block';
        getID('transporte-adicionar-box').style.display = 'block';
    }
    getID('separar').checked = !FIRESTORE_DATA.transportes.visualizacaoSimplificada;

    for (let j = 1; j <= FIRESTORE_DATA.transportes.dados.length; j++) {
        _addTransporte();
        const transporte = FIRESTORE_DATA.transportes.dados[j - 1];

        switch (transporte.idaVolta) {
            case 'ida':
                getID(`ida-${j}`).checked = true;
                break;
            case 'durante':
                getID(`durante-${j}`).checked = true;
                break;
            case 'volta':
                getID(`volta-${j}`).checked = true;
        }

        const partida = _convertFromFirestoreDate(transporte.datas.partida);
        const chegada = _convertFromFirestoreDate(transporte.datas.chegada);

        if (partida) {
            getID(`partida-${j}`).value = _jsDateToDate(partida, 'yyyy-mm-dd');
            getID(`partida-horario-${j}`).value = _jsDateToTime(partida);
        }

        if (chegada) {
            getID(`chegada-${j}`).value = _jsDateToDate(chegada, 'yyyy-mm-dd');
            getID(`chegada-horario-${j}`).value = _jsDateToTime(chegada);
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
    _applyIdaVoltaVisibility();
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

        getID(`hospedagens-id-${j}`).value = hospedagem.id;
        getID(`hospedagens-cafe-${j}`).checked = hospedagem.cafe;
        getID(`hospedagens-nome-${j}`).value = hospedagem.nome;
        getID(`hospedagens-title-${j}`).innerText = hospedagem.nome || getID(`hospedagens-title-${j}`).innerText;
        getID(`hospedagens-endereco-${j}`).value = hospedagem.endereco;
        getID(`hospedagens-descricao-${j}`).value = hospedagem.descricao;
        getID(`reserva-hospedagens-${j}`).value = hospedagem.reserva || "";
        getID(`reserva-hospedagens-link-${j}`).value = hospedagem.link;
        getID(`link-hospedagens-${j}`).value = hospedagem.imagem instanceof Object ? hospedagem.imagem.link : hospedagem.imagem

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

function _loadLineupData() {
    if (FIRESTORE_DATA.modulos.lineup === true) {
        getID('habilitado-lineup').checked = true;
        getID('habilitado-lineup-content').style.display = 'block';
        getID('lineup-adicionar-box').style.display = 'block';
    }

    for (let j = 1; j <= FIRESTORE_DATA.lineup.length; j++) {
        _addLineup();
        const lineup = FIRESTORE_DATA.lineup[j - 1];

        getID(`lineup-title-${j}`).innerText = `${lineup.nome}${lineup.headliner ? ' ⭐' : ''}`;  
        getID(`lineup-id-${j}`).value = lineup.id;
        getID(`lineup-headliner-${j}`).checked = lineup.headliner;
        getID(`lineup-nome-${j}`).value = lineup.nome;        
        getID(`lineup-local-${j}`).value = lineup.local;  
        getID(`lineup-genero-${j}`).innerText = lineup.genero;
        getID(`lineup-palco-${j}`).innerText = lineup.palco;
        getID(`lineup-data-${j}`).value = _firestoneDateToKey(lineup.data);
        getID(`lineup-inicio-${j}`).value = lineup.inicio;
        getID(`lineup-fim-${j}`).value = lineup.fim;
        getID(`lineup-midia-${j}`).value = lineup.midia;
        getID(`lineup-nota-${j}`).value = lineup.nota;

        _updateValueDS('lineup-genero', lineup.genero, `lineup-genero-select-${j}`);
        _updateValueDS('lineup-palco', lineup.palco, `lineup-palco-select-${j}`);
    }

    _buildDS('lineup-genero');
    _buildDS('lineup-palco');
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

            const imagem = FIRESTORE_DATA.galeria.imagens[i];
            if (_isInternalImage(imagem)) {
                getID(`link-galeria-${j}`).value = imagem.link;
            } else if (_isExternalImage(imagem)) {
                getID(`link-galeria-${j}`).value = imagem;
            }
        }
    }
}