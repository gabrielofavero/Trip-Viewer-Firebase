// ======= Lightbox JS =======

var savedScrollPosition = 0;

function _openLightbox(link) {
  _startLoadingScreen(false);
  savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  var lightboxIframe = getID('lightbox-iframe');
  lightboxIframe.src = 'about:blank';
  lightboxIframe.onload = function () {
    getID('lightbox').style.display = 'block';
    getID('night-mode').style.display = 'none';
    getID('menu').style.display = 'none';
    getID('navbar').style.display = 'none';
    _stopLoadingScreen();
    _disableScroll();
  };
  lightboxIframe.src = link;
}

function _closeLightbox() {
  getID('lightbox').style.display = 'none';
  getID('night-mode').style.display = 'block';
  getID('menu').style.display = 'block';
  getID('navbar').style.display = 'block';
  _enableScroll();
  window.scrollTo({
    top: savedScrollPosition,
    behavior: 'instant'
  });
}