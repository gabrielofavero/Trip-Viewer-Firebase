var INICIO = {
  date: null,
  text: ''
};

var FIM = {
  date: null,
  text: ''
};


// ======= MAIN FUNCTION =======
function _start() {
  // Dados Básicos
  _loadInicioFim();

  // Visibilidade
  _loadVisibility();
  _loadToggle();

  // Cabeçalho
  _loadHeader();

  // Módulos 
  _loadModules();
}

// ======= LOADERS =======
function _loadInicioFim() {
  INICIO.date = _convertFromFirestoreDate(FIRESTORE_DATA.inicio);
  INICIO.text = `${INICIO.date.getDate()}/${INICIO.date.getMonth() + 1}`;

  FIM.date = _convertFromFirestoreDate(FIRESTORE_DATA.fim);
  FIM.text = `${FIM.date.getDate()}/${FIM.date.getMonth() + 1}`;
}

function _loadHeader() {
  document.title = FIRESTORE_DATA.titulo;
  document.getElementById("header1").innerHTML = FIRESTORE_DATA.titulo;
  document.getElementById("header2").style.display = "none";
  
  if (FIRESTORE_DATA.subtitulo) {
    document.getElementById("subtitulo").innerHTML = FIRESTORE_DATA.subtitulo;
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

    document.getElementById("dUpdate").innerHTML = `Atualizado em ${mostRecentDateString}`;
  }

  if (FIRESTORE_DATA.descricao) {
    document.getElementById("dDescription").innerHTML = FIRESTORE_DATA.descricao;
  }

  if (FIRESTORE_DATA.links.ativo) {

    if (FIRESTORE_DATA.links.attachments) {
      document.getElementById("attachmentsLink").href = FIRESTORE_DATA.links.attachments;
    } else {
      document.getElementById("attachmentsLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.sheet) {
      document.getElementById("sheetLink").href = FIRESTORE_DATA.links.sheet;
    } else {
      document.getElementById("sheetLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.ppt) {
      document.getElementById("pptLink").href = FIRESTORE_DATA.links.ppt;
    } else {
      document.getElementById("pptLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.drive) {
      document.getElementById("driveLink").href = FIRESTORE_DATA.links.drive;
    } else {
      document.getElementById("driveLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.vacina) {
      document.getElementById("vaccineLink").href = FIRESTORE_DATA.links.vacina;
    } else {
      document.getElementById("vaccineLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.pdf) {
      document.getElementById("pdfLink").href = FIRESTORE_DATA.links.pdf;
    } else {
      document.getElementById("pdfLink").style.display = "none";
    }

    if (FIRESTORE_DATA.links.maps) {
      document.getElementById("mapsLink").href = FIRESTORE_DATA.links.maps;
    } else {
      document.getElementById("mapsLink").style.display = "none";
    }
  }

  if (FIRESTORE_DATA.imagem.ativo) {

    const background = FIRESTORE_DATA.imagem.background;
    const claro = FIRESTORE_DATA.imagem.claro;
    const escuro = _imageExists(FIRESTORE_DATA.imagem.escuro) ? _getImageLink(FIRESTORE_DATA.imagem.escuro) : _getImageLink(claro);

    if (_imageExists(background)) {
      var hero = document.getElementById('hero');
      hero.style.background = 'url("' + _getImageLink(background) + '") top center no-repeat';
      hero.style.backgroundSize = 'cover';
    }

    if (_imageExists(claro)) {
      document.getElementById("header2").src = _isOnDarkMode() ? escuro : _getImageLink(claro);
      document.getElementById("header1").style.display = "none";
      document.getElementById("header2").style.display = "block";

      if (FIRESTORE_DATA.imagem.altura) {
        document.getElementById("header2").style.height = FIRESTORE_DATA.imagem.altura;
      }
    }
  }
}

function _loadModules() {
  const share = getID('share');
  if (FIRESTORE_DATA.compartilhamento.ativo == true && navigator.share) {
    share.addEventListener('click', () => {
      const title = FIRESTORE_DATA.titulo || document.title;

      navigator.share({
        title: FIRESTORE_DATA.titulo || document.title,
        text: `Venha visualizar minha viagem "${title}" criada no TripViewer, com início em ${INICIO.text} e fim em ${FIM.text}`,
        url: window.location.href,  
    })

    .then(() => console.log('Link compartilhado com sucesso!'))
    .catch((error) => console.error('Erro ao compartilhar link:', error));
    });
  } else {
    share.style.display = 'none';
  }
  

  // Resumo
  if (FIRESTORE_DATA.modulos.resumo) {
    CALL_SYNC.push(_loadResumo);
  } else {
    document.getElementById("keypointsNav").innerHTML = "";
    document.getElementById("keypoints").innerHTML = "";
    document.getElementById("keypoints").style.display = "none";
    document.getElementById("cities").style.display = "none";
  }

  // Cities
  if (FIRESTORE_DATA.destinos.length <= 1) {
    document.getElementById("cities").innerHTML = "";
    document.getElementById("cities").style.display = "none";
  }

  // Transporte
  if (FIRESTORE_DATA.modulos.transportes) {
    CALL_SYNC.push(_loadTransporte);
  } else {
    document.getElementById("transportationNav").innerHTML = "";
    document.getElementById("transportation").innerHTML = "";
    document.getElementById("transportation").style.display = "none";
  }

  // Hospedagem
  if (FIRESTORE_DATA.modulos.hospedagens) {
    CALL_SYNC.push(_loadStayModule);
  } else {
    document.getElementById("stayNav").innerHTML = "";
    document.getElementById("stay").innerHTML = "";
    document.getElementById("stay").style.display = "none";
  }

  // Programação
  if (FIRESTORE_DATA.modulos.programacao) {
    CALL_SYNC.push(_loadCalendar);
    CALL_SYNC.push(_loadScheduleCalendar);
    document.getElementById("calendario-credit").style.display = "inline";
  } else {
    document.getElementById("scheduleCalendarNav").innerHTML = "";
    document.getElementById("scheduleCalendar").innerHTML = "";
    document.getElementById("scheduleCalendar").style.display = "none";
    document.getElementById("calendario-credit").style.display = "none";
  }

  // Destinos
  if (FIRESTORE_DATA.modulos.destinos) {
    _loadDestinationsSelect();
    _loadDestinationsHTML(DESTINOS[0].destinos);
    
    CALL_SYNC.push(_loadDestinations);

  } else if (FIRESTORE_DATA.modulos.lineup) {
    _loadDestinationsSelect(true);
    _loadDestinationsHTML(DESTINOS[0].destinos);
    
    CALL_SYNC.push(_loadDestinations);
    
    document.getElementById('destinosNav').innerHTML = '<li><a href="#destinos" class="nav-link scrollto"><i class="bx bx-music"></i> <span>Lineup</span></a></li>'
    document.getElementById('dTitle').innerHTML = "Lineup";

  } else {
    document.getElementById('destinos').style.display = "none";
    document.getElementById("destinosNav").innerHTML = "";
  }

  // Gallery
  if (FIRESTORE_DATA.modulos.galeria) {
    CALL_SYNC.push(_loadGaleria);
  } else {
    document.getElementById("portfolioM").innerHTML = "";
    document.getElementById("portfolio").style.display = "none";
  }
}