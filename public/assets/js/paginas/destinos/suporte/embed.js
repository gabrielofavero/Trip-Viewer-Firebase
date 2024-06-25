var MEDIA_HYPERLINKS = {};

// Loader
function _loadEmbed(link, isLineup, i) {
    let result = "";

    if (isLineup) {
        result = _getLineupEmbed(link);
    } else {
        result = _getEmbed(link);
    }

    if (result) {
        MEDIA_HYPERLINKS[`midia-${i}`] = result;
    }
}


// Actions
function _loadMedia(id) {
    const div = getID(id);
    if (div && MEDIA_HYPERLINKS[id] && MEDIA_HYPERLINKS[id].conteudo) {
        div.innerHTML = MEDIA_HYPERLINKS[id].conteudo;
    }
}

function _unloadMedia(id) {
    div = getID(id);
    if (div) {
        div.innerHTML = "";
    }
}

function _unloadMedias(exclude) {
    for (const j of _getJs('content')) {
        if (j !== exclude) {
            _unloadMedia(`midia-${j}`);
        }
    }
}


// Support Functions
function _getLineupEmbed(link) {
    if (link.includes("open.spotify.com")) {
        return {
            tipo: "spotify",
            conteudo: _getSpotifyEmbed(link)
        }
    } else return "";
}

function _getEmbed(link) {
    let tipo = "";
    let conteudo = "";

    if (!link) return "";

    if ((link.includes("youtu.be/") || link.includes("youtube.com")) && (!link.includes("/shorts/"))) {
        tipo = "youtube";
        conteudo = _getVideoEmbedYoutube(link);
    } else if (link.includes("tiktok")) {
        tipo = "tiktok";
        conteudo = _getVideoEmbedTikTok(link);
    }

    if (conteudo) {
        return {
            tipo: tipo,
            conteudo: conteudo
        }
    } else return "";
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
        return _getIframe(url, "youtube-embed");
    } else return "";
}

function _getSpotifyEmbed(link) {
    let typeAndID = link.split("spotify.com/")[1].split("?")[0];
    return `<iframe class="spotify" style="border-radius:12px" src="https://open.spotify.com/embed/${typeAndID}?utm_source=generator" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
}

function _getIframe(url, iframeClass = "") {
    if (url) {
        const classItem = iframeClass ? `class="${iframeClass}"` : "";
        return `<iframe ${classItem} src="${url}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    } else return "";
}

function _getVideoEmbedTikTok(link, version=3) {
    let videoID = "";
    if (!link.includes("vm.")) {
        try {
            videoID = link.split("/video/")[1].split("?")[0];
        } catch (e) {
            console.error(`Cannot get TikTok video ID from '${link}'`);
        }
    } else {
        console.error(`Short TikTok videos are not supported. Please fix the link for '${link}'`);
    }
    if (videoID) {
        let url = `https://www.tiktok.com/embed/v${version}/${videoID}`;
        return _getIframe(url, `tiktok-embed-v${version}`);
    } else return "";
}