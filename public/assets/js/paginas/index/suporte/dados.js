var INDEX_DATA = {}
var CURRENT_TRIPS = [];
var PREVIOUS_TRIPS = [];
var NEXT_TRIPS = [];

async function _loadUserIndex() {
    try {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                _registerIfUserNotPresent();
                _openIndexPage('logged');

                const userData = await _getUserData(user.uid);

                const displayName = userData.nome;
                const photoURL = 'url(' + userData.foto + ')';

                getID('title-name').innerHTML = displayName.split(' ')[0];

                getID('settings-account-name').innerHTML = displayName;
                getID('settings-account-picture').style.backgroundImage = photoURL;
                getID('settings-account-picture').style.backgroundSize = 'cover';
                getID('profile-icon').style.backgroundImage = photoURL;
                getID('profile-icon').style.backgroundSize = 'cover';

                INDEX_DATA = {
                    viagens: userData.viagens,
                    destinos: userData.destinos,
                    listagens: userData.listagens
                }

                _loadCurrentTrips();
                _loadPreviousTrips();
                _loadNextTrips();

                _loadIndexDataHTML(userData)

            } else {
                _openIndexPage('unlogged');
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
    _loadDataHTML('proximasViagens-box', NEXT_TRIPS, '_viagensEditar', '_viagensVisualizar', true);
    _loadDataHTML('viagensAnteriores-box', PREVIOUS_TRIPS, '_viagensEditar', '_viagensVisualizar', true);
    _loadDataHTML('destinos-box', INDEX_DATA.destinos, '_destinosEditar', '_destinosVisualizar');
    _loadDataHTML('listagens-box', INDEX_DATA.listagens, '_listagensEditar', '_listagensVisualizar');

    function _loadDataHTML(boxID, dataArray, editFunction, viewFunction, showStartEnd = false) {
        const box = getID(boxID);
        const contentList = box.querySelector('.content-list');

        if (dataArray.length === 0) {
            contentList.innerText = translate('messages.no_data');
            return;
        }

        let innerHTML = '';
        for (const data of dataArray) {
            const timeText = showStartEnd ?
                `<div class="user-data-item-date">${_dateObjectToString(data.inicio)} - ${_dateObjectToString(data.fim)}</div>` :
                `<div class="user-data-item-date">${_getLastUpdatedOnText(data.versao.ultimaAtualizacao)}</div>`;
            
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
            </div>`
        }
        contentList.innerHTML = innerHTML;
    }
}

function _loadCurrentTrips() {
    const today = new Date();
    return Object.entries(INDEX_DATA.viagens)
        .filter(([_, v]) => {
            const start = _convertFromDateObject(v.inicio);
            const end = _convertFromDateObject(v.fim);
            return start <= today && today <= end;
        })
        .map(([id, v]) => ({ id, ...v }));
}

function _loadPreviousTrips() {
    const today = new Date();
    PREVIOUS_TRIPS = Object.entries(INDEX_DATA.viagens)
        .filter(([_, v]) => _convertFromDateObject(v.fim) < today)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => _convertFromDateObject(b.fim) - _convertFromDateObject(a.fim));
}

function _loadNextTrips() {
    const today = new Date();
    NEXT_TRIPS = Object.entries(INDEX_DATA.viagens)
        .filter(([_, v]) => _convertFromDateObject(v.fim) >= today)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => _convertFromDateObject(a.inicio) - _convertFromDateObject(b.inicio));
}

function _getOrderedIndexData(data) {
    return Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => new Date(b.versao.ultimaAtualizacao) - new Date(a.versao.ultimaAtualizacao));
}