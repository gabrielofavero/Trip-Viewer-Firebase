// ======= Services Barrel File =======
// Re-exports all service functions — pages should import from here, not from support/firebase/

// ── Auth service ──
export {
	USER_DATA,
	UID,
	_getUserData,
	_unloadPageUserFunctions,
	_signInWithEmailAndPassword,
	_signOut,
	_registerIfUserNotPresent,
	_getUID,
	_getFirebaseIdToken,
	_getUser,
	_getSystemData,
	_deleteAccount,
	_deleteAccountDocuments,
	login,
	logout,
	getCurrentUser,
	getCurrentUID,
	registerIfNeeded,
	getCurrentUserData,
} from "./auth-service.js";

// ── Trip service ──
export {
	_get,
	_getSingleData,
	_getTripDataWithDestinos,
	_update,
	_override,
	_delete,
	_create,
	_newUserObjectDB,
	_deleteUserObjectDB,
	_addToUserArray,
	_createBatchOps,
	getTrip,
	getTripRaw,
	createTrip,
	updateTrip,
	replaceTrip,
	deleteTrip,
} from "./trip-service.js";

// ── Destination service ──
export {
	_getDestination,
	getDestination,
	getDestinationRaw,
	createDestination,
	updateDestination,
	replaceDestination,
	deleteDestination,
} from "./destination-service.js";

// ── Expense service ──
export {
	_deepCreate,
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
	_uploadImage,
	_uploadImages,
	_deleteUnusedImages,
	_deleteImage,
	_deleteImageByLink,
	_getImagePathFromLink,
	_deleteUserObjectStorage,
	_checkFileSize,
	_loadImageSelector,
	_removeImageSelectorListeners,
	_loadLogoSelector,
	_getLastDir,
	_getStorageErrorMessage,
	_getAllImageUrls,
} from "../support/firebase/storage.js";

// ── Translation ──
export {
	translate,
	_getUserLanguage,
	_getLanguagePackName,
	_updateUserLanguage,
	_translatePage,
	_loadLangSelectorSelect,
} from "../main/translation.js";
