let MISSING_ACCOUNT_DATA = { jobs: [], dataToRequest: []};

async function _backupOnClickAction() {
    _prepareMissingAccountData(useSensitiveData);
    _displayPrompt(translate('auth.backup_account'), translate('auth.backup_prompt'));
}

// Account Data Export and Import Functions
async function _backupAccountData(useSensitiveData = false) {
    // FUnction to execute all jobs


    const data = await _gatherAccountData(useSensitiveData);
    const jsonStr = JSON.stringify(data, null, 2);
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

    function _prepareMissingAccountData(includeSensitive) {
        const data = _cloneObject(USER_DATA);
        const jobs = [];
        const dataToRequest = [];

        for (const key in data.viagens) {
            const viagem = data.viagens[key];
            if (!includeSensitive && viagem.modulos.gastos === true && viagem.pin === 'no-pin') {
                jobs.push({path: 'gastos', key});
            } else if (includeSensitive && (viagem.pin === 'all-data' || viagem.pin === 'sensitive-only')) {
                dataToRequest.push({title: viagem.titulo, key});
            }
        }

        MISSING_ACCOUNT_DATA.jobs = jobs;
        MISSING_ACCOUNT_DATA.dataToRequest = dataToRequest;
    }
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