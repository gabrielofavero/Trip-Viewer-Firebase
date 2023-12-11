async function _updateTrip(body) {
    const user = await _getUser();

    if (user) {
        try {
            const host = window.location.hostname;
            const token = await _getFirebaseIdToken();
            const backendURL =
                host === 'localhost'
                    ? `http://localhost:5001/trip-viewer-tcc/us-central1/updateTrip?token=${token}`
                    : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/updateTrip?token=${token}`;

            const response = await fetch(backendURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (response) {
                return response.text();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return error.message;
        }
    } else return "Usuário não logado"
}

async function _newTrip(body) {
    const user = await _getUser();

    if (user) {
        try {
            const host = window.location.hostname;
            const token = await _getFirebaseIdToken();
            const backendURL =
                host === 'localhost'
                    ? `http://localhost:5001/trip-viewer-tcc/us-central1/newTrip?token=${token}`
                    : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/newTrip?token=${token}`;

            const response = await fetch(backendURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (response) {
                return response.text();
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return error.message;
        }
    } else return "Usuário não logado"
}
