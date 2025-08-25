import { DOCUMENT_ID } from "./database.js";
import { get, create, getSystemData, getUserPermissions } from "./database.js";

export var USER_PERMISSIONS;

export async function loadUserPermissions() {
    USER_PERMISSIONS = await getUserPermissions();
}

export async function signInWithEmailAndPassword() {
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

export function signOut() {
    firebase.auth().signOut()
    if (window.location.href.includes('index.html')) {
        _openIndexPage('unlogged', 0, 1);
    } else {
        window.location.href = 'index.html';
    }
}

export async function registerIfUserNotPresent() {
    const user = firebase.auth().currentUser;

    if (!user) {
        signOut();
        _displayError(translate('messages.error.unauthenticated'));
        return;
    }

    const userDoc = await get(`usuarios/${user.uid}`);
    const systemData = await getSystemData();
    const registrationOpen = (systemData?.registrationOpen == true);

    if (!userDoc && !registrationOpen) {
        signOut();
        const title = 'Você chegou muito cedo! 😅';
        const content = 'Olá! O TripViewer não está aceitando novos registros. Estamos trabalhando para lançar a primeira versão pública da aplicação. Fique atento para novidades! 🚀';
        _displayMessage(title, content);
        return;
    }

    if (!userDoc && registrationOpen) {
        await create(`usuarios`, {
            listagens: [],
            viagens: [],
            destinos: [],
            visibilidade: 'dinamico'
        }, user.uid)
    }
}

export async function getUID() {
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

// Editar sem permissão
export async function canUserEdit(dono, editores) {
    const uid = await getUID();
    if (DOCUMENT_ID && (!uid || (uid != dono && !editores.includes(uid)))) {
        _displayError('Você não tem permissão para editar essa viagem. Realize o login com a conta correta para acessar o conteúdo.');
        return false;
    } else return true;
}