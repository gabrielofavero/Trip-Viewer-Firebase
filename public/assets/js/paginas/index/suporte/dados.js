var INDEX_DATA = {};
var CURRENT_TRIPS = [];
var PREVIOUS_TRIPS = [];
var NEXT_TRIPS = [];

async function _loadUserIndex() {
	try {
		firebase.auth().onAuthStateChanged(async (user) => {
			if (user) {
				_registerIfUserNotPresent();
				_openIndexPage("logged");

				USER_DATA = await _getUserData(user.uid);

				const displayName = USER_DATA.nome;
				const photoURL = "url(" + USER_DATA.foto + ")";

				getID("title-name").innerHTML = displayName.split(" ")[0];

				getID("settings-account-name").innerHTML = displayName;
				getID("settings-account-picture").style.backgroundImage = photoURL;
				getID("settings-account-picture").style.backgroundSize = "cover";
				getID("profile-icon").style.backgroundImage = photoURL;
				getID("profile-icon").style.backgroundSize = "cover";

				INDEX_DATA = {
					viagens: USER_DATA.viagens,
					destinos: USER_DATA.destinos,
					listagens: USER_DATA.listagens,
				};

				CURRENT_TRIPS = _getCurrentTrips(INDEX_DATA.viagens);
				PREVIOUS_TRIPS = _getPreviousTrips(INDEX_DATA.viagens);
				NEXT_TRIPS = _getNextTrips(INDEX_DATA.viagens);

				_loadNotificationBar();
				_loadIndexDataHTML(USER_DATA);
			} else {
				_openIndexPage("unlogged");
			}
		});
	} catch (error) {
		_stopLoadingScreen();
		_displayError(error);
		throw error;
	}
	_stopLoadingScreen();
}

function _loadIndexDataHTML() {
	const destinos = _getOrderedDocumentByUpdateDate(INDEX_DATA.destinos);
	const listagens = _getOrderedDocumentByUpdateDate(INDEX_DATA.listagens);

	_loadDataHTML(
		"proximasViagens-box",
		NEXT_TRIPS,
		"_viagensEditar",
		"_viagensVisualizar",
		true,
	);
	_loadDataHTML(
		"viagensAnteriores-box",
		PREVIOUS_TRIPS,
		"_viagensEditar",
		"_viagensVisualizar",
		true,
	);
	_loadDataHTML(
		"destinos-box",
		destinos,
		"_destinosEditar",
		"_destinosVisualizar",
	);
	_loadDataHTML(
		"listagens-box",
		listagens,
		"_listagensEditar",
		"_listagensVisualizar",
	);

	function _loadDataHTML(
		boxID,
		dataArray,
		editFunction,
		viewFunction,
		showStartEnd = false,
	) {
		const box = getID(boxID);
		const contentList = box.querySelector(".content-list");

		if (dataArray.length === 0) {
			contentList.innerHTML = `<div style="margin-top: 1em">${translate("messages.no_data")}</div>`;
			return;
		}

		let innerHTML = "";
		for (const data of dataArray) {
			const timeText = showStartEnd
				? `<div class="user-data-item-date">${_dateObjectToString(data.inicio)} - ${_dateObjectToString(data.fim)}</div>`
				: `<div class="user-data-item-date">${_getLastUpdatedOnText(data.versao.ultimaAtualizacao)}</div>`;

			innerHTML += `
            <div class="user-data-item">
                <div class="user-data-item-text">
                    <div class="user-data-item-title">${data.titulo}</div>
                    ${timeText}
                </div>
                <div class="trip-data-icons">
                    <i class="iconify user-data-icon" onclick="${editFunction}('${data.id}')" data-icon="tabler:edit"></i>
                    <i class="iconify user-data-icon" onclick="${viewFunction}('${data.id}')" data-icon="fluent:eye-16-regular"></i>
                </div>
            </div>`;
		}
		contentList.innerHTML = innerHTML;
	}
}
