async function _loadTripData() {
    try {
        DESTINOS = await _getUserList('destinos', true);
        _loadDadosBasicosViagemData();
        _loadCompartilhamentoData();
        _loadCustomizacaoData();
        _loadTransportesData();
        _loadHospedagemData();
        _loadDestinosData();
        _loadProgramacaoData();
        _loadLineupData();
        _loadGaleriaData();
    } catch (error) {
        _displayErrorMessage(error);
        throw error;
    }
}

function _loadDadosBasicosViagemData() {
    getID('titulo').value = FIRESTORE_DATA.titulo;
    getID('moeda').value = FIRESTORE_DATA.moeda;

    getID('inicio').value = _formatFirestoreDate(FIRESTORE_DATA.inicio, 'yyyy-mm-dd');
    getID('fim').value = _formatFirestoreDate(FIRESTORE_DATA.fim, 'yyyy-mm-dd');

    getID('quantidadePessoas').value = FIRESTORE_DATA.quantidadePessoas;
}

function _loadCompartilhamentoData() {
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

function _loadCustomizacaoData() {
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
        getID(`reserva-hospedagens-link-${j}`).value = hospedagem.link;
        getID(`link-hospedagens-${j}`).value = hospedagem.imagem instanceof Object ? hospedagem.imagem.link : hospedagem.imagem

        _loadCheckIn(hospedagem, j);
        _loadCheckOut(hospedagem, j);
    }
}

function _loadDestinosData() {
    if (FIRESTORE_DATA.modulos.destinos === true) {
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
        if (dados.data) {
            _applyLoadedProgramacaoData(j, dados);
        }
        j++;
    }
    _loadDestinosOrdenados();
    _updateDestinosAtivosCheckboxHTML('programacao');
}

function _loadLineupData() {
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

                    const midia = FIRESTORE_DATA.lineup[key].midia;
                    if (midia && midia[j]) {
                        getID(`lineup-midia-${i}`).value = midia[j];
                    }

                    const nota = FIRESTORE_DATA.lineup[key].nota;
                    if (nota && nota[j]) {
                        getID(`lineup-nota-${i}`).value = nota[j];
                    }
                }
            }
            _updateDestinosAtivosSelectHTML('lineup');
            _lineupGeneroSelectAction();
            _lineupPalcoSelectAction();
        }
    }
}

function _loadGaleriaData() {
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