var LOADING_TIMER;
var LOADING_SECONDS = 0;

// Loading Screen

function _startLoadingScreen(useTimer = true) {
  if (useTimer) {
    _startLoadingTimer();
  }
  const preloader = getID('preloader');
  if (preloader) {
    preloader.style.display = 'block';
    _disableScroll();
  }
}

function _stopLoadingScreen() {
  _stopLoadingTimer();
  localStorage.setItem('firstLoad', 'true');
  if (!MESSAGE_MODAL_OPEN) {
    const preloader = getID('preloader');
    if (preloader) {
      preloader.style.display = 'none';
      _enableScroll();
    }
  } else {
    console.warn('Cannot stop loading in error mode');
  }
}

// Loading Timer
function _startLoadingTimer() {
  if (LOADING_TIMER == null && MESSAGE_MODAL_OPEN == false) {
    LOADING_SECONDS = 0;
    LOADING_TIMER = setInterval(() => {
      const firstLoad = localStorage.getItem('firstLoad');
      LOADING_SECONDS++;
      if (LOADING_SECONDS >= 10 && (firstLoad == 'true' || firstLoad == null)) {
        _stopLoadingTimer();
        localStorage.setItem('firstLoad', 'false');
        window.location.reload();
      } else if (LOADING_SECONDS >= 10 && firstLoad == 'false') {
        _stopLoadingTimer();
        localStorage.setItem('firstLoad', 'true');
        const error = new Error('Não foi possível carregar a página. Verifique sua conexão com a internet e tente novamente');
        _displayError(error, true);
      }
    }, 1000);
  }
}

function _stopLoadingTimer() {
  if (LOADING_TIMER) {
    clearInterval(LOADING_TIMER);
    LOADING_TIMER = null;
  }
}