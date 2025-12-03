var REFRESHED = false;
var TYPE = 'viagens';
var PIN = null;

var INICIO = {
  date: null,
  text: ''
};

var FIM = {
  date: null,
  text: ''
};

var TRAVELERS;

document.addEventListener('DOMContentLoaded', async function () {
  try {
    _startLoadingTimer();
    _main();
  } catch (error) {
    _displayError(error);
    throw error;
  }
});

async function _loadViagemPage() {
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

  if (ERROR_FROM_GET_REQUEST) {
    _displayError(_getErrorFromGetRequestMessage(), true);
    _stopLoadingScreen();
    return;
  }

  if (!ERROR_FROM_GET_REQUEST) {
    if (firestoreData.pin === 'all-data') {
      _loadProtectedData(firestoreData);
    } else {
      _setFirestoreData(firestoreData);
    }
  }
}

async function _syncModules() {
  try {
    if (CALL_SYNC.length > 0) {
      const callSyncOrder = [
        _loadResumo,
        _loadTransporte,
        _loadHospedagens,
        _loadDestinos,
        _loadGaleria
      ]
      _sortByArray(CALL_SYNC, callSyncOrder);
      for (let _function of CALL_SYNC) {
        _function();
      }
    } else {
      console.warn("No functions to sync");
    }
    // Loading Screen
    _stopLoadingScreen();
    _adjustDestinationsHTML();
  } catch (error) {
    _displayError(error);
    throw error;
  }
}

function _prepareViewData() {
  // Dados Básicos
  if (FIRESTORE_DATA.inicio && FIRESTORE_DATA.fim) {
    _loadInicioFim();
  }

  // Visibilidade
  _loadVisibility();
  _loadToggle();
  _adjustCardsHeightsListener();
  _loadCloseCustomSelectListeners();

  // Cabeçalho
  _loadHeader();

  // Módulos 
  _loadModules();
}

function _loadInicioFim(data = FIRESTORE_DATA) {
  INICIO.date = _convertFromDateObject(data.inicio);
  INICIO.text = `${INICIO.date.getDate()}/${INICIO.date.getMonth() + 1}`;

  FIM.date = _convertFromDateObject(data.fim);
  FIM.text = `${FIM.date.getDate()}/${FIM.date.getMonth() + 1}`;
}

function _loadHeader() {
  _loadTitle();

  if (TYPE == 'destinos' && FIRESTORE_DATA.versao?.ultimaAtualizacao) {
    const ultimaAtualizacao = new Date(FIRESTORE_DATA.versao.ultimaAtualizacao);
    getID("subtitulo").innerHTML = `${translate('labels.last_updated_on')} ${_getDateString(ultimaAtualizacao, _getDateRegionalFormat())}`;
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
    const mostRecentDateString = _getDateString(mostRecentDate, _getDateRegionalFormat());

    getID("dUpdate").innerHTML = `${translate(labels.last_updated_on)} ${mostRecentDateString}`;
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

  _loadHeaderImageAndLogo();
}

function _loadTitle(data = FIRESTORE_DATA) {
  document.title = data.titulo;
  getID("header1").innerHTML = data.titulo;
  getID("header2").style.display = "none";

  if (data.subtitulo) {
    getID("subtitulo").innerHTML = data.subtitulo;
  }
}

function _loadHeaderImageAndLogo(data = FIRESTORE_DATA) {
  if (data.imagem?.ativo) {

    const background = data.imagem.background;
    const claro = data.imagem.claro;
    const escuro = data.imagem.escuro;

    if (background) {
      var hero = getID('hero');
      hero.style.background = 'url("' + background + '") top center no-repeat';
      hero.style.backgroundSize = 'cover';
    }

    if (claro) {
      LOGO_CLARO = claro;
      if (escuro) {
        LOGO_ESCURO = escuro;
      } else {
        LOGO_ESCURO = LOGO_CLARO;
      }

      getID("header2").src = _isOnDarkMode() ? LOGO_ESCURO : LOGO_CLARO;
      getID("header1").style.display = "none";
      getID("header2").style.display = "block";
      document.querySelectorAll('.header-text').forEach((element) => {
        element.style.textAlign = 'center';
      });
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
    if (navigator.share && window.location.hostname != 'localhost') {
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
          return translate('listing.share', { name: FIRESTORE_DATA.titulo });
        case 'destinos':
          return translate('destination.share', { name: FIRESTORE_DATA.titulo });
        case 'viagem':
        case 'viagens':
          return translate('trip.share', { name: FIRESTORE_DATA.titulo, start: INICIO.text, end: FIM.text });
        default:
          return translate('messages.share');
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
    localStorage.setItem('gastos', JSON.stringify({ ativo, pin: FIRESTORE_DATA.pin || 'no-pin' }));

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
      _loadDestinationsCustomSelect();
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

function _setFirestoreData(firestoreData) {
  FIRESTORE_DATA = firestoreData;
  console.log('Firestore Database data loaded successfully');
  _loadDocumentData();
}

function _loadDocumentData() {
  _prepareViewData();
  _syncModules();
  _loadViagemVisibility();
  _adjustPortfolioHeight();
  _refreshCategorias();

  if (FIRESTORE_DATA.pin == 'sensitive-only') {
    _loadSensitiveReservations();
  }

  $('body').css('overflow', 'auto');

  if (!MESSAGE_MODAL_OPEN) {
    setTimeout(() => {
      _adjustCardsHeights();
      _adjustPortfolioHeight();
      _refreshCategorias();
    }, 1000);
  }
}

function _loadProtectedData(firestoreData) {
  _loadTitle(firestoreData);
  _loadInicioFim(firestoreData);
  _loadHeaderImageAndLogo(firestoreData);
  _loadVisibility(firestoreData);
  _requestDocumentPin();
}

async function _protectedDataConfirmAction(afterAction = _setFirestoreData) {
  PIN = getID('pin-code')?.innerText || '';
  _closeMessage();
  const adjustLoadables = false;
  _startLoadingScreen({ adjustLoadables });
  const invalido = true;

  if (!PIN) {
    _requestDocumentPin({ invalido });
    return;
  }

  const path = `${TYPE}/protected/${PIN}/${_getURLParam(TYPE[0])}`;
  const firestoreData = await _get(path);

  if (!ERROR_FROM_GET_REQUEST && !firestoreData) {
    _requestDocumentPin({ invalido });
    return;
  }

  if (ERROR_FROM_GET_REQUEST) {
    _displayError(_getErrorFromGetRequestMessage(), true);
    const adjustLoadables = false;
    _stopLoadingScreen({ adjustLoadables });
    return;
  }

  afterAction(firestoreData);
}

function _requestDocumentPin({ invalido = false, confirmAction = `_protectedDataConfirmAction()` } = {}) {
  const precontent = translate('messages.protected');
  _stopLoadingScreen();
  _requestPin({ confirmAction, precontent, invalido })
}