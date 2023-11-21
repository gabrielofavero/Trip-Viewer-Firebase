async function _getTripList() {
    const user = await firebase.auth().currentUser;
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken();
            const url = host === "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getTripList?token=${token}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getTripList?token=${token}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Fetch request failed with status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            _logger(ERROR, error);
        }
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}

async function _getPlacesList() {
    const user = await firebase.auth().currentUser;
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken();
            const url = host === "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getPlacesList?token=${token}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getPlacesList?token=${token}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Fetch request failed with status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            _logger(ERROR, error);
        }
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}
