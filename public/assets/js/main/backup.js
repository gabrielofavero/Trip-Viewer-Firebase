const MISSING_ACCOUNT_DATA = { jobs: [], protected: [], failed: [] };

// Backup
async function _backupOnClickAction() {
    MISSING_ACCOUNT_DATA.jobs = [];
    MISSING_ACCOUNT_DATA.protected = [];
    MISSING_ACCOUNT_DATA.failed = [];

    _prepareMissingData();

    if (MISSING_ACCOUNT_DATA.protected.length === 0) {
        _backupAccountData(false);
        return;
    }

    const titulo = translate('account.backup.title');
    const conteudo = translate('account.backup.prompt');
    const yesAction = '_displayPinRequestBackup()';
    const noAction = '_backupAccountData()';
    _displayPrompt({ titulo, conteudo, yesAction, noAction });
}

function _prepareMissingData() {
    const jobs = [];
    const protectedJobs = [];

    _prepareMainData();
    _prepareAdditionalData();

    MISSING_ACCOUNT_DATA.jobs = jobs;
    MISSING_ACCOUNT_DATA.protected = protectedJobs;

    function _prepareMainData() {
        for (const type of ['viagens', 'destinos', 'listagens']) {
            for (const documentID in USER_DATA[type]) {
                const titulo = USER_DATA[type][documentID].titulo;
                jobs.push(_getJobObject(titulo, documentID, type))
            }
        }
    }

    function _prepareAdditionalData() {
        for (const documentID in USER_DATA.viagens) {
            const viagem = viagens[documentID];
    
            switch (data.pin) {
                case 'no-pin':
                    if (data.modulos.gastos === true) jobs.push(_getJobObject(viagem.titulo, documentID, 'gastos'));
                    break;
                case 'all-data':
                case 'sensitive-only':
                    const innerJobs = [];
                    if (data.modulos.gastos === true) {
                        innerJobs.push(_getJobObject(viagem.titulo, documentID, 'gastos', 'protected'));
                        innerJobs.push(_getJobObject(viagem.titulo, documentID, 'protegido'));
                    }
                    if (data.modulos.hospedagens === true || data.modulos.transportes === true) innerJobs.push(_getJobObject(viagem.titulo, documentID, 'viagens', 'protected'));
                    protectedJobs.push(_getProtectedJobObject(viagem.titulo, documentID, innerJobs));
            }
        }
    }
}

function _getJobObject(title, documentID, collection, subpath = '') {
    return { title, documentID, collection, subpath };
}

function _getProtectedJobObject(title, documentID, jobs, pin = '') {
    return { title, documentID, jobs, pin };
}

function _displayPinRequestBackup() {
    _stopLoadingScreen();
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = translate('trip.basic_information.pin.title')
    propriedades.containers = _getContainersInput();
    propriedades.conteudo = _getContent();
    propriedades.botoes = [{ tipo: 'cancelar', }, { tipo: 'confirmar', acao: '_backupAccountData(true)' }];

    _displayFullMessage(propriedades);

    function _getContent() {
        const content = [translate('trip.basic_information.pin.trip_pin.optional')];
        for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
            content.push(`
                <div class="nice-form-group">
                    <label>${protectedJob.title}</label>
                    <input id="${protectedJob.documentID}" type="password" inputmode="numeric" maxlength="4" autocomplete="one-time-code" pattern="[0-9]*" placeholder="${translate('trip.basic_information.pin.insert')}" />
                </div>
            `);
        }
        return content.join('');
    }
}

async function _backupAccountData(useSensitiveData = false) {
    if (useSensitiveData) {
        _getProtectedJobPins();
    }

    _closeMessage();
    _startLoadingScreen();
    const accountData = await _getAccountData(useSensitiveData);
    const jsonStr = JSON.stringify(accountData, null, 2);
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
    _stopLoadingScreen();

    if (MISSING_ACCOUNT_DATA.failed.length > 0) {
        _displayPartialBackupWarning();
    } else {
        _openToast(translate('account.backup.success'));
    }
}

function _getProtectedJobPins() {
    const inputs = getID('message-description').querySelectorAll('input');
    const ids = Array.from(inputs).map(input => input.id);

    for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
        const index = ids.indexOf(protectedJob.documentID);
        if (index === -1) {
            continue;
        };

        const pin = inputs[index].value.trim();
        if (!isNaN(pin) && pin.length === 4) {
            protectedJob.pin = pin;
        } else if (pin === '') {
            console.warn("Skipping. No PIN provided for trip:", protectedJob.title);
        } else {
            console.warn("Invalid PIN for trip:", protectedJob.title);
            for (const job of protectedJob.jobs) {
                _newBackupFail(job, "not_found");
            }
        }
    }
}

async function _getAccountData(useSensitiveData = false) {
    const data = _getEmptyBaseStructure();
    const jobs = _buildMissingJobs(useSensitiveData);
    await _loadJobsConcurrently(jobs, data);
    return data;

    function _getEmptyBaseStructure() {
        return {
            destinos: {},
            gastos: { protected: {} },
            listagens: {},
            protegido: {},
            viagens: { protected: {} },
        };
    }

    function _buildMissingJobs(includeSensitive) {
        const list = [...MISSING_ACCOUNT_DATA.jobs];

        if (!includeSensitive) return list;

        for (const entry of MISSING_ACCOUNT_DATA.protected) {
            if (!entry.pin) continue;
            for (const job of entry.jobs) {
                list.push({
                    title: job.title,
                    collection: job.collection,
                    documentID: job.documentID,
                    subpath: job.subpath === "protected"
                        ? `protected/${entry.pin}`
                        : job.subpath,
                });
            }
        }

        return list;
    }

    async function _loadJobsConcurrently(jobList, store) {
        const promises = jobList.map(async job => {
            try {
                const path = `${job.collection}/${job.subpath ? job.subpath + "/" : ""}${job.documentID}`;
                const result = await _get(path, true, false);

                if (!result || Object.keys(result) === 0) return _newBackupFail(job, "not_found");

                _deepStore(path, result);
            } catch (err) {
                MISSING_ACCOUNT_DATA
                console.error("Load job failed:", job, err);
                _newBackupFail(job, "unknown");
            }
        });

        await Promise.allSettled(promises);

        function _deepStore(path, value) {
            const keys = path.split('/');
            let current = store;

            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current)) current[key] = {};
                current = current[key];
            }

            current[keys[keys.length - 1]] = value;
        }
    }
}

function _newBackupFail(job, reason) {
    MISSING_ACCOUNT_DATA.failed.push({ job, reason });
}

function _displayPartialBackupWarning() {
    const propriedades = _cloneObject(MENSAGEM_PROPRIEDADES);
    propriedades.titulo = translate('account.backup.partial.title');
    propriedades.conteudo = _getContent();
    propriedades.botoes = [{ tipo: 'fechar' }];

    _displayFullMessage(propriedades);

    function _getContent() {
        const list = [translate('account.backup.partial.message')];
        const protectedDataAdded = [];

        for (const failed of MISSING_ACCOUNT_DATA.failed) {
            const isProtected = failed.job.subpath?.includes('protected') || failed.job.collection === 'protegido';
            if (isProtected) {
                if (protectedDataAdded.includes(failed.job.documentID)) continue;
                protectedDataAdded.push(failed.job.documentID);
            }

            const label = isProtected ? 'viagens/protected' : failed.job.collection;
            const type = _getTranslatedDocumentLabel(label);
            list.push(`<b>${failed.job.title}</b><br>${translate(`account.backup.partial.reason.${failed.reason}`, { type })}`);
        }

        return list.join("<br><br>");
    }
}