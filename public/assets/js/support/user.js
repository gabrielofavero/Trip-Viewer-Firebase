function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _unloadUserIndexVisibility();
    };
}

async function _signInGoogle() {
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

async function _getFirebaseIdToken(user) {
    if (!user) {
        user = await _getUser();
    }
    if (user) {
        return await user.getIdToken();
    } else {
        return Promise.reject("User is not authenticated.");
    }
}

async function _deleteAccount() {
    const user = await _getUser();
    if (user) {
        const host = window.location.hostname;
        try {
            const token = await _getFirebaseIdToken(user);
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