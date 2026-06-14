import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import { getState } from '../../../data/state.js';
import { loadEmbedListeners, openEmbed, sendToEmbed } from '../../../ui/embed.js';
import { getID } from '../../../utils/dom.js';
import { disableScroll, enableScroll, loadExternalVisibility } from '../../../theme/visibility.js';
import { updateProtectedDataFromExternalPin, PIN } from "../support/sensitive-reservation.js";
import { getVisibility } from "../../../theme/theme.js";
import { getURLParam } from "../../../utils/dom.js";

var SAVED_SCROLL_POSITION = 0;
export const ACTIVE_EMBEDS = {};

export function loadViewEmbed() {
	if (getState().modules?.expenses === true) {
		loadEmbedListeners(loadViewEmbedAction);
	}
}

export function openViewEmbed(url) {
	const frameID = "lightbox-iframe";
	const newTab = true;
	const beforeOpen = () => {
		SAVED_SCROLL_POSITION =
			window.pageYOffset || document.documentElement.scrollTop;
		startLoadingScreen();
		window.scrollTo(0, 0);
	};
	const onLoad = () => {
		getID("lightbox").style.display = "block";
		getID("night-mode").style.display = "none";
		getID("menu").style.display = "none";
		getID("navbar").style.display = "none";
		stopLoadingScreen();
		disableScroll();
	};

	openEmbed({ frameID, url, beforeOpen, onLoad, newTab });
}

function closeViewEmbed(redirectToHome = false, visibility) {
	getID("lightbox").style.display = "none";
	getID("night-mode").style.display = "block";
	getID("menu").style.display = "block";
	getID("navbar").style.display = "block";
	enableScroll();

	if (redirectToHome) {
		window.location.href = `index?visibility=${visibility || getVisibility()}`;
	} else {
		window.scrollTo({
			top: SAVED_SCROLL_POSITION,
			behavior: "instant",
		});
	}

	if (visibility) {
		loadExternalVisibility(visibility);
	}
}

export function openExpensesEmbed() {
	openEmbed({
		frameID: "expenses-embed-frame",
		url: `expenses.html?visibility=${getVisibility()}&embed=1&g=${getURLParam("v")}`,
	});
}

export function loadImageLightbox(className) {
	GLightbox({
		selector: `.${className}`,
		autofocusVideos: false,
		touchNavigation: true,
		touchFollowAxis: true,
		width: "auto",
		height: "auto",
	});
}

export function sendToExpenses(type, value) {
	sendToEmbed("expenses-embed-frame", type, value);
}

function loadViewEmbedAction(data) {
	switch (data?.page) {
		case "expenses":
			loadExpensesEmbedAction(data);
	}

	function loadExpensesEmbedAction(data) {
		switch (data.type) {
			case "height":
				getID("expenses-embed").style.height = `${data.value}px`;
				return;
			case "pin":
				if (PIN || !data.value || data.value.length != 4) return;
				updateProtectedDataFromExternalPin(data.value);
		}
	}
}
