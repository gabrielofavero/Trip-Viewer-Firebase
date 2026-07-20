import { startFirebase } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
	startFirebase();
	console.log('Firebase started and DOM content loaded.');
});
