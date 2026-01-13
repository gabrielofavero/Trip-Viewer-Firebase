function _loadEmbedListeners(action) {
  window.addEventListener("message", (e) => _onEmbedMessage(e, action));
}

function _openEmbed({ frameID, url, beforeOpen, onLoad, afterOpen, newTab = false }) {
  const iframe = document.getElementById(frameID);
  if (!iframe) return;

  beforeOpen?.();

  if (newTab) {
    iframe.src = "about:blank";
  }

  iframe.onload = function () {
    onLoad?.();
  };

  iframe.src = url;
  afterOpen?.();
}

function _onEmbedMessage(event, action) {
  const allowedOrigin = window.location.origin;
  if (event.origin !== allowedOrigin) return;

  const data = event.data;

  if (!data || typeof data !== "object" || !data.type) return;

  action(data);
}

function _sendToParent(type, value) {
  const page = window.location.pathname.replace('/', '');
  window.parent.postMessage({ page, type, value }, window.location.origin);
}

function _sendToEmbed(type, value) {
  const iframe = document.querySelector("#expenses-lightbox iframe");
  if (!iframe || !iframe.contentWindow) return;

  iframe.contentWindow.postMessage(
    {
      type,
      value
    },
    window.location.origin
  );
}