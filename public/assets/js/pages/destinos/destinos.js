var DESTINO = JSON.parse(window.localStorage.getItem('DESTINO'));
var MEDIA_HYPERLINKS = {};

// Métodos Principais
function _loadDestinosHTML() {
  _loadVisibilityPasseio();

  getID("closeButton").onclick = function () {
    window.parent._closeLightbox();
  };

  getID("logo-link").onclick = function () {
    window.parent._closeLightbox();
  };

  if (DESTINO && Object.keys(DESTINO).length > 0) {
    let result = [];

    document.title = DESTINO.descricao.title;
    getID("titleP").innerHTML = "<h2>" + document.title + "</h2>";
    if (DESTINO.descricao.subtitle) {
      getID("subTitleP").innerHTML = "<h5>" + DESTINO.descricao.subtitle + "</h5>";
    }

    const novoExists = _newExists(DESTINO.data.novo);
    const data = DESTINO.data;

    for (let i = 0; i < data.nome.length; i++) {

      // Required
      let nome = data.nome[i];
      let nota = _getNota(data.nota[i]);
      let notaNumerica = _getNotaNumerica(nota);
      let cor = _getNotaCor(nota);

      // Optional
      let valor = _getValor(data.valor[i]);
      let nomeHyperlink = _getHyperlinkItem("name", i);
      let embed = _getHyperlinkItem("video", i);
      let descricao = data.descricao[i] || "";
      let regiao = data.regiao[i] || "";
      let emoji = data.emoji ? data.emoji[i] || "" : "";

      // Lineup
      let horario = data.horario ? data.horario[i] || "" : "";
      let palco = data.palco ? data.palco[i] || "" : "";
      let head = data.head && data.head[i] ? "⭐" : "";

      let nameEmojis = `${emoji} ${head}`.trim();
      let detalhes = _getDetalhes([regiao, horario, palco]);

      if (novoExists) {
        nota = data.novo && data.novo[i] ? "Novo!" : "";
      }

      _loadEmbed(embed, nome, nomeHyperlink, i);

      if (_isSpotify(nomeHyperlink)) {
        if (embed) {
          console.warn(`Playlist Spotify encontrada em '${nome}', mas não será exibida pois já existe uma mídia associada.`)
        } else {
          nomeHyperlink = "";
        }
      }

      innerResult = {
        "id": i,
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

    _setDestinosInnerHTML(result);
  } else {
    console.error("O Código não foi localizado na base de dados");
  }
}

function _setDestinosInnerHTML(result) {
  let resultText = "";
  for (let i = 0; i < result.length; i++) {
    resultText += `
    <div class="accordion">
      <div class="card">
        <div class="headerP" onclick=_interactWithAccordion(${i},${result[i].id})>
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
              <div class="money">${result[i].valor}</div>
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
  getID("content").innerHTML = resultText;
  _adaptHeight();
}


// Valor
function _getValor(valor) {
  if (valor && DESTINO.valores && DESTINO.valores[valor]) return DESTINO.valores[valor]
  if (valor) return _getCustomValor(valor)
  if (DESTINO.valores) return DESTINO.valores["default"]

  return "Valor Desconhecido";
}

function _getCustomValor(valor) {
  if (isNaN(valor) || (!isNaN(valor) && !DESTINO.moeda)) {
    return valor;
  } else return `${DESTINO.moeda}${valor}`;
}


// Detalhes
function _getDetalhes(detalhesArr) {
  let text = "";
  let real = -1;
  for (let i = 0; i < detalhesArr.length; i++) {
    if (detalhesArr[i]) {
      real++;
      let separator = real == 0 ? "" : "<br>";
      text += separator + detalhesArr[i];
    }
  }
  return `<div class="details">${text}</div>`
}


// Novo
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

// Notas
function _getNotaCor(score) {
  if (score == "?") {
    return "#ead1dc";
  } else {
    let numb = parseInt(score);
    if (numb == 100) {
      return "#CFE2F3";
    } else if (numb >= 75) {
      return "#D9EAD3";
    } else if (numb >= 50) {
      return "#FFF2CC";
    } else if (numb >= 25) {
      return "#FCE5CD";
    } else return "#F4CCCC";
  }
}

function _getNota(score) {
  if (score && !DESTINO.notas.possibleValues.includes(score)) return score;
  switch (score) {
    case "!":
      return "100%";
    case "1":
      return "75%";
    case "2":
      return "50%";
    case "3":
      return "25%";
    case "4":
      return "0%";
    default:
      return "?";
  }
}

function _getNotaNumerica(score) {
  let filteredScore = score.replace("%", "");
  if (!isNaN(filteredScore)) {
    return parseInt(filteredScore);
  } else return -1;
}


// Hyperlink
function _getHyperlinkItem(item, i) {
  let result = "";
  if (DESTINO.data.hyperlink && DESTINO.data.hyperlink[item]) {
    let hyperlinkValue = DESTINO.data.hyperlink[item][i];
    if (hyperlinkValue) {
      result = hyperlinkValue;
    }
  }
  return result;
}

function _getNameHyperlinkHTML(name, hyperlink) {
  if (hyperlink) {
    return `<a class="title" href="${hyperlink}" target="_blank">${name}</a>`
  } else return `<div class="title-no-link">${name}</div>`
}


// Embed
function _loadEmbed(embed, nome, nomeHyperlink, i) {
  let result = "";

  if (embed) {
    result = _getEmbed(embed, nome);
  } else if (nomeHyperlink && _isSpotify(nomeHyperlink)) {
    result = _getSpotifyEmbed(nomeHyperlink);
  }

  MEDIA_HYPERLINKS[i] = result;
}

function _loadMedia(i, id) {
  div = getID(`media-${i}`);
  if (div) {
    div.innerHTML = MEDIA_HYPERLINKS[id];
  }
}

function _unloadMedia(i) {
  div = getID(`media-${i}`);
  if (div) {
    div.innerHTML = "";
  }
}

function _getEmbed(embed, name) {
  let result = "";
  if (embed.includes("youtu.be/") || embed.includes("youtube.com")) {
    result = _getVideoEmbedYoutube(embed);
  } else if (embed.includes("tiktok")) {
    result = _getVideoEmbedTikTok(embed, name);
  } else if (embed) {
    result = _getGenericLink(embed);
  }
  return result;
}

function _getVideoEmbedYoutube(videoLink) {
  let videoID = "";
  if (videoLink && videoLink.includes("youtu.be/")) {
    videoID = videoLink.split("youtu.be/")[1].split("&")[0];
  } else if (videoLink && videoLink.includes("youtube.com")) {
    videoID = videoLink.split("v=")[1].split("&")[0];
  }
  if (videoID) {
    let url = `https://www.youtube.com/embed/${videoID}`;
    return _getIframe(url, "youtube");
  } else return "";
}

function _getVideoEmbedTikTok(videoLink, name) {
  let videoID = "";
  if (!videoLink.includes("vm.")) {
    try {
      videoID = videoLink.split("/video/")[1].split("?")[0];
    } catch (e) {
      console.error(`Cannot get TikTok video ID from '${name}'`);
    }
  } else {
    console.error(`Short TikTok videos are not supported. Please fix the link for '${name}'`);
  }
  if (videoID) {
    let url = `https://www.tiktok.com/embed/v3/${videoID}`;
    return _getIframe(url, "tiktok")
  } else return "";
}

function _getSpotifyEmbed(link) {
  let typeAndID = link.split("spotify.com/")[1].split("?")[0];
  return `<iframe class="spotify" style="border-radius:12px" src="https://open.spotify.com/embed/${typeAndID}?utm_source=generator" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
}

function _getGenericLink(videoLink) {
  return `<a href="${videoLink}">${_extractDomain(videoLink)}</a>`;
}

function _getIframe(url, iframeClass = "") {
  if (url) {
    let classItem = iframeClass ? `class="${iframeClass}"` : "";
    return `<br><iframe ${classItem} src="${url}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
  } else return "";
}

function _extractDomain(url) {
  var domain;
  if (url.indexOf("://") > -1) {
    domain = url.split('/')[2];
  } else {
    domain = url.split('/')[0];
  }

  domain = domain.split(':')[0];
  domain = domain.replace("www.", "");
  domain = domain.split('.')[0];

  return _firstCharToUpperCase(domain);
}

function _isSpotify(link) {
  return link && link.includes("open.spotify.com");
}


// Navegação
function _interactWithAccordion(i, id) {
  const div = $('#collapse-' + i);

  if (div && div.hasClass('opened')) {
    div.collapse('toggle');
    div.removeClass('opened');
    _unloadMedia(i);
  } else if (div && !div.hasClass('opened')) {
    div.addClass('opened');
    _loadMedia(i, id);
    div.collapse('toggle');
  }

}


// Formatadores
function _adaptHeight() {
  let divsSize = getID("content").children.length;
  for (let i = 1; i <= divsSize; i++) {
    let score = getID("score" + i);
    let heading = getID("heading" + i);
    if ((score && heading) && (score.clientHeight != heading.clientHeight)) {
      score.style.height = heading.clientHeight + "px";
    }
  }
}