var SAVED_SCROLL_POSITION = 0;

function _openViewEmbed(url) {
  const frameID = 'lightbox-iframe';
  const newTab = true;
  const beforeOpen = () => {
    SAVED_SCROLL_POSITION = window.pageYOffset || document.documentElement.scrollTop;
    _startLoadingScreen();
    window.scrollTo(0, 0);
  };
  const onLoad = () => {
    getID('lightbox').style.display = 'block';
    getID('night-mode').style.display = 'none';
    getID('menu').style.display = 'none';
    getID('navbar').style.display = 'none';
    _stopLoadingScreen();
    _disableScroll();
  }
  const afterOpen = _refreshVisibility;

  _openEmbed({ frameID, url, beforeOpen, onLoad, afterOpen, newTab });
}

function _closeViewEmbed(redirectToHome = false) {
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