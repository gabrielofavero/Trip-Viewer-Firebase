// Firebase configuration using the compat SDK (loaded via <script> tags).
// The compat SDK makes `firebase` available globally – no import map needed.
//
// Firebase Hosting's reserved compat SDK auto-initializes the default app,
// so we ONLY re-initialize when running outside Firebase Hosting (localhost).

const configPRD = {
	apiKey: 'AIzaSyBZJeSANyiJi6ijzDadJOJXSLqzSgf9xfk',
	authDomain:
		window?.location?.hostname === 'trip-viewer-prd.firebaseapp.com'
			? 'trip-viewer-prd.firebaseapp.com'
			: 'trip-viewer.com',
	projectId: 'trip-viewer-prd',
	storageBucket: 'trip-viewer-prd.appspot.com',
	messagingSenderId: '1065119817152',
	appId: '1:1065119817152:web:92a2a1d074b5314eee3c25',
	measurementId: 'G-YYZBDKL1SB',
};

// There is a single Firebase project (trip-viewer-prd). It is used for BOTH
// the local emulator stack (`npm run dev` → [DEV] tab) and real services
// (`npm run dev:prd` → [PRD] tab); the `{{USE_EMULATOR}}` build flag decides
// which one the built frontend connects to. No hostname-based detection needed.

// Get or initialize the Firebase app.
// On Firebase Hosting the compat SDK already initializes the default app;
// we only need to re-initialize when running locally (localhost).
function _getOrInitApp() {
	try {
		return firebase.app(); // use existing default app
	} catch (_) {
		// No default app yet (e.g. localhost without Firebase Hosting auto-init)
		return firebase.initializeApp(configPRD);
	}
}

const app = _getOrInitApp();

// Connect to local emulators when running on localhost.
// Build-time flag: `{{USE_EMULATOR}}` is substituted by the build script
// (`--use-emulator true|false`). Default (true) keeps `npm run dev`'s
// emulator flow; "false" (dev:prd) keeps the real Firebase connection even
// on localhost so the app reads/writes the real project.
const _USE_EMULATOR = '{{USE_EMULATOR}}' !== 'false';

const _isLocalhost =
	_USE_EMULATOR &&
	(window?.location?.hostname === 'localhost' ||
		window?.location?.hostname === '127.0.0.1');

// Expose whether the app is connected to the local emulators — used for the
// [DEV] (emulator) vs [PRD] (real services) tab tag (setPageName in main.ts).
window.__TRIPVIEWER_EMULATOR__ = _isLocalhost;

if (_isLocalhost) {
	try {
		firebase.auth().useEmulator('http://localhost:9099');
		console.log('[emulator] Auth connected on http://localhost:9099');
	} catch (e) {
		console.warn('[emulator] Auth emulator not available:', e.message);
	}

	try {
		firebase.firestore().useEmulator('localhost', 8085);
		console.log('[emulator] Firestore connected on localhost:8085');
	} catch (e) {
		console.warn('[emulator] Firestore emulator not available:', e.message);
	}
}

export function startFirebase() {
	let features = [
		'auth',
		'database',
		'firestore',
		'functions',
		'messaging',
		'storage',
		'analytics',
		'remoteConfig',
		'performance',
	].filter((feature) => typeof app[feature] === 'function');

	console.log(`Firebase SDK loaded with ${features.join(', ')}`);
}
