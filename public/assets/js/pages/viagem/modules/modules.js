// ======= Modules JS =======

// ======= MAIN FUNCTION =======
function _start() {
  // Visibility
  _loadVisibility();
  _loadToggle();

  // Header
  _loadHeader();

  // Modules
  _loadModules();
}

// ======= LOADERS =======
function _loadHeader() {
  document.title = FIRESTORE_DATA.titulo;
  document.getElementById("header1").innerHTML = "<h1>" + FIRESTORE_DATA.titulo + "</h1>";
  document.getElementById("header2").style.display = "none";

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

    if (FIRESTORE_DATA.imagem.background) {
      var hero = document.getElementById('hero');
      hero.style.background = 'url("' + FIRESTORE_DATA.imagem.background + '") top center no-repeat';
      hero.style.backgroundSize = 'cover';
    }

    if (FIRESTORE_DATA.imagem.claro) {
      const escuro = FIRESTORE_DATA.imagem.escuro || FIRESTORE_DATA.imagem.claro;
      document.getElementById("header2").src = _isOnDarkMode() ? escuro : FIRESTORE_DATA.imagem.claro;
      document.getElementById("header1").style.display = "none";
      document.getElementById("header2").style.display = "block";

      if (FIRESTORE_DATA.imagem.altura) {
        document.getElementById("header2").style.height = FIRESTORE_DATA.imagem.altura;
      }
    }
  }
}

function _loadModules() {
  // Keypoints
  if (FIRESTORE_DATA.modulos.resumo) {
    CALL_SYNC.push(_loadKeypointsStandAlone);
  } else {
    document.getElementById("keypointsNav").innerHTML = "";
    document.getElementById("keypoints").innerHTML = "";
    document.getElementById("keypoints").style.display = "none";
  }

  // Cities
  if (FIRESTORE_DATA.cidades.length <= 1) {
    document.getElementById("cities").innerHTML = "";
    document.getElementById("cities").style.display = "none";
  }

  // Transportation
  if (FIRESTORE_DATA.modulos.transportes) {
    CALL_SYNC.push(_loadTransportationModule);
  } else {
    document.getElementById("transportationNav").innerHTML = "";
    document.getElementById("transportation").innerHTML = "";
    document.getElementById("transportation").style.display = "none";
  }

  // Stay
  if (FIRESTORE_DATA.modulos.hospedagens) {
    CALL_SYNC.push(_loadStayModule);
  } else {
    document.getElementById("stayNav").innerHTML = "";
    document.getElementById("stay").innerHTML = "";
    document.getElementById("stay").style.display = "none";
  }

  // Schedule: Calendar
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

  // Places
  if (FIRESTORE_DATA.modulos.passeios) {
    _loadPlacesSelect();
    _loadPlacesHTML(CIDADES[0].passeios);
    CALL_SYNC.push(_loadPlaces);
  } else {
    document.getElementById('places').style.display = "none";
    document.getElementById("placesNav").innerHTML = "";
  }

  // Gallery
  if (FIRESTORE_DATA.modulos.galeria) {
    CALL_SYNC.push(_loadGallery);
  } else {
    document.getElementById("portfolioM").innerHTML = "";
    document.getElementById("portfolio").style.display = "none";
  }
}