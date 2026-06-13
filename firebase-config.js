// Firebase configuration using the compat SDK (loaded via <script> tags).
// The compat SDK makes `firebase` available globally – no import map needed.
//
// Firebase Hosting's reserved compat SDK auto-initializes the default app,
// so we ONLY re-initialize when running outside Firebase Hosting (localhost).

const configPRD = {
	apiKey: "AIzaSyBZJeSANyiJi6ijzDadJOJXSLqzSgf9xfk",
	authDomain:
		window?.location?.hostname === "trip-viewer-prd.firebaseapp.com"
			? "trip-viewer-prd.firebaseapp.com"
			: "trip-viewer.com",
	projectId: "trip-viewer-prd",
	storageBucket: "trip-viewer-prd.appspot.com",
	messagingSenderId: "1065119817152",
	appId: "1:1065119817152:web:92a2a1d074b5314eee3c25",
	measurementId: "G-YYZBDKL1SB",
};

const configDEV = {
	apiKey: "AIzaSyDUiLWOMQwIHqfByPxfk8edR9PguSVsBWo",
	authDomain: "trip-viewer-dev.firebaseapp.com",
	projectId: "trip-viewer-dev",
	storageBucket: "trip-viewer-dev.appspot.com",
	messagingSenderId: "1091542096877",
	appId: "1:1091542096877:web:17d4b634a5d6dd497565e4",
	measurementId: "G-S08E56DVW2",
};

const configTCC = {
	apiKey: "AIzaSyAHNHyvBmM4FAXyr5e4DcJD03yn6Xh0iS0",
	authDomain: "trip-viewer-tcc.firebaseapp.com",
	projectId: "trip-viewer-tcc",
	storageBucket: "trip-viewer-tcc.appspot.com",
	messagingSenderId: "717252916774",
	appId: "1:717252916774:web:368fd1735359a66cb618e7",
	measurementId: "G-9RFY3B31ZS",
};

function _getConfig() {
	const hostname = window?.location?.hostname || "";

	if (hostname.includes("trip-viewer-dev") || hostname === "localhost" || hostname === "127.0.0.1")
		return configDEV;
	if (hostname.includes("trip-viewer-tcc"))
		return configTCC;
	if (hostname.includes("trip-viewer-prd") || hostname.includes("trip-viewer.com"))
		return configPRD;

	// Last resort: try reserved __env from Firebase Hosting (injected as global)
	if (typeof __firebase_env !== "undefined" && __firebase_env?.projectId) {
		const pid = __firebase_env.projectId;
		if (pid === "trip-viewer-dev") return configDEV;
		if (pid === "trip-viewer-tcc") return configTCC;
		if (pid === "trip-viewer-prd") return configPRD;
	}

	console.error("Projeto não reconhecido, usando config DEV como fallback. Hostname:", hostname);
	return configDEV;
}

// Get or initialize the Firebase app.
// On Firebase Hosting the compat SDK already initializes the default app;
// we only need to re-initialize when running locally (localhost).
function _getOrInitApp() {
	try {
		return firebase.app(); // use existing default app
	} catch (_) {
		// No default app yet (e.g. localhost without Firebase Hosting auto-init)
		return firebase.initializeApp(_getConfig());
	}
}

const app = _getOrInitApp();

export function startFirebase() {
	let features = [
		"auth",
		"database",
		"firestore",
		"functions",
		"messaging",
		"storage",
		"analytics",
		"remoteConfig",
		"performance",
	].filter((feature) => typeof app[feature] === "function");

	console.log(`Firebase SDK loaded with ${features.join(", ")}`);
}
