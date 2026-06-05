// ======= Services Barrel File =======
// Re-exports all service functions — pages should import from here, not from support/firebase/

// ── Auth service ──
export {
	USER_DATA,
	UID,
	getUserData,
	unloadPageUserFunctions,
	signInWithEmailAndPassword,
	signOut,
	registerIfUserNotPresent,
	getUID,
	getFirebaseIdToken,
	getUser,
	getSystemData,
	deleteAccount,
	deleteAccountDocuments,
	login,
	logout,
	getCurrentUser,
	getCurrentUID,
	registerIfNeeded,
	getCurrentUserData,
} from "./auth-service.js";

// ── Trip service ──
export {
	get,
	getSingleData,
	getTripDataWithDestinations,
	update,
	override,
	delete,
	create,
	newUserObjectDB,
	deleteUserObjectDB,
	addToUserArray,
	createBatchOps,
	getTrip,
	getTripRaw,
	createTrip,
	updateTrip,
	replaceTrip,
	deleteTrip,
} from "./trip-service.js";

// ── Destination service ──
export {
	getDestination,
	getDestination,
	getDestinationRaw,
	createDestination,
	updateDestination,
	replaceDestination,
	deleteDestination,
} from "./destination-service.js";

// ── Expense service ──
export {
	deepCreate,
	getExpenses,
	getProtectedExpenses,
	updateExpenses,
	replaceExpenses,
	setProtectedExpenses,
	deleteExpenses,
} from "./expense-service.js";

// ── Storage service (raw re-exports) ──
export {
	IMAGE_UPLOAD_STATUS,
	UPLOAD_SIZE,
	PERMISSOES,
	IMAGE_UPLOAD_ENABLED,
	uploadImage,
	uploadImages,
	deleteUnusedImages,
	deleteImage,
	deleteImageByLink,
	getImagePathFromLink,
	deleteUserObjectStorage,
	checkFileSize,
	loadImageSelector,
	removeImageSelectorListeners,
	loadLogoSelector,
	getLastDir,
	getStorageErrorMessage,
	getAllImageUrls,
} from "../support/firebase/storage.js";

// ── Translation ──
export {
	translate,
	getUserLanguage,
	getLanguagePackName,
	updateUserLanguage,
	translatePage,
	loadLangSelectorSelect,
} from "../main/translation.js";
