var USER;

function _signInGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function (result) {
        USER = result.user;
    }).catch(function (error) {
        _logger(ERROR, error);
        throw error;
    });
}

function _signOut() {
    firebase.auth().signOut()
    USER = undefined;
}
