import { deleteAccountDocuments, createAccountDocuments } from "../support/firebase/database.js";
import { getUID } from "../support/firebase/user.js";
import { requestAndGetLocalJSON } from "../support/data/data.js";
import { getTimestamp } from "../support/data/dates.js";

TRIP_DOCUMENT_BACKUP_LIMIT = 5;

// Account Data Export and Import Functions
async function _exportAllUserData() {
    const jsonStr = JSON.stringify(USER_DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = getTimestamp();
    const uid = await getUID();

    const link = document.createElement('a');
    link.href = url;
    link.download = `${timestamp}-tripviewer-backup-${uid}.json`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function _importAllUserData() {
    const backup = await requestAndGetLocalJSON();

    if (!backup) {
        console.error("No file provided for restoration.");
        return;
    }

    console.log("Deleting current user data...");
    await deleteAccountDocuments();

    console.log("Restoring user data from backup...");
    await createAccountDocuments(backup);

    console.log("User data restored successfully.");

}