import { getID } from './dom.js';
import { disableScroll, enableScroll } from '../theme/visibility.js';
import { MESSAGE_MODAL_OPEN, cancelAnimateOut, closeMessage, displayError } from './messages.js';
import { translate } from '../i18n/translation.js';

var LOADING_TIMER;
var LOADING_SECONDS = 0;
var LOADING_TIMEOUT_TRIGGERED = false;

// Loading Screen

export function startLoadingScreen({ useTimer = false, adjustLoadables = true } = {}) {
	if (useTimer) {
		startLoadingTimer();
	}
	const preloader = getID('preloader');
	if (preloader) {
		// Cancel any pending close-message animation that would hide the preloader
		if ((preloader as any)._closeMsgTimeout) {
			clearTimeout((preloader as any)._closeMsgTimeout);
			delete (preloader as any)._closeMsgTimeout;
		}
		// Also cancel the outgoing dialog's leave-animation completion so a
		// closeMessage() → startLoadingScreen() transition can't wipe the
		// re-shown preloader a moment later (mirrors displayFullMessage).
		cancelAnimateOut(preloader.firstElementChild as HTMLElement | null);
		// When no message modal is open this is a plain full-screen loading
		// screen. A dialog that was closed just before this (e.g.
		// closeMessage() → startLoadingScreen() on save/export flows) leaves
		// its dialog DOM plus a translucent dark background + backdrop blur
		// inline on #preloader — the pending close cleanup was cancelled above,
		// so it never resets them. Only clear that stale dialog when its scrim
		// is actually present (inline background set by displayFullMessage):
		// other preloader content must survive, e.g. the #progress-loading bar
		// built by startProgressLoading(), which clears the scrim itself
		// before calling back into this function. Keep an actually-open modal
		// (MESSAGE_MODAL_OPEN) intact.
		if (!MESSAGE_MODAL_OPEN && preloader.style.background) {
			preloader.innerHTML = '';
			preloader.style.background = '';
			preloader.style.backdropFilter = '';
			(preloader.style as any).webkitBackdropFilter = '';
		}
		if (adjustLoadables) {
			document.querySelectorAll('.loadable').forEach((el) => {
				(el as HTMLElement).style.display = '';
			});
		}
		preloader.style.display = 'block';
		preloader.style.opacity = '1';
		disableScroll();
	}
}

export function stopLoadingScreen({ adjustLoadables = true } = {}) {
	const wasTimeoutTriggered = LOADING_TIMEOUT_TRIGGERED;
	stopLoadingTimer();
	sessionStorage.setItem('firstLoad', 'true');
	if (!MESSAGE_MODAL_OPEN) {
		const preloader = getID('preloader');
		if (preloader) {
			if (adjustLoadables) {
				document.querySelectorAll('.loadable').forEach((el) => {
					(el as HTMLElement).style.display = '';
				});
			}
			preloader.style.display = 'none';
			enableScroll();
		}
	} else if (wasTimeoutTriggered) {
		// Timeout error was shown but loading has since completed.
		// Dismiss the timeout dialog automatically so the user is not stuck.
		closeMessage();
		// _closeMessage already calls _stopLoadingScreen recursively;
		// the recursive call will take the !MESSAGE_MODAL_OPEN branch above.
	} else {
		console.warn('Cannot stop loading in error mode');
	}
}

export function isAlreadyLoading() {
	return getID('preloader').style.display === 'block';
}

// Loading Timer
export function startLoadingTimer() {
	if (LOADING_TIMER == null && MESSAGE_MODAL_OPEN == false) {
		LOADING_SECONDS = 0;
		LOADING_TIMER = setInterval(() => {
			const firstLoad = sessionStorage.getItem('firstLoad');
			LOADING_SECONDS++;
			if (LOADING_SECONDS >= 10 && (firstLoad == 'true' || firstLoad == null)) {
				stopLoadingTimer();
				sessionStorage.setItem('firstLoad', 'false');
				window.location.reload();
			} else if (LOADING_SECONDS >= 10 && firstLoad == 'false') {
				stopLoadingTimer();
				sessionStorage.setItem('firstLoad', 'true');
				const error = new Error(translate('messages.errors.loading_timeout'));
				displayError(error, true);
				LOADING_TIMEOUT_TRIGGERED = true;
			}
		}, 1000);
	}
}

export function stopLoadingTimer() {
	if (LOADING_TIMER) {
		clearInterval(LOADING_TIMER);
		LOADING_TIMER = null;
	}
	LOADING_TIMEOUT_TRIGGERED = false;
}
