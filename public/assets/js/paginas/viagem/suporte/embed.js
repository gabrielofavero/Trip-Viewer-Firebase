var SAVED_SCROLL_POSITION = 0;
const ACTIVE_EMBEDS = {};

function _loadViewEmbed() {
	if (FIRESTORE_DATA.modulos?.gastos === true) {
		_loadEmbedListeners(_loadViewEmbedAction);
	}
}

function _openViewEmbed(url) {
	const frameID = "lightbox-iframe";
	const newTab = true;
	const beforeOpen = () => {
		SAVED_SCROLL_POSITION =
			window.pageYOffset || document.documentElement.scrollTop;
		_startLoadingScreen();
		window.scrollTo(0, 0);
	};
	const onLoad = () => {
		getID("lightbox").style.display = "block";
		getID("night-mode").style.display = "none";
		getID("menu").style.display = "none";
		getID("navbar").style.display = "none";
		_stopLoadingScreen();
		_disableScroll();
	};

	_openEmbed({ frameID, url, beforeOpen, onLoad, newTab });
}

function _closeViewEmbed(redirectToHome = false, visibility) {
	getID("lightbox").style.display = "none";
	getID("night-mode").style.display = "block";
	getID("menu").style.display = "block";
	getID("navbar").style.display = "block";
	_enableScroll();

	if (redirectToHome) {
		window.location.href = `index?visibility=${visibility || _getVisibility()}`;
	} else {
		window.scrollTo({
			top: SAVED_SCROLL_POSITION,
			behavior: "instant",
		});
	}

	if (visibility) {
		_loadExternalVisibility(visibility);
	}
}

function _openExpensesEmbed() {
	_openEmbed({
		frameID: "expenses-embed-frame",
		url: `expenses.html?visibility=${_getVisibility()}&embed=1&g=${_getURLParam("v")}`,
	});
}

function _loadImageLightbox(className) {
	GLightbox({
		selector: `.${className}`,
		autofocusVideos: false,
		touchNavigation: true,
		touchFollowAxis: true,
		width: "auto",
		height: "auto",
	});
}

function _sendToExpenses(type, value) {
	_sendToEmbed("expenses-embed-frame", type, value);
}

function _loadViewEmbedAction(data) {
	switch (data?.page) {
		case "expenses":
			_loadExpensesEmbedAction(data);
	}

	function _loadExpensesEmbedAction(data) {
		switch (data.type) {
			case "height":
				getID("expenses-embed").style.height = `${data.value}px`;
				return;
			case "pin":
				if (PIN || !data.value || data.value.length != 4) return;
				_updateProtectedDataFromExternalPin(data.value);
		}
	}
}
