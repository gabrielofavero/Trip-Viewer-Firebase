var USER;

function _loadUser() {
    let localUser = localStorage.getItem('user');
    if (localUser) {
        USER = JSON.parse(localUser);
        _loadPageUserFunctions();
    }
}

function _loadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _loadUserIndex();
    };
}

function _signInGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function (result) {
        USER = result.user;
        localStorage.setItem('user', JSON.stringify(USER));
        _loadPageUserFunctions();
    }).catch(function (error) {
        _logger(ERROR, error);
        throw error;
    });
}

function _signOut() {
    firebase.auth().signOut()
    USER = undefined;
    localStorage.removeItem('user');
}
