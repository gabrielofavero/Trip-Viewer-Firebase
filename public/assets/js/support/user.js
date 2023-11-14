function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _unloadUserIndex();
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