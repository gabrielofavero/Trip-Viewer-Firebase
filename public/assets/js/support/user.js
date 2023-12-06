function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _unloadUserIndexVisibility();
    };
}

async function _signInGoogle() {
    try {
      const auth = firebase.auth();
  
      // Set the authentication state persistence to 'local'
      await setPersistence(auth, browserLocalPersistence);
  
      // Create a GoogleAuthProvider instance
      const provider = new firebase.auth.GoogleAuthProvider();
  
      // Sign in with Google Popup
      const result = await auth.signInWithPopup(provider);
  
      // Access user information if needed
      const user = result.user;
      console.log('User is signed in:', user);
      console.log('User UID:', user.uid);
      console.log('User Email:', user.email);
      // You can access other user properties as needed
    } catch (error) {
      _logger(ERROR, error);
      throw error;
    }
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