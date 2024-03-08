// ======= Destinations HTML JS =======

var MEDIA_HYPERLINKS = [];

// ======= LOADERS =======
function _loadP() {
  _loadVisibilityPasseio();

  document.getElementById("closeButton").onclick = function () {
    window.parent._closeLightbox();
  };

  document.getElementById("logo-link").onclick = function () {
    window.parent._closeLightbox();
  };

  const NOME = "nome";
  const REGIAO = "regiao";
  const DESCRICAO = "descricao";
  const DUO = "duo";
  const VEG = "veg";
  const VALOR = "valor";
  const VISITADO = "visitado";
  const NOTA = "nota";
  const HYPERLINK = "hyperlink";
  const HEAD = "head";
  const HORARIO = "horario";
  const PALCO = "palco";
  const WEED = "weed";
  const EMOJI = "emoji";
  const NOVO = "novo";

  var P_RESULT = JSON.parse(window.localStorage.getItem('P_RESULT'));
  const CURRENCY_JSON = JSON.parse(window.localStorage.getItem('CURRENCY_JSON'));
  const DESTINOS_JSON = JSON.parse(window.localStorage.getItem('PLACES_JSON'));
  const DESTINOS_CONFIGS_JSON = JSON.parse(window.localStorage.getItem('PLACES_SETTINGS_JSON'));
  var HTML_PARAMS = _getParamsHTML();
  var CITY = HTML_PARAMS["destino"];
  var TYPE = HTML_PARAMS["type"];
  var TYPE_TITLE = DESTINOS_JSON[TYPE].title;
  var TYPE_SUBTITLE = DESTINOS_JSON[TYPE].subtitle;
  var DESTINO = P_RESULT[CITY][TYPE];
  var CURRENCY = window.localStorage.getItem('CURRENCY');

  if (DESTINO) {
    let result = [];

    document.title = TYPE_TITLE;
    document.getElementById("titleP").innerHTML = "<h2>" + document.title + "</h2>";
    if (TYPE_SUBTITLE) {
      document.getElementById("subTitleP").innerHTML = "<h5>" + TYPE_SUBTITLE + "</h5>";
    }

    var MOEDA_OBJ = CURRENCY_JSON[CURRENCY] || CURRENCY_JSON["R$"];
    var NOTAS_OBJ = DESTINOS_CONFIGS_JSON["scores"];
    var SINGLE_SCORES_OBJ = _getSingleScoresObj(DESTINO, NOTAS_OBJ);

    let P_NOME = DESTINO[NOME];
    let P_NOTA = DESTINO[NOTA];
    let P_VALOR = DESTINO[VALOR];
    let P_VISITADO = DESTINO[VISITADO];
    let P_HYPERLINK = DESTINO[HYPERLINK];
    let P_DESCRICAO = DESTINO[DESCRICAO];
    let P_REGIAO = DESTINO[REGIAO];
    let P_DUO = DESTINO[DUO];
    let P_VEG = DESTINO[VEG];
    let P_HEAD = DESTINO[HEAD];
    let P_HORARIO = DESTINO[HORARIO];
    let P_PALCO = DESTINO[PALCO];
    let P_WEED = DESTINO[WEED];
    let P_EMOJI = DESTINO[EMOJI];
    let P_NOVO = DESTINO[NOVO];

    let novoExists = _newExists(P_NOVO);

    for (let i = 0; i < DESTINO[NOME].length; i++) {

      // Required
      let nome = P_NOME[i];
      let nota = _getScore(P_NOTA[i], DESTINOS_CONFIGS_JSON, SINGLE_SCORES_OBJ, i);
      let notaNumerica = _getNumericScore(nota);
      let cor = _getScoreColor(nota);

      // Optional
      let valor = P_VALOR ? _getCost(P_VALOR[i], MOEDA_OBJ) : "";
      let nomeHyperlink = _getHyperlinkItem(P_HYPERLINK, i, "name");
      let embed = _getHyperlinkItem(P_HYPERLINK, i, "video");
      let descricao = P_DESCRICAO ? _AdaptNulls(P_DESCRICAO[i]) : "";
      let visitado = _replace(P_VISITADO, i, "✓");
      let duo = _replace(P_DUO, i, "Aceita Duo Gourmet");
      let regiao = P_REGIAO ? _AdaptNulls(P_REGIAO[i]) : "";
      let horario = P_HORARIO ? _AdaptNulls(P_HORARIO[i]) : "";
      let palco = P_PALCO ? _AdaptNulls(P_PALCO[i]) : "";
      let veg = _replace(P_VEG, i, "🌱");
      let head = _replace(P_HEAD, i, "⭐");
      let weed = _replace(P_WEED, i, "🌿");
      let emoji = P_EMOJI ? _AdaptNulls(P_EMOJI[i]) : "";

      let nameEmojis = emoji + visitado + veg + weed + head;
      let detalhes = _getDetails([regiao, horario, palco, duo]);

      if (novoExists) {
        let novo = _replace(P_NOVO, i, "Novo!");
        nota = novo ? novo : "";
      }

      _loadEmbed(embed, nome, nomeHyperlink);

      let isSpotify = _isSpotify(nomeHyperlink);
      if (isSpotify && !embed) {
        nomeHyperlink = "";
      } else if (isSpotify && embed) {
        _logger(WARN, `Spotify link found for DESTINO '${nome}', but video link already exists. Ignoring Spotify link.`)
      }

      innerResult = {
        "nome": nome,
        "nameEmojis": nameEmojis,
        "nota": nota,
        "notaNumerica": notaNumerica,
        "cor": cor,
        "valor": valor,
        "nameHyperlink": nomeHyperlink,
        "descricao": descricao,
        "detalhes": detalhes,
      }
      result.push(innerResult);
    }

    result.sort(function (a, b) {
      return b.notaNumerica - a.notaNumerica || a.nome.localeCompare(b.nome); // Ordena por Nota (Desc) e Nome (Asc)
    });

    _setInnerHTML(result);
  } else {
    _logger(ERROR, "O Código não foi localizado na base de dados");
  }
}

// ======= GETTERS =======
function _getCost(valor, MOEDA_OBJ) {
  let result;
  let defaultResult;
  if (valor && MOEDA_OBJ) {
    result = MOEDA_OBJ[valor];
    defaultResult = MOEDA_OBJ["default"];
  }
  return result || defaultResult || "Valor Desconhecido";
}

function _getDetails(detailsArray) {
  let text = "";
  let real = -1;
  for (let i = 0; i < detailsArray.length; i++) {
    if (detailsArray[i]) {
      real++;
      let separator = real == 0 ? "" : "<br>";
      text += separator + detailsArray[i];
    }
  }
  return `<div id="details">${text}</div>`
}

function _getParamsHTML() {
  let result = {};
  let params = window.location.href.split('?')[1].split('&');
  for (let param of params) {
    let key = param.split('=')[0];
    let value = param.split('=')[1];
    result[key] = value;
  }
  return result;
}

function _getHyperlinkItem(hyperlinkArray, index, item) {
  let result = "";
  if (hyperlinkArray && hyperlinkArray[item]) {
    let hyperlinkValue = hyperlinkArray[item][index];
    if (hyperlinkValue) {
      result = hyperlinkValue;
    }
  }
  return result;
}

function _getNameHyperlinkHTML(name, hyperlink) {
  if (hyperlink) {
    return `<a id="title" href="${hyperlink}" target="_blank">${name}</a>`
  } else return `<div id="title-no-link">${name}</div>`
}

// ======= SETTERS =======
function _interactWithAccordion(i) {
  const div = $('#collapse-' + i);
  
  if (div && div.hasClass('opened')) {
    div.collapse('toggle');
    div.removeClass('opened');
    _unloadMedia(i);
  } else if (div && !div.hasClass('opened')) {
    div.addClass('opened');
    _loadMedia(i);
    div.collapse('toggle');
  }
  
}

function _setInnerHTML(result) {
  let resultText = "";
  for (let i = 0; i < result.length; i++) {
    resultText += `
    <div id="accordion">
      <div class="card">
        <div id="headerP" onclick=_interactWithAccordion(${i})>
          <div class="card-header" id="heading-${i}">
            <h5 class="mb-0">
                <button class="btn btn-link" data-toggle="collapse" data-target="#collapse-${i}" aria-expanded="true"
                aria-controls="collapse-${i}">
                ${result[i].nome + " " + result[i].nameEmojis}
                </button></h5>
            </div>
            <div style="background-color: ${result[i].cor};" class="score" id="score-${i}">${result[i].nota}</div>
        </div>
        <div id="collapse-${i}" class="collapse collapsed" aria-labelledby="heading-${i}" data-parent="#accordion">
          <div class="card-body" id="pText${i}">
            ${_getNameHyperlinkHTML(result[i].nome, result[i].nameHyperlink)}
            <div class="subtitle">
              <div id="money">${result[i].valor}</div>
              ${result[i].detalhes}
              <br>
            </div>
            ${result[i].descricao}
            <div id="media-${i}"></div>
          </div>
        </div>
      </div>
    </div>`
  }
  document.getElementById("content").innerHTML = resultText;
  _adaptHeight();
}

// ======= FORMATTERS =======
function _AdaptNulls(text) {
  if (!text) {
    return "";
  } else {
    return text;
  }
}

function _adaptHeight() {
  let divsSize = document.getElementById("content").children.length;
  for (let i = 1; i <= divsSize; i++) {
    let score = document.getElementById("score" + i);
    let heading = document.getElementById("heading" + i);
    if ((score && heading) && (score.clientHeight != heading.clientHeight)) {
      score.style.height = heading.clientHeight + "px";
    }
  }
}

function _replace(text, index, what) {
  if (text && text[index]) {
    return what;
  } else return "";
}

// ======= CHECKER =======
function _newExists(P_NOVO) {
  let result = false;
  if (P_NOVO && P_NOVO.length > 0) {
    for (let line of P_NOVO) {
      if (line) {
        result = true;
        break;
      }
    }
  }
  return result;
}