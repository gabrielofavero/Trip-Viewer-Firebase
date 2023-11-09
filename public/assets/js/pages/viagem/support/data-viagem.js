// ======= GETTERS =======
async function _getSingleTrip() {
    const urlParams = new URLSearchParams(window.location.search);
    const tripID = urlParams.get('v');

    if (tripID) {
        const host = window.location.hostname;
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getSingleTrip?viagemRef=${tripID}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getSingleTrip?viagemRef=${tripID}`;

        const response = await fetch(url);
        const text = await response.text();

        if (!text || text === 'Documento não encontrado') {
            _displayNoTripError();
        } else {
            return JSON.parse(text);
        }
    } else {
        _displayNoTripError();
    }
}

async function _getAllTripsFromUser() {
    if (USER) {
        const host = window.location.hostname;
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getTripData?userID=${USER.uid}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getTripData?userID=${USER.uid}`;

        const response = await fetch(url);
        const data = await response.json();
        return data;
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}

async function _getConfig() {
    const host = window.location.hostname;
    var url =
        host == "localhost"
            ? "http://localhost:5001/trip-viewer-tcc/us-central1/getConfig"
            : "https://us-central1-trip-viewer-tcc.cloudfunctions.net/getConfig";

    const response = await fetch(url);
    const data = await response.json();
    return data;
}