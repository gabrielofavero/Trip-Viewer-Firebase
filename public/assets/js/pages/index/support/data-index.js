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

async function _deleteTrip(id) {
    _startLoadinScreen();
    alert('Função desabilitada temporariamente para evitar risco de perda de dados de teste')
    // const user = await _getUser();
    // if (user) {
    //     const host = window.location.hostname;
    //     try {
    //         const token = await _getFirebaseIdToken();
    //         const url = host === "localhost"
    //             ? `http://localhost:5001/trip-viewer-tcc/us-central1/deleteTrip?token=${token}&tripID=${id}`
    //             : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/deleteTrip?token=${token}&tripID=${id}`;

    //         const response = await fetch(url);

    //         if (!response.ok) {
    //             throw new Error(`Fetch request failed with status: ${response.status}`);
    //         }
    //         const data = await response.text();
    //         console.log(data);
    //         window.location.href = `index.html`;
    //     } catch (error) {
    //         _logger(ERROR, error);
    //     }
    // } else {
    //     _logger(ERROR, "Usuário não logado");
    // }
    _stopLoadingScreen();
}

async function _deletePlace(id) {
    _startLoadinScreen();
    alert('Função desabilitada temporariamente para evitar risco de perda de dados de teste')
    // const user = await _getUser();
    // if (user) {
    //     const host = window.location.hostname;
    //     try {
    //         const token = await _getFirebaseIdToken();
    //         const url = host === "localhost"
    //             ? `http://localhost:5001/trip-viewer-tcc/us-central1/deletePlaces?token=${token}&placesID=${id}`
    //             : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/deletePlaces?token=${token}&placesID=${id}`;

    //         const response = await fetch(url);

    //         if (!response.ok) {
    //             throw new Error(`Fetch request failed with status: ${response.status}`);
    //         }
    //         const data = await response.text();
    //         console.log(data);
    //         window.location.href = `index.html`;
    //     } catch (error) {
    //         _logger(ERROR, error);
    //     }
    // } else {
    //     _logger(ERROR, "Usuário não logado");
    // }
    _stopLoadingScreen();
}

async function _deleteAccount() {
    _startLoadinScreen();
    alert('Função desabilitada temporariamente para evitar risco de perda de dados de teste')

    // const user = await _getUser();
    // if (user) {
    //     const host = window.location.hostname;
    //     try {
    //         const token = await _getFirebaseIdToken();
    //         const url = host === "localhost"
    //             ? `http://localhost:5001/trip-viewer-tcc/us-central1/deleteUser?token=${token}`
    //             : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/deleteUser?token=${token}`;

    //         const response = await fetch(url);

    //         if (!response.ok) {
    //             throw new Error(`Fetch request failed with status: ${response.status}`);
    //         }
    //         const data = await response.text();
    //         console.log(data);
    //         _signOut();
    //         window.location.href = `index.html`;
    //     } catch (error) {
    //         _logger(ERROR, error);
    //     }
    // } else {
    //     _logger(ERROR, "Usuário não logado");
    // }

    _closeModal();
    _stopLoadingScreen();
  }
