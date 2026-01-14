import { startFirebase } from "./firebase-config";

document.addEventListener("DOMContentLoaded", () => {
	startFirebase();
	console.log("Firebase inicializado e página carregada.");
});
