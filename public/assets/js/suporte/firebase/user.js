function _unloadPageUserFunctions() {
    const html = _getHTMLpage();
    if (html == 'index') {
        _openIndexPage('unlogged', 0, 1);
    };
}

async function _signInWithEmailAndPassword() {
    const email = getID('login-email').value;
    const password = getID('login-password').value;

    try {
        // Set persistence to LOCAL
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        // Sign in with email and password
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Get the signed-in user
        const user = userCredential.user;
        console.log('User signed in:', user);

        return user; // Optionally return the user for further use
    } catch (error) {
        console.error('Error signing in:', error.message);
        _displayError(error);
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

    if (!user) {
        _signOut();
        _displayError('Não é possível fazer o registro sem um usuário autenticado.');
        return;
    }

    const userDoc = await _get(`usuarios/${user.uid}`);
    const systemData = await _getSystemData();
    const registrationOpen = (systemData?.registrationOpen == true);

    if (!userDoc && !registrationOpen) {
        _signOut();
        const title = 'Você chegou muito cedo! 😅';
        const content = 'Olá! O TripViewer não está aceitando novos registros. Estamos trabalhando para lançar a primeira versão pública da aplicação. Fique atento para novidades! 🚀';
        _displayMessage(title, content);
        return;
    }

    if (!userDoc && registrationOpen) {
        await _create(`usuarios`, {
            listagens: [],
            viagens: [],
            destinos: [],
            visibilidade: 'dinamico'
        }, user.uid)
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

// Editar sem permissão
async function _canEdit(dono, editores) {
    const uid = await _getUID();
    if (DOCUMENT_ID && (!uid || (uid != dono && !editores.includes(uid)))) {
        _displayErroTenteNovamente('Você não tem permissão para editar essa viagem. Realize o login com a conta correta para acessar o conteúdo.');
        return false;
    } else return true;
}