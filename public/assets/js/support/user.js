function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _unloadUserIndexVisibility();
    };
}

function _signInGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function (result) {
    }).catch(function (error) {
        _logger(ERROR, error);
        throw error;
    });
}

function _signOut() {
    firebase.auth().signOut()
    _unloadPageUserFunctions();
}

async function _getFirebaseIdToken() {
    const user = await firebase.auth().currentUser;
    if (user) {
        return await user.getIdToken();
    } else {
        return Promise.reject("User is not authenticated.");
    }
}

async function _deleteAccount() {
    const user = await firebase.auth().currentUser;
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken();
            const url = host === "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/deleteUser?token=${token}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/deleteUser?token=${token}`;

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