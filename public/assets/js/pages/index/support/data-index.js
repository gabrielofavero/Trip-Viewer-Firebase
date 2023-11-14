// ======= GETTERS =======
async function _getTripList() {
    if (USER) {
        const host = window.location.hostname;
        const headers = { authToken: USER.getIdToken() };
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getTripList`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getTripList`;

        const response = await fetch(url, { headers: headers });
        const data = await response.json();
        return data;
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}