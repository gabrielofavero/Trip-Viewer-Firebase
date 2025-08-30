import { getID, onClick, select } from "../../support/pages/selectors.js";
import { animate, animateFadeIn, animateFadeOut } from "../../support/styles/animations.js";
import { loadLogoColors } from "../../support/styles/colors.js";
import { loadUserVisibility, setManualVisibility, switchVisibility } from "../../support/styles/visibility.js";

const NOTIFICATION_BAR = {
  changed: false,
  light: '',
  dark: ''
}

export function setNotificationBar({ changed, light, dark }) {
  if (changed = !undefined) NOTIFICATION_BAR.changed = changed
  if (light = !undefined) NOTIFICATION_BAR.light = light
  if (dark = !undefined) NOTIFICATION_BAR.dark = dark
}

export function applyNotificationBarColor() {
  getID('notification-bar').style.backgroundColor = isOnDarkMode() ? NOTIFICATION_BAR.dark : NOTIFICATION_BAR.light;
}

export function loadVisibilityIndex() {
  loadUserVisibility();
  loadLogoColors();

  onClick('#night-mode', () => {
    switchVisibility();
    setManualVisibility();

    if (NOTIFICATION_BAR.changed) {
      applyNotificationBarColor();
    }
  })
}

export function openIndexPage(id, from = 0, to = 0, horizontal = true) {
  const contentBox = select('.content-box');
  let fadeIn = [];
  let fadeOut = [];

  let fadeInNoDirection = [];
  let fadeOutNoDirection = [];

  switch (id) {
    case 'logged':
      fadeIn = ['index-logged-title', 'logged-menu', 'tripViewer'];
      fadeOut = ['index-unlogged-title', 'login-box', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'settings-box', 'listagens-box'];

      if (from === 0 && to === 0) {
        fadeIn.push('profile-icon');
      }

      if (from > to) {
        fadeOutNoDirection = ['back'];
      }

      break;
    case 'unlogged':
      fadeIn = ['index-unlogged-title', 'login-box', 'tripViewer'];
      fadeOut = ['index-logged-title', 'logged-menu', 'profile-icon', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'settings-box', 'listagens-box', 'back'];
      break;
    case 'settings':
      fadeIn = ['settings-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'destinos-box', 'listagens-box', 'logged-menu'];
      fadeInNoDirection = ['back'];
      break;
    case 'proximasViagens':
      fadeIn = ['proximasViagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box', 'viagensAnteriores-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'viagensAnteriores':
      fadeIn = ['viagensAnteriores-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'destinos-box', 'settings-box', 'listagens-box', 'proximasViagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'destinos':
      fadeIn = ['destinos-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'settings-box', 'listagens-box'];
      fadeInNoDirection = ['back'];
      break;
    case 'listagens':
      fadeIn = ['listagens-box'];
      fadeOut = ['index-unlogged-title', 'index-logged-title', 'login-box', 'logged-menu', 'tripViewer', 'proximasViagens-box', 'viagensAnteriores-box', 'settings-box', 'destinos-box'];
      fadeInNoDirection = ['back'];
  }

  contentBox.style.overflowY = 'hidden';
  animate(fadeIn, fadeOut, from, to, horizontal);
  animateFadeIn(fadeInNoDirection);
  animateFadeOut(fadeOutNoDirection);
  contentBox.style.overflowY = 'auto';
}