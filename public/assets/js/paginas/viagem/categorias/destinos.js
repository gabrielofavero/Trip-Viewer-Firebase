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
  _buildDestinosObject(lineupExclusive);
  const select = getID("destinos-select");

  if (DESTINOS.length > 1) {
    const ordem = _getDestinosOrdem();
    let destinos = ordem.length === 0 ? DESTINOS : DESTINOS.sort((a, b) => {
      if (ordem.includes(a.destinos.titulo) && ordem.includes(b.destinos.titulo)) {
        return ordem.indexOf(a.destinos.titulo) - ordem.indexOf(b.destinos.titulo);
      }
      if (ordem.includes(a.destinos.titulo)) return -1;
      if (ordem.includes(b.destinos.titulo)) return 1;
      return 0;
    });

    for (let i = 0; i < destinos.length; i++) {
      const option = document.createElement("option");
      option.value = destinos[i].destinosID;
      option.text = destinos[i].destinos.titulo;
      option.selected = i === 0;
      select.add(option);
    }

    select.addEventListener("change", function () {
      for (let i = 0; i < destinos.length; i++) {
        if (destinos[i].destinosID === select.value) {
          _loadDestinationsHTML(FIRESTORE_DATA.destinos[i]);
          _adjustDestinationsHTML();
          break;
        }
      }
    });

  } else {
    select.style.display = "none";
  }
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
    notas: CONFIG.destinos.notas,
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
    midia: [],
    nome: [],
    nota: [],
    palco: [],
    site: [],
  };

  // Iterate over the keys of the result object
  Object.keys(result).forEach(key => {
    result[key] = [...obj1[key], ...obj2[key]];
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
    "midia": [],
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

function _getDestinosOrdem() {
  const ordem = [];

  // if (FIRESTORE_DATA.modulos.programacao && FIRESTORE_DATA.programacoes && FIRESTORE_DATA.programacoes.length > 0) {
  //   const destinosObjects = FIRESTORE_DATA.programacoes.map(programacao => programacao.destinosIDs).flat(1);
  //   const filteredDestinos = [];

  //   // To-Do

  //   idsProgramacao = idsProgramacao.filter((id, index) => id !== "" && idsProgramacao.indexOf(id) === index);
  //   const idsDestinos = DESTINOS.map(destino => destino.destinosID);
  //   for (const programacao of idsProgramacao) {
  //     const index = idsDestinos.indexOf(programacao);
  //     if (index !== -1 && !ordem.includes(DESTINOS[index].destinos.titulo)) {
  //       ordem.push(DESTINOS[index].destinos.titulo);
  //     }
  //   }
  // }

  return ordem;
}