// ======= Services Barrel File =======
// Re-exports all Firebase service and translation functions

export {
	DOCUMENT_ID,
	ERROR_FROM_GET_REQUEST,
	_buildDatabaseObject,
	_get,
	_hasReadPermission,
	_create,
	_deepCreate,
	_update,
	_override,
	_delete,
	_createBatchOps,
	_getSingleData,
	_getTripDataWithDestinos,
	_getSystemData,
	_deleteUserObjectDB,
	_deleteAccount,
	_deleteAccountDocuments,
	_addToUserArray,
	_newUserObjectDB,
	_getPermissoes,
	_getDestination,
	_haveErrorFromGetRequest,
} from "../support/firebase/database.js";

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
} from "../support/firebase/user.js";

export {
	translate,
	_getUserLanguage,
	_getLanguagePackName,
	_updateUserLanguage,
	_translatePage,
	_loadLangSelectorSelect,
} from "../main/translation.js";
