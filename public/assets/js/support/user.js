function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _openIndexPage('unlogged', 0, 1);
    };
}

async function _signInGoogle() {
    try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        var provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        await _registerIfUserNotPresent();
    } catch (error) {
        _logger(ERROR, error.message);
        throw error;
    }
}

function _signOut() {
    firebase.auth().signOut()
    if (window.location.href.includes('index.html')) {
        _openIndexPage('unlogged', 0, 1);
    } else {
        window.location.href = 'index.html';
    }
}

async function _registerIfUserNotPresent() {
    const user = firebase.auth().currentUser;

    if (user) {
        const userDoc = await _get(`usuarios/${user.uid}`);
        if (!userDoc) {
            await _create(`usuarios`, {
                listagens: [],
                viagens: [],
                destinos: [],
                visibilidade: 'dinamico'
            }, user.uid)
        }
    }
}

async function _getUID() {
    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();

            if (user) {
                resolve(user.uid);
            } else {
                resolve(null)
            }
        });
    });
}

async function _getFirebaseIdToken(user) {
    if (!user) {
        user = firebase.auth().currentUser;
    }
    if (user) {
        return await user.getIdToken();
    } else {
        return Promise.reject("User is not authenticated.");
    }
}

async function _getUser() {
    return new Promise((resolve, reject) => {
        const auth = firebase.auth();
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();

            if (user) {
                resolve(user);
            } else {
                resolve(undefined);
            }
        }, (error) => {
            reject(error);
        });
    });
}