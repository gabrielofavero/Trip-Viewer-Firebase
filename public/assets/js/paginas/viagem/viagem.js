var REFRESHED = false;
var TYPE = 'viagens';

var INICIO = {
  date: null,
  text: ''
};

var FIM = {
  date: null,
  text: ''
};

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _startLoadingTimer();
    _main();
    const urlParams = _getURLParams();
    TYPE = urlParams['l'] ? 'listagens' : urlParams['d'] ? "destinos" : 'viagens';

    window.addEventListener('scroll', () => {
      if (window.scrollY > 0) {
        if (!REFRESHED) {
          _refreshCategorias();
          REFRESHED = true;
        }
      } else {
        REFRESHED = false;
      }
    });

    const firestoreData = await _getSingleData(TYPE);

    if (!ERROR_FROM_GET_REQUEST) {
      FIRESTORE_DATA = firestoreData;
      console.log('Dados do Firestore Database carregados com sucesso');

      _start();
      _mainLoad();
      _loadViagemVisibility();
      _adjustPortfolioHeight();
      _refreshCategorias();

    } else if (ERROR_FROM_GET_REQUEST.message.includes('Missing or insufficient permissions')) {
      _displayError('O documento não pôde ser carregado. É possível que ele tenha sido excluído ou que você não possua permissão para acessá-lo.', true);
      _stopLoadingScreen();
    } else {
      _displayError(ERROR_FROM_GET_REQUEST);
      _stopLoadingScreen();
    }

    $('body').css('overflow', 'auto');

    if (!MESSAGE_MODAL_OPEN) {
      setTimeout(() => {
        _adjustCardsHeights();
        _adjustPortfolioHeight();
        _refreshCategorias();
      }, 1000);
    }
  } catch (error) {
    _displayError(error);
    throw error;
  }
});

async function _mainLoad() {
  try {
    if (CALL_SYNC.length > 0) {
      _sortByArray(CALL_SYNC, CONFIG.callSyncOrder.data);
      for (let _function of CALL_SYNC) {
        _function();
      }
    } else {
      console.warn("No functions to sync");
    }
    // Loading Screen
    _stopLoadingScreen();
  } catch (error) {
    _displayError(error);
    throw error;
  }
}

function _start() {
  // Dados Básicos
  if (FIRESTORE_DATA.inicio && FIRESTORE_DATA.fim) {
    _loadInicioFim();
  }

  // Visibilidade
  _loadVisibility();
  _loadToggle();
  _loadHotelBoxListener();

  // Cabeçalho
  _loadHeader();

  // Módulos 
  _loadModules();
}

function _loadInicioFim() {
  INICIO.date = _convertFromFirestoreDate(FIRESTORE_DATA.inicio);
  INICIO.text = `${INICIO.date.getDate()}/${INICIO.date.getMonth() + 1}`;

  FIM.date = _convertFromFirestoreDate(FIRESTORE_DATA.fim);
  FIM.text = `${FIM.date.getDate()}/${FIM.date.getMonth() + 1}`;
}

function _loadHeader() {
  document.title = FIRESTORE_DATA.titulo;
  getID("header1").innerHTML = FIRESTORE_DATA.titulo;
  getID("header2").style.display = "none";

  if (FIRESTORE_DATA.subtitulo) {
    getID("subtitulo").innerHTML = FIRESTORE_DATA.subtitulo;
  }

  if (TYPE == 'destinos' && FIRESTORE_DATA.versao?.ultimaAtualizacao) {
    const ultimaAtualizacao = new Date(FIRESTORE_DATA.versao.ultimaAtualizacao);
    getID("subtitulo").innerHTML = `Atualizado em ${_jsDateToDate(ultimaAtualizacao, "dd/mm/yyyy")}`;
  }

  if (FIRESTORE_DATA?.versao.exibirEmDestinos) {
    let datas = [new Date(FIRESTORE_DATA.versao.ultimaAtualizacao)];

    for (const destino of FIRESTORE_DATA.destinos) {
      const ultimaAtualizacao = destino.destinos.versao.ultimaAtualizacao;
      if (ultimaAtualizacao) {
        datas.push(new Date(ultimaAtualizacao));
      }
    }

    const mostRecentDate = datas.reduce((a, b) => a > b ? a : b);
    const mostRecentDateString = _jsDateToDate(mostRecentDate, "dd/mm/yyyy");

    getID("dUpdate").innerHTML = `Atualizado em ${mostRecentDateString}`;
  }

  if (FIRESTORE_DATA.descricao) {
    getID("dDescription").innerHTML = FIRESTORE_DATA.descricao;
    getID("dDescription").style.display = "block";
  }

  if (FIRESTORE_DATA.links?.ativo) {
    getID("social-links").style.display = "block";
    
    if (FIRESTORE_DATA.links.attachments) {
      getID("attachmentsLink").href = FIRESTORE_DATA.links.attachments;
    } else {
      getID("attachmentsLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.sheet) {
      getID("sheetLink").href = FIRESTORE_DATA.links.sheet;
    } else {
      getID("sheetLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.ppt) {
      getID("pptLink").href = FIRESTORE_DATA.links.ppt;
    } else {
      getID("pptLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.drive) {
      getID("driveLink").href = FIRESTORE_DATA.links.drive;
    } else {
      getID("driveLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.vacina) {
      getID("vaccineLink").href = FIRESTORE_DATA.links.vacina;
    } else {
      getID("vaccineLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.pdf) {
      getID("pdfLink").href = FIRESTORE_DATA.links.pdf;
    } else {
      getID("pdfLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.maps) {
      getID("mapsLink").href = FIRESTORE_DATA.links.maps;
    } else {
      getID("mapsLink").style.display = "none";
    }
  }

  if (FIRESTORE_DATA.imagem?.ativo) {

    const background = FIRESTORE_DATA.imagem.background;
    const claro = FIRESTORE_DATA.imagem.claro;
    const escuro = FIRESTORE_DATA.imagem.escuro;

    if (_imageExists(background)) {
      var hero = getID('hero');
      hero.style.background = 'url("' + _getImageLink(background) + '") top center no-repeat';
      hero.style.backgroundSize = 'cover';
    }

    if (_imageExists(claro)) {
      LOGO_CLARO = _getImageLink(claro);
      if (_imageExists(escuro)) {
        LOGO_ESCURO = _getImageLink(escuro);
      } else {
        LOGO_ESCURO = LOGO_CLARO;
      }

      getID("header2").src = _isOnDarkMode() ? LOGO_ESCURO : LOGO_CLARO;
      getID("header1").style.display = "none";
      getID("header2").style.display = "block";
    }
  }
}

function _loadModules() {
  _loadCompartilhamentoModule();
  _loadResumoModule();
  _loadGastosModule();
  _loadTransportesModule();
  _loadHospedagensModule();
  _loadProgramacaoModule();
  _loadDestinosModule();
  _loadGaleriaModule();

  function _loadCompartilhamentoModule() {
    const share = getID('share');
    if (FIRESTORE_DATA.compartilhamento.ativo == true && navigator.share && window.location.hostname != 'localhost') {
      share.addEventListener('click', () => {
        _compartilhar();
      });
    } else {
      share.style.display = 'none';
    }

    function _compartilhar() {
      const link = window.location.href.includes('trip-viewer-prd.firebaseapp.com') ?
        'https://trip-viewer.com' + window.location.pathname + window.location.search : window.location.href;

      navigator.share({
        title: FIRESTORE_DATA.titulo || document.title,
        text: _getCompartilhamentoText(),
        url: link,
      })
    }

    function _getCompartilhamentoText() {
      switch (TYPE) {
        case 'listagens':
          return `Venha visualizar minha lista "${FIRESTORE_DATA.titulo}" criada no TripViewer`
        case 'destinos':
          return `Venha visualizar o destino "${FIRESTORE_DATA.titulo}" criado no TripViewer`
        case 'viagem':
        case 'viagens':
          return `Venha visualizar minha viagem "${FIRESTORE_DATA.titulo}" criada no TripViewer, com início em ${INICIO.text} e fim em ${FIM.text}`
        default:
          return `Venha visualizar minhas informações de viagem criadas no TripViewer`
      }
    }
  }

  function _loadResumoModule() {
    if (FIRESTORE_DATA.modulos?.resumo === true) {
      CALL_SYNC.push(_loadResumo);
    } else {
      getID("keypointsNav").innerHTML = "";
      getID("keypoints").innerHTML = "";
      getID("keypoints").style.display = "none";
    }
  }

  function _loadGastosModule() {
    const ativo = FIRESTORE_DATA.modulos?.gastos === true;
    const pin = FIRESTORE_DATA.gastosPin || false;
    localStorage.setItem('gastos', JSON.stringify({ ativo, pin }));

    if (ativo) {
      getID('gastos-container').style.display = '';
      getID('gastos').addEventListener('click', () => {
        _openLightbox(`expenses.html?g=${_getURLParam('v')}`);
      });
    }
  }

  function _loadTransportesModule() {
    if (FIRESTORE_DATA.modulos?.transportes === true) {
      CALL_SYNC.push(_loadTransporte);
    } else {
      getID("transportationNav").innerHTML = "";
      getID("transportation").innerHTML = "";
      getID("transportation").style.display = "none";
    }
  }

  function _loadHospedagensModule() {
    if (FIRESTORE_DATA.modulos?.hospedagens === true) {
      CALL_SYNC.push(_loadHospedagens);
    } else {
      getID("stayNav").innerHTML = "";
      getID("stay").innerHTML = "";
      getID("stay").style.display = "none";
    }
  }

  function _loadProgramacaoModule() {
    if (FIRESTORE_DATA.modulos?.programacao === true) {
      CALL_SYNC.push(_loadProgramacao);
    } else {
      getID("scheduleCalendarNav").innerHTML = "";
      getID("scheduleCalendar").innerHTML = "";
      getID("scheduleCalendar").style.display = "none";
    }
  }

  function _loadDestinosModule() {
    switch (TYPE) {
      case 'viagens':
        if (FIRESTORE_DATA.modulos?.destinos === true && FIRESTORE_DATA.destinos?.length > 0) {
          _loadDestinosDefault();
        } else {
          _disableDestinos();
        }
        break;
      case 'listagens':
        _loadDestinosDefault();
        break;
      case 'destinos':
        _loadDestinosExclusive()
        break;
    }

    function _loadDestinosDefault() {
      _loadDestinationsSelect();
      _loadDestinationsHTML(DESTINOS[0]);

      if (DESTINOS.length === 1) {
        _setUniqueDestinoText();
      };

      CALL_SYNC.push(_loadDestinos);
    };

    function _loadDestinosExclusive() {
      DESTINOS = [{
        destinosID: _getURLParam('d'),
        destinos: FIRESTORE_DATA
      }];

      getID("destinos-select").style.display = "none";

      _setUniqueDestinoText();
      _loadDestinationsHTML(DESTINOS[0]);

      CALL_SYNC.push(_loadDestinos);
    };

    function _disableDestinos() {
      getID('destinos').style.display = "none";
      getID("destinosNav").innerHTML = "";
    }

    function _setUniqueDestinoText() {
      const titulo = DESTINOS[0].destinos.titulo;
      getID('dTitle').innerHTML = titulo;
      getID('destinosNavText').innerHTML = titulo;
    }
  }

  function _loadGaleriaModule() {
    if (FIRESTORE_DATA.modulos?.galeria === true) {
      CALL_SYNC.push(_loadGaleria);
    } else {
      getID("portfolioM").innerHTML = "";
      getID("portfolio").style.display = "none";
    }
  }

}