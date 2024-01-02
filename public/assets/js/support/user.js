function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _unloadUserIndexVisibility();
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
    _unloadPageUserFunctions();
}

async function _registerIfUserNotPresent() {
    const user = firebase.auth().currentUser;

    if (user) {
        const userDoc = await _get(`usuarios/${user.uid}`);
        if (!userDoc) {
            await _create(`usuarios`, {
                viagens: [],
                passeios: [],
                visibilidade: 'dinamico'
            }, user.uid)
        }
    }
}

async function _getUID() {
    return new Promise((resolve, reject) => {
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        unsubscribe(); // Unsubscribe to avoid memory leaks
  
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

async function _deleteAccount() {
    const uid = await _getUID();
    if (uid) {
        const userDoc = await _get(`usuarios/${uid}`);

        if (userDoc) {
            for (const viagemID of userDoc.viagens) {
                const viagemDoc = await _get(`viagens/${viagemID}`);
                if (uid == viagemDoc.compartilhamento.dono) {
                    _delete(`viagens/${viagemID}`);
                }
            }

            for (const passeioID of userDoc.passeios) {
                const passeioDoc = await _get(`passeios/${passeioID}`);
                if (uid == passeioDoc.compartilhamento.dono) {
                    _delete(`passeios/${passeioID}`);
                }
            }

            await _delete(`usuarios/${uid}`)
        }

    } else {
        _logger(ERROR, "Usuário não logado");
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