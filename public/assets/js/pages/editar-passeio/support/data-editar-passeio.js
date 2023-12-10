async function _getSinglePlaces() {
    const urlParams = new URLSearchParams(window.location.search);
    const placesID = urlParams.get('p');

    if (placesID) {
        const host = window.location.hostname;
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getSinglePlaces?passeioRef=${placesID}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getSinglePlaces?passeioRef=${placesID}`;

        const response = await fetch(url);
        const text = await response.text();

        if (!text || text === 'Documento não encontrado') {
            _displayNoPlaceError();
        } else {
            return JSON.parse(text);
        }
    } else {
        _displayNoPlaceError();
    }
}

async function _updatePlaces(places) {
    const user = await _getUser();

    if (user) {
        try {
            const host = window.location.hostname;
            const token = await _getFirebaseIdToken();
            const backendURL =
                host === 'localhost'
                    ? `http://localhost:5001/trip-viewer-tcc/us-central1/updatePlaces?token=${token}`
                    : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/updatePlaces?token=${token}`;

            const response = await fetch(backendURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(places),
            });

            if (response.ok) {
                return response.text();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return error.message;
        }
    } else return "Usuário não logado"
}

async function _newPlaces(places) {
    const user = await _getUser();

    if (user) {
        try {
            const host = window.location.hostname;
            const token = await _getFirebaseIdToken();
            const backendURL =
                host === 'localhost'
                    ? `http://localhost:5001/trip-viewer-tcc/us-central1/newPlaces?token=${token}`
                    : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/newPlaces?token=${token}`;

            const response = await fetch(backendURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(places),
            });

            if (response.ok) {
                return response.text();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return error.message;
        }
    } else return "Usuário não logado"
}
