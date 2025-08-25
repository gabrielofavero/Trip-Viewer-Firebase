import { getID } from "./selectors.js";
import { translate } from "../../main/translate.js";
import { MESSAGE_MODAL_OPEN } from "./mensagens.js";

var LOADING_TIMER;
var LOADING_SECONDS = 0;

export function startLoadingScreen(useTimer = false) {
  if (useTimer) {
    startLoadingTimer();
  }
  const preloader = getID('preloader');
  if (preloader) {
    preloader.style.display = 'block';
    _disableScroll();
  }
}

export function stopLoadingScreen() {
  stopLoadingTimer();
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

export function startLoadingTimer() {
  if (LOADING_TIMER == null && MESSAGE_MODAL_OPEN == false) {
    LOADING_SECONDS = 0;
    LOADING_TIMER = setInterval(() => {
      const firstLoad = localStorage.getItem('firstLoad');
      LOADING_SECONDS++;
      if (LOADING_SECONDS >= 10 && (firstLoad == 'true' || firstLoad == null)) {
        stopLoadingTimer();
        localStorage.setItem('firstLoad', 'false');
        window.location.reload();
      } else if (LOADING_SECONDS >= 10 && firstLoad == 'false') {
        stopLoadingTimer();
        localStorage.setItem('firstLoad', 'true');
        const error = new Error(translate('messages.errors.loading_timeout'));
        _displayError(error, true);
      }
    }, 1000);
  }
}

export function stopLoadingTimer() {
  if (LOADING_TIMER) {
    clearInterval(LOADING_TIMER);
    LOADING_TIMER = null;
  }
}