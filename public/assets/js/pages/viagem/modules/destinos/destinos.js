var P_RESULT = {};
var PLACES_FILTERED_SIZE;
var CURRENT_PLACES_SIZE = 0;
var DESTINOS = [];
var DESTINO_EXPORT = {};

// ======= LOADERS =======
function _loadDestinos() {
  for (let i = 0; i < DESTINOS.length; i++) {
    P_RESULT[DESTINOS[i].destinos.destinosID] = DESTINOS[i].destinos;
  }

  if (DESTINOS.length % 2 === 1) { // Ímpar
    getID('destinosBox').classList.add('centered-destino-box');
  }

  if (DESTINOS.length === 1 && getID("destinos-select").style.display === 'none'
    && _getChildIDs('destinosBox').length <= 1) {
    getID('destinosTitleContainer').style.display = 'none';
  }

  window.addEventListener("resize", function () {
    _adjustDestinationsHTML();
  });
}

function _loadDestinationsSelect(lineupExclusive = false) {
  let select = getID("destinos-select");
  let firstOption = document.createElement("option");
  _buildDestinosObject(lineupExclusive);

  firstOption.value = DESTINOS[0].destinosID;
  firstOption.text = DESTINOS[0].destinos.titulo;
  select.add(firstOption);
  firstOption.selected = true;

  if (DESTINOS.length > 1) {
    for (let i = 1; i < DESTINOS.length; i++) {
      let newOption = document.createElement("option");

      newOption.value = DESTINOS[i].destinosID;
      newOption.text = DESTINOS[i].destinos.titulo;
      select.add(newOption);
    };
  } else {
    select.style.display = "none";
  };

  select.addEventListener("change", function () {
    for (let i = 0; i < DESTINOS.length; i++) {
      if (DESTINOS[i].destinosID === select.value) {
        _loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
        _adjustDestinationsHTML();
        break;
      }
    }
  });
}

function _loadDestinationsHTML(destino) {
  let div = getID("destinosBox");
  let text = "";

  const headers = _getDestinationsHeaders(destino.destinos.modulos);
  CURRENT_PLACES_SIZE = headers.length;

  let linktype = _getLinkType();

  for (let i = 0; i < headers.length; i++) {
    const code = headers[i];
    _buildDestinoExport(destino, code)

    const j = i + 1;
    const box = CONFIG.destinos.boxes[_getDestinationsBoxesIndex(i)];
    const title = CONFIG.destinos.destinos[headers[i]]["title"];
    const href = code === "mapa" ? destino.destinos.myMaps : "#";
    const lt = code === "mapa" ? linktype : "";
    const onclick = code === "mapa" ? "" : `onclick="_loadAndOpenDestino('${code}')"`;
    const icon = CONFIG.destinos.destinos[headers[i]]["icon"];
    const description = CONFIG.destinos.destinos[headers[i]]["description"];

    text += `
    <div class="col-lg-4 col-md-6 d-flex align-items-stretch" data-aos="zoom-in" data-aos-delay="100" id="b${j}">
    <a href="${href}" ${lt} ${onclick} id="ba${j}">
        <div class="icon-box iconbox-${box.color}" id="ib${j}">
          <div class="icon">
            <svg width="100" height="100" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
              <path stroke="none" stroke-width="0" fill="#f5f5f5" d="${box.d}"></path>
            </svg>
            <i class="${icon}"></i>
          </div>
          <div id="b${j}t"><h4>${title}</h4></div>
          <div id="b${j}d"><p>${description}</p></div>
        </div>
      </a>
    </div>`;
  }

  div.innerHTML = text;
  _adjustDestinationsHTML();
}

function _buildDestinoExport(destino, code) {
  DESTINO_EXPORT[code] = {
    data: destino.destinos[code],
    moeda: destino.destinos.moeda,
    valores: CONFIG.destinos.currency[destino.destinos.moeda] || CONFIG.destinos.currency["R$"],
    notas: CONFIG.destinos.settings.scores,
    categoria: code,
    descricao: CONFIG.destinos.destinos[code],
  }
}

function _loadAndOpenDestino(code) {
  window.localStorage.setItem('DESTINO', JSON.stringify(DESTINO_EXPORT[code]));
  _openLightbox('destinos.html')
}

function _getDestinationsHeaders(module) {
  const headerBase = ['restaurantes', 'lanches', 'saidas', 'turismo', 'lojas', "lineup", 'mapa']
  const headerMap = new Map(headerBase.map((element, index) => [element, index]));

  let result = [];
  const keys = Object.keys(module);

  for (const key of keys) {
    if (module[key] === true) {
      result.push(key)
    }
  }

  return result.sort((a, b) => headerMap.get(a) - headerMap.get(b));
}

function getDestinationsSelectValue() {
  let select = getID("destinos-select");
  return select.value || DESTINOS[0].destinosID;
}

function _getDestinationsBoxesIndex(i) {
  if (i > CONFIG.destinos.boxes.length - 1) {
    return i % CONFIG.destinos.boxes.length;
  } else return i
}

function _getLinkType() {
  if (_isIOSDevice()) {
    return "";
  } else {
    return "target='_blank'";
  }
}

function _mergeSetlistObjects(obj1, obj2) {
  let result = {
    descricao: [],
    head: [],
    horario: [],
    hyperlink: {
      name: []
    },
    nome: [],
    nota: [],
    palco: [],
    site: [],
  };

  // Iterate over the keys of the result object
  Object.keys(result).forEach(key => {
    if (key === 'hyperlink') {
      // Special handling for the 'hyperlink' object
      result[key].name = [...obj1[key].name, ...obj2[key].name];
    } else {
      // Merge arrays from both objects for this key
      result[key] = [...obj1[key], ...obj2[key]];
    }
  });

  return result;
}

function _buildDestinosObject(lineupExclusive = false) {
  if (lineupExclusive) {
    _buildLineupDestinosObject();
  }
  else {
    DESTINOS = FIRESTORE_DATA.destinos;
  }
  if (FIRESTORE_DATA.modulos.lineup && FIRESTORE_DATA.lineup) {
    const lineupKeys = Object.keys(FIRESTORE_DATA.lineup);
    for (let i = 0; i < DESTINOS.length; i++) {
      if (lineupKeys.includes(DESTINOS[i].destinosID) || lineupKeys.includes('generico')) {
        DESTINOS[i].destinos.modulos.lineup = true;
        const genericoLineup = FIRESTORE_DATA.lineup.generico;
        const destinoLineup = FIRESTORE_DATA.lineup[DESTINOS[i].destinosID];

        if (destinoLineup && genericoLineup) {
          const mergedSetlist = _mergeSetlistObjects(genericoLineup, destinoLineup);
          DESTINOS[i].destinos.lineup = mergedSetlist;
        } else {
          DESTINOS[i].destinos.lineup = destinoLineup || genericoLineup;
        }
      }
    }
  }
}

function _buildLineupDestinosObject() {
  const emptyObj = {
    "valor": [],
    "hyperlink": {
      "video": [],
      "name": []
    },
    "nome": [],
    "regiao": [],
    "novo": [],
    "emoji": [],
    "nota": [],
    "descricao": []
  }
  DESTINOS = [{
    destinosID: "lineup",
    destinos: {
      "compartilhamento": {
        "dono": FIRESTORE_DATA.compartilhamento.dono,
      },
      "saidas": emptyObj,
      "lojas": emptyObj,
      "modulos": {
        "lineup": true,
        "lanches": false,
        "mapa": false,
        "lojas": false,
        "saidas": false,
        "turismo": false,
        "restaurantes": false
      },
      "turismo": emptyObj,
      "titulo": "Lineup",
      "versao": {
        "ultimaAtualizacao": new Date().toISOString(),
      },
      "lanches": emptyObj,
      "restaurantes": emptyObj,
      "moeda": "R$",
      "lineup": FIRESTORE_DATA.lineup.generico,
      "myMaps": ""
    }
  }
  ];
}

// ======= SETTERS =======
function _adjustDestinationsHTML() {
  let heights = [];
  let maxHeight = 0;

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    let height = getID(`b${i}d`).offsetHeight;
    if (height > maxHeight) {
      maxHeight = height;
    }
    heights.push(height);
  }

  for (let i = 1; i <= CURRENT_PLACES_SIZE; i++) {
    getID(`b${i}d`).style.height = `${maxHeight}px`;
  }
}