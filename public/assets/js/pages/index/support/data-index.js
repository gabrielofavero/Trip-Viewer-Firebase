async function _getTripList() {
    const user = await _getUser();
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
    const user = await _getUser();
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

async function _updateVisibility(visibility) {
    const user = await _getUser();
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken();
            const url = host === "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/updateVisibility?token=${token}&visibility=${visibility}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/updateVisibility?token=${token}&visibility=${visibility}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Fetch request failed with status: ${response.status}`);
            }
        } catch (error) {
            _logger(ERROR, error);
        }
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}

async function _getVisibility() {
    const user = await _getUser();
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken();
            const url = host === "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getVisibility?token=${token}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getVisibility?token=${token}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Fetch request failed with status: ${response.status}`);
            }

            const data = await response.text();
            return data;
        } catch (error) {
            _logger(ERROR, error);
        }
    } else {
        _logger(ERROR, "Usuário não logado");
    }
}

