TRIP_DOCUMENT_BACKUP_LIMIT = 5;

async function _backupOnClickAction() {
    _displayPrompt(translate('auth.backup_account'), translate('auth.backup_prompt'))
} 

// Account Data Export and Import Functions
async function _backupAccountData() {
    const jsonStr = JSON.stringify(USER_DATA, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = _getTimestamp();
    const uid = await _getUID();

    const link = document.createElement('a');
    link.href = url;
    link.download = `${timestamp}-tripviewer-backup-${uid}.json`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function _restoreAccountData(backupFile) {
    const backup = backupFile || await _getLocalJSON();

    if (!backup) {
        console.error("No file provided for restoration.");
        return;
    }

    console.log("Deleting current user data...");
    await _deleteAccountDocuments();

    console.log("Restoring user data from backup...");
    await _createAccountDocuments(backup);

    console.log("User data restored successfully.");

    location.reload();
}