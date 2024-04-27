var MEDIA_HYPERLINKS = {};

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
  div = document.getElementById(`media-${i}`);
  if (div) {
    div.innerHTML = MEDIA_HYPERLINKS[id];
  }
}

function _unloadMedia(i) {
  div = document.getElementById(`media-${i}`);
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