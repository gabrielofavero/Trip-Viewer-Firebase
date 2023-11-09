// ======= GETTERS =======
async function _getTripList() {
    if (USER) {
        const host = window.location.hostname;
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getTripList?userID=${USER.uid}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getTripList?userID=${USER.uid}`;

        const response = await fetch(url);
        const data = await response.json();
        return data;
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}