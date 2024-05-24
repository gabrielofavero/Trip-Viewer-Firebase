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

document.addEventListener('DOMContentLoaded', function () {
  try {
    _startLoadingTimer();
    _main();
    const urlParams = new URLSearchParams(window.location.search);
    TYPE = 'viagens';

    if (urlParams.has('l')) {
      TYPE = 'listagens';
    }

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

    Promise.all([_getConfig(), _getSingleData(TYPE)])
      .then(([configData, firestoreData]) => {

        if (!ERROR_FROM_GET_REQUEST) {
          CONFIG = configData;
          FIRESTORE_DATA = firestoreData;
          console.log('Dados do Firestore Database carregados com sucesso');
          
          _start();
          _mainLoad();
          _adjustPortfolioHeight();
          _refreshCategorias();

        } else if (ERROR_FROM_GET_REQUEST.message.includes('Missing or insufficient permissions')) {
          _displayErrorMessage('O documento não está definido como público. Realize o login com uma conta autorizada para visualizar.');
          _stopLoadingScreen();
        } else {
          _displayErrorMessage(ERROR_FROM_GET_REQUEST);
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

      }).catch((error) => {

        _displayErrorMessage(error);
        throw error;

      });
  } catch (error) {
    _displayErrorMessage(error);
    throw error;

  }
});

async function _mainLoad() {
  try {
    if (CALL_SYNC.length > 0) {
      _sortFunctionArray(CALL_SYNC, CONFIG.callSyncOrder.data);
      for (let _function of CALL_SYNC) {
        _function();
      }
    } else {
      console.warn("No functions to sync");
    }
    // Loading Screen
    _stopLoadingScreen();
  } catch (error) {
    _displayErrorMessage(error);
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
  _loadAdjustCardsHeightsListener();

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
  }

  if (FIRESTORE_DATA.links.ativo) {

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

  if (FIRESTORE_DATA.imagem.ativo) {

    const background = FIRESTORE_DATA.imagem.background;
    const claro = FIRESTORE_DATA.imagem.claro;
    const escuro = _imageExists(FIRESTORE_DATA.imagem.escuro) ? _getImageLink(FIRESTORE_DATA.imagem.escuro) : _getImageLink(claro);

    if (_imageExists(background)) {
      var hero = getID('hero');
      hero.style.background = 'url("' + _getImageLink(background) + '") top center no-repeat';
      hero.style.backgroundSize = 'cover';
    }

    if (_imageExists(claro)) {
      getID("header2").src = _isOnDarkMode() ? escuro : _getImageLink(claro);
      getID("header1").style.display = "none";
      getID("header2").style.display = "block";

      if (FIRESTORE_DATA.imagem.altura) {
        getID("header2").style.height = FIRESTORE_DATA.imagem.altura;
      }
    }
  }
}

function _loadModules() {
  const share = getID('share');
  if (FIRESTORE_DATA.compartilhamento.ativo == true && navigator.share) {
    share.addEventListener('click', () => {
      const titulo = FIRESTORE_DATA.titulo || document.title;
      let tipo = TYPE == 'listagens' ? 'listagem' : 'viagem';
      let complemento = TYPE == 'listagens' ? '' : `, com início em ${INICIO.text} e fim em ${FIM.text}`;

      navigator.share({
        title: FIRESTORE_DATA.titulo || document.title,
        text: `Venha visualizar minha ${tipo} "${titulo}" criada no TripViewer${complemento}`,
        url: window.location.href,
      })

        .then(() => console.log('Link compartilhado com sucesso!'))
        .catch((error) => console.error('Erro ao compartilhar link:', error));
    });
  } else {
    share.style.display = 'none';
  }

  const cities = getID('cities');

  // Resumo
  if (FIRESTORE_DATA.modulos.resumo) {
    CALL_SYNC.push(_loadResumo);
  } else {
    getID("keypointsNav").innerHTML = "";
    getID("keypoints").innerHTML = "";
    getID("keypoints").style.display = "none";
    if (cities) cities.style.display = "none";
  }

  // Cities
  if (cities && FIRESTORE_DATA.destinos.length <= 1) {
    cities.innerHTML = "";
    cities.style.display = "none";
  }

  // Transporte
  if (FIRESTORE_DATA.modulos.transportes) {
    CALL_SYNC.push(_loadTransporte);
  } else {
    getID("transportationNav").innerHTML = "";
    getID("transportation").innerHTML = "";
    getID("transportation").style.display = "none";
  }

  // Hospedagem
  if (FIRESTORE_DATA.modulos.hospedagens) {
    CALL_SYNC.push(_loadHospedagens);
  } else {
    getID("stayNav").innerHTML = "";
    getID("stay").innerHTML = "";
    getID("stay").style.display = "none";
  }

  // Programação
  if (FIRESTORE_DATA.modulos.programacao) {
    CALL_SYNC.push(_loadCalendar);
    CALL_SYNC.push(_loadScheduleCalendar);
  } else {
    getID("scheduleCalendarNav").innerHTML = "";
    getID("scheduleCalendar").innerHTML = "";
    getID("scheduleCalendar").style.display = "none";
  }

  // Destinos
  if (FIRESTORE_DATA.modulos.destinos) {
    _loadDestinationsSelect();
    _loadDestinationsHTML(DESTINOS[0]);

    CALL_SYNC.push(_loadDestinos);

  } else if (FIRESTORE_DATA.modulos.lineup) {
    _loadDestinationsSelect(true);
    _loadDestinationsHTML(DESTINOS[0]);

    CALL_SYNC.push(_loadDestinos);

    getID('destinosNav').innerHTML = '<li><a href="#destinos" class="nav-link scrollto"><i class="bx bx-music"></i> <span>Lineup</span></a></li>'
    getID('dTitle').innerHTML = "Lineup";

  } else {
    getID('destinos').style.display = "none";
    getID("destinosNav").innerHTML = "";
  }

  // Gallery
  if (FIRESTORE_DATA.modulos.galeria) {
    CALL_SYNC.push(_loadGaleria);
  } else {
    getID("portfolioM").innerHTML = "";
    getID("portfolio").style.display = "none";
  }
}