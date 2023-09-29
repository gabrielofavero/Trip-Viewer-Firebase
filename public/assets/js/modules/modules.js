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
  document.title = FIRESTONE_DATA.titulo;
  document.getElementById("header1").innerHTML = "<h1>" + FIRESTONE_DATA.titulo + "</h1>";
  document.getElementById("header2").style.display = "none";

  if (FIRESTONE_DATA.links.attachments) {
    document.getElementById("attachmentsLink").href = FIRESTONE_DATA.links.attachments;
  } else {
    document.getElementById("attachmentsLink").style.display = "none";
  }

  if (FIRESTONE_DATA.links.sheet) {
    document.getElementById("sheetLink").href = FIRESTONE_DATA.links.sheet;
  } else {
    document.getElementById("sheetLink").style.display = "none";
  }

  if (FIRESTONE_DATA.links.ppt) {
    document.getElementById("pptLink").href = FIRESTONE_DATA.links.ppt;
  } else {
    document.getElementById("pptLink").style.display = "none";
  }
  
  if (FIRESTONE_DATA.links.drive) {
    document.getElementById("driveLink").href = FIRESTONE_DATA.links.drive;
  } else {
    document.getElementById("driveLink").style.display = "none";
  }
  
  if (FIRESTONE_DATA.links.vacina) {
    document.getElementById("vaccineLink").href = FIRESTONE_DATA.links.vacina;
  } else {
    document.getElementById("vaccineLink").style.display = "none";
  }
  
  if (FIRESTONE_DATA.links.pdf) {
    document.getElementById("pdfLink").href = FIRESTONE_DATA.links.pdf;
  } else {
    document.getElementById("pdfLink").style.display = "none";
  }
  
  if (FIRESTONE_DATA.links.maps) {
    document.getElementById("mapsLink").href = FIRESTONE_DATA.links.maps;
  } else {
    document.getElementById("mapsLink").style.display = "none";
  }

  if (FIRESTONE_DATA.links.documents) {
    document.getElementById("comprovantesV").href = FIRESTONE_DATA.links.documents;
    document.getElementById("comprovantesH").href = FIRESTONE_DATA.links.documents;
  }

  if (FIRESTONE_DATA.imagem.ativo) {
    document.getElementById("header2").src = DARK_MODE ? FIRESTONE_DATA.imagem.escuro : FIRESTONE_DATA.imagem.claro;
    document.getElementById("header1").style.display = "none";
    document.getElementById("header2").style.display = "block";
  }
}

function _loadModules() {
  // About
  if (FIRESTONE_DATA.modulos.sobre) {
    document.getElementById("keypointsNav").innerHTML = "";
    _loadAboutModule();
    CALL_SYNC.push(_loadAbout);
    CALL_SYNC.push(_loadTransportationModule);
    CALL_SYNC.push(_loadKeypointsIntegrated);
  } else {
    document.getElementById("aboutNav").innerHTML = "";
    document.getElementById("about").innerHTML = "";
    document.getElementById("about").style.display = "none";
  }

  // Keypoints
  if (FIRESTONE_DATA.modulos.resumo) {
    CALL_SYNC.push(_loadKeypointsStandAlone);
  } else {
    document.getElementById("keypointsNav").innerHTML = "";
    document.getElementById("keypoints").innerHTML = "";
    document.getElementById("keypoints").style.display = "none";
  }

  // Cities
  if (FIRESTONE_DATA.cidades.length <= 1) {
    document.getElementById("cities").innerHTML = "";
    document.getElementById("cities").style.display = "none";
  }

  // Flights
  if (FIRESTONE_DATA.modulos.voos) {
    CALL_SYNC.push(_loadFlightsModule);
  } else {
    document.getElementById("flightsNav").innerHTML = "";
    document.getElementById("flights").innerHTML = "";
    document.getElementById("flights").style.display = "none";
  }

  // Stay
  if (!FIRESTONE_DATA.modulos.hospedagens) {
    document.getElementById("stayNav").innerHTML = "";
    document.getElementById("stay").innerHTML = "";
    document.getElementById("stay").style.display = "none";
  }

  // Costs
  if (FIRESTONE_DATA.modulos.custos) {
    CALL_SYNC.push(_loadCostModule);
  } else {
    document.getElementById("costsNav").innerHTML = "";
    document.getElementById("costs").innerHTML = "";
    document.getElementById("costs").style.display = "none";
  }

  // Schedule: Calendar
  if (FIRESTONE_DATA.modulos.programacao) {
    CALL_SYNC.push(_loadScheduleCalendar);
  } else {
    document.getElementById("scheduleCalendarNav").innerHTML = "";
    document.getElementById("scheduleCalendar").innerHTML = "";
    document.getElementById("scheduleCalendar").style.display = "none";
  }

  // Places
  _loadPlacesHTML(FIRESTONE_DATA.cidades[0]);
  _loadPlacesSelect();
  CALL_SYNC.push(_loadPlaces);
  CALL_SYNC.push(_loadPlacesData);
  CALL_SYNC.push(_loadHyperlinks);

  // Gallery
  if (!FIRESTONE_DATA.modulos.galeria) {
    document.getElementById("galleryNav").innerHTML = "";
    document.getElementById("gallery").innerHTML = "";
    document.getElementById("gallery").style.display = "none";
  }
}