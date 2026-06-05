var LOADING_TIMER;
var LOADING_SECONDS = 0;
var LOADING_TIMEOUT_TRIGGERED = false;

// Loading Screen

function startLoadingScreen({
	useTimer = false,
	adjustLoadables = true,
} = {}) {
	if (useTimer) {
		startLoadingTimer();
	}
	const preloader = getID("preloader");
	if (preloader) {
		if (adjustLoadables) {
			document.querySelectorAll(".loadable").forEach((el) => {
				el.style.display = "none";
			});
		}
		preloader.style.display = "block";
		disableScroll();
	}
}

function stopLoadingScreen({ adjustLoadables = true } = {}) {
	const wasTimeoutTriggered = LOADING_TIMEOUT_TRIGGERED;
	stopLoadingTimer();
	sessionStorage.setItem("firstLoad", "true");
	if (!MESSAGE_MODAL_OPEN) {
		const preloader = getID("preloader");
		if (preloader) {
			if (adjustLoadables) {
				document.querySelectorAll(".loadable").forEach((el) => {
					el.style.display = "";
				});
			}
			preloader.style.display = "none";
			enableScroll();
		}
	} else if (wasTimeoutTriggered) {
		// Timeout error was shown but loading has since completed.
		// Dismiss the timeout dialog automatically so the user is not stuck.
		closeMessage();
		// _closeMessage already calls _stopLoadingScreen recursively;
		// the recursive call will take the !MESSAGE_MODAL_OPEN branch above.
	} else {
		console.warn("Cannot stop loading in error mode");
	}
}

function isAlreadyLoading() {
	return getID("preloader").style.display === "block";
}

// Loading Timer
function startLoadingTimer() {
	if (LOADING_TIMER == null && MESSAGE_MODAL_OPEN == false) {
		LOADING_SECONDS = 0;
		LOADING_TIMER = setInterval(() => {
			const firstLoad = sessionStorage.getItem("firstLoad");
			LOADING_SECONDS++;
			if (LOADING_SECONDS >= 10 && (firstLoad == "true" || firstLoad == null)) {
				stopLoadingTimer();
				sessionStorage.setItem("firstLoad", "false");
				window.location.reload();
			} else if (LOADING_SECONDS >= 10 && firstLoad == "false") {
				stopLoadingTimer();
				sessionStorage.setItem("firstLoad", "true");
				const error = new Error(translate("messages.errors.loading_timeout"));
				displayError(error, true);
				LOADING_TIMEOUT_TRIGGERED = true;
			}
		}, 1000);
	}
}

function stopLoadingTimer() {
	if (LOADING_TIMER) {
		clearInterval(LOADING_TIMER);
		LOADING_TIMER = null;
	}
	LOADING_TIMEOUT_TRIGGERED = false;
}
