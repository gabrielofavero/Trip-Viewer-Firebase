// ======= Modules JS =======

// ======= MAIN FUNCTION =======
function _start() {
  // Visibility
  _loadVisibility();
  _loadNightModeToggleHTML();

  // Header
  _loadHeader();

  // Modules
  _loadModules();

  // Ranges
  _loadMainRanges();
  _loadPlacesRanges();
  _loadHyperlinkRanges();

  // Visibility - After Load
  _adjustButtonsPosition();
}

// ======= LOADERS =======
function _loadHeader() {
  document.title = FIRESTORE_DATA.titulo;
  document.getElementById("header1").innerHTML = "<h1>" + FIRESTORE_DATA.titulo + "</h1>";
  document.getElementById("header2").style.display = "none";

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

  if (FIRESTORE_DATA.links.documents) {
    document.getElementById("comprovantesV").href = FIRESTORE_DATA.links.documents;
    document.getElementById("comprovantesH").href = FIRESTORE_DATA.links.documents;
  }

  if (FIRESTORE_DATA.imagem.ativo) {
    document.getElementById("header2").src = DARK_MODE ? FIRESTORE_DATA.imagem.escuro : FIRESTORE_DATA.imagem.claro;
    document.getElementById("header1").style.display = "none";
    document.getElementById("header2").style.display = "block";
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

  // Flights
  if (FIRESTORE_DATA.modulos.voos) {
    CALL_SYNC.push(_loadFlightsModule);
  } else {
    document.getElementById("flightsNav").innerHTML = "";
    document.getElementById("flights").innerHTML = "";
    document.getElementById("flights").style.display = "none";
  }

  // Stay
  if (!FIRESTORE_DATA.modulos.hospedagens) {
    document.getElementById("stayNav").innerHTML = "";
    document.getElementById("stay").innerHTML = "";
    document.getElementById("stay").style.display = "none";
  }

  // Costs
  if (FIRESTORE_DATA.modulos.custos) {
    CALL_SYNC.push(_loadCostModule);
  } else {
    document.getElementById("costsNav").innerHTML = "";
    document.getElementById("costs").innerHTML = "";
    document.getElementById("costs").style.display = "none";
  }

  // Schedule: Calendar
  if (FIRESTORE_DATA.modulos.programacao) {
    CALL_SYNC.push(_loadScheduleCalendar);
  } else {
    document.getElementById("scheduleCalendarNav").innerHTML = "";
    document.getElementById("scheduleCalendar").innerHTML = "";
    document.getElementById("scheduleCalendar").style.display = "none";
  }

  // Places
  _loadPlacesHTML(FIRESTORE_DATA.cidades[0]);
  _loadPlacesSelect();
  CALL_SYNC.push(_loadPlaces);

  // Gallery
  if (!FIRESTORE_DATA.modulos.galeria) {
    document.getElementById("galleryNav").innerHTML = "";
    document.getElementById("gallery").innerHTML = "";
    document.getElementById("gallery").style.display = "none";
  }
}