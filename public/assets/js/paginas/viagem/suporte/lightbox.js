var SAVED_SCROLL_POSITION = 0;

function _openLightbox(link) {
  _startLoadingScreen();
  SAVED_SCROLL_POSITION = window.pageYOffset || document.documentElement.scrollTop;
  window.scrollTo(0, 0);
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
  _refreshVisibility();
}

function _closeLightbox(redirectToHome = false) {
  _refreshVisibility();
  getID('lightbox').style.display = 'none';
  getID('night-mode').style.display = 'block';
  getID('menu').style.display = 'block';
  getID('navbar').style.display = 'block';
  _enableScroll();

  if (redirectToHome) {
    window.location.href = '/';
  } else {
    window.scrollTo({
      top: SAVED_SCROLL_POSITION,
      behavior: 'instant'
    });
  }
}

function _loadImageLightbox(className) {
  GLightbox({
    selector: `.${className}`,
    autofocusVideos: false,
    touchNavigation: true,
    touchFollowAxis: true,
    width: 'auto',
    height: 'auto'
  });
}