function _loadListenersIndex() {
	getID("login-button").addEventListener("click", function () {
		_signInWithEmailAndPassword();
	});

	getID("proximasViagens").addEventListener("click", function () {
		_openIndexPage("proximasViagens", 0, 1);
	});

	getID("viagensAnteriores").addEventListener("click", function () {
		_openIndexPage("viagensAnteriores", 0, 1);
	});

	getID("destinosCadastrados").addEventListener("click", function () {
		_openIndexPage("destinos", 0, 1);
	});

	getID("profile-icon").addEventListener("click", function () {
		if (getID("settings-box").style.display === "none") {
			back.classList.remove("bx-arrow-back");
			back.classList.add("bx-up-arrow-alt");
			_openIndexPage("settings", 0, 1, false);
		}
	});

	getID("ajustesDaConta").addEventListener("click", function () {
		_openIndexPage("settings", 0, 1);
	});

	getID("nova-viagem-1").addEventListener("click", function () {
		_viagensNovo();
	});

	getID("nova-viagem-2").addEventListener("click", function () {
		_viagensNovo();
	});

	getID("new-destino").addEventListener("click", function () {
		_destinosNovo();
	});

	getID("new-listagem").addEventListener("click", function () {
		_listagensNovo();
	});

	getID("back").addEventListener("click", function () {
		const back = select("#back");
		if (back.classList.contains("bx-up-arrow-alt")) {
			_openIndexPage("logged", 1, 0, false);
			setTimeout(() => {
				back.classList.remove("bx-up-arrow-alt");
				back.classList.add("bx-arrow-back");
			}, 300);
		} else {
			_openIndexPage("logged", 1, 0);
		}
	});

	getID("listasDeDestinos").addEventListener("click", function () {
		_openIndexPage("listagens", 0, 1);
	});

	getID("apagar").addEventListener("click", async function () {
		_startLoadingScreen();
		await _deleteAccount();
		_closeModal();
		_signOut();
		_stopLoadingScreen();
	});

	document
		.getElementById("restore-account-input")
		.addEventListener("change", function (event) {
			_restoreOnFileSelectionAction(event);
		});
}
