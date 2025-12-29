async function _restoreOnClickAction() {
    const titulo = translate('account.restore.title');
    const conteudo = translate('account.restore.prompt');
    const yesAction = '_openRestoreFilePicker()';
    _displayPrompt({ titulo, conteudo, yesAction });
}

function _restoreOnFileSelectionAction(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            _restoreAccountData(jsonData);
        } catch (err) {
            _stopLoadingScreen();
            _displayError(translate('messages.documents.get.error'))
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function _openRestoreFilePicker() {
    document.getElementById("restore-account-input").click();
}

async function _restoreAccountData(restore) {
    _closeMessage();
    _startLoadingScreen();

    if (!_isRestoreValid(restore)) {
        _displayMessage(translate('account.restore.error_title'), translate('account.restore.invalid_file'));
        return;
    }

    if (!await _isRestoreOwnerValid(restore)) {
        _displayMessage(translate('account.restore.error_title'), translate('account.restore.incorrect_owner'));
        return;
    }

    try {
        await _restoreAccount(restore);
        _openToast(translate('account.restore.success'));

        setTimeout(() => {
            location.reload();
        }, 5000);
    } catch (err) {
        console.error("Restoration failed:", err);
        _displayError(err.message || translate('account.restore.error_title'));
    } finally {
        _stopLoadingScreen();
    }
}

function _isRestoreValid(restore) {
    const REQUIRED_KEYS = ['destinos', 'gastos', 'listagens', 'protegido', 'viagens'];

    // Basic type check
    if (!restore || typeof restore !== 'object') return false;

    // All required keys must exist
    if (!REQUIRED_KEYS.every(key => key in restore)) return false;

    // Basic structure check for each group
    for (const key of REQUIRED_KEYS) {
        const group = restore[key];
        if (typeof group !== 'object' || group === null) return false;
    }

    return true;
}

async function _isRestoreOwnerValid(restore) {
    const REQUIRED_KEYS = ['destinos', 'gastos', 'listagens', 'protegido', 'viagens'];
    const uid = await _getUID();

    // --- Iterate through all document groups ---
    for (const key of REQUIRED_KEYS) {
        const group = restore[key];

        for (const docID in group) {
            if (docID === 'protected') {
                if (!hasValidProtectedOwnership(group.protected)) return false;
                continue;
            }

            if (!hasValidOwnership(group[docID])) return false;
        }
    }

    return true;

    // --- Ownership check for normal docs ---
    function hasValidOwnership(doc) {
        const owner = doc?.compartilhamento?.dono;
        return !owner || owner === uid;
    }

    // --- Ownership check for protected docs ---
    function hasValidProtectedOwnership(protectedGroup) {
        for (const pin in protectedGroup) {
            const pinGroup = protectedGroup[pin];
            for (const docID in pinGroup) {
                if (!hasValidOwnership(pinGroup[docID])) {
                    return false;
                }
            }
        }
        return true;
    }
}

async function _restoreAccount(restore) {
    const uid = await _getUID();

    console.log("Preparing delete operations...");
    const deleteOps = await _collectDeleteOps(uid);
    console.log(`${deleteOps.length} delete operations.`);

    console.log("Executing delete batches...");
    await _commitInChunks(deleteOps);
    console.log("Deletions complete");

    console.log("Preparing create operations...");
    const createOps = await collectCreateOps(restore);
    console.log(`${createOps.length} create operations.`);

    console.log("Executing create batches...");
    await _commitInChunks(createOps);
    console.log("Restoration complete");

    console.log("Preparing user update...");
    const userUpdateOp = collectUserUpdateOp(restore, uid);

    console.log("Executing user update...");
    await _commitInChunks([userUpdateOp]);
    console.log("User update complete");

    console.log("All operations finished successfully");

    async function _commitInChunks(ops, chunkSize = 450) {
        for (let i = 0; i < ops.length; i += chunkSize) {
            const batch = firebase.firestore().batch();
            const slice = ops.slice(i, i + chunkSize);

            for (const op of slice) {
                if (op.type === "delete") {
                    batch.delete(op.ref);
                } else if (op.type === "set") {
                    batch.set(op.ref, op.data, op.options || {});
                }
            }

            await batch.commit();
        }
    }

    async function _collectDeleteOps(uid) {
        const userData = _cloneObject(USER_DATA);
        const ops = [];

        const pushDelete = (ref) => ops.push({ type: "delete", ref });

        // --- CASE A: destinos + listagens ---
        for (const type of ["destinos", "listagens"]) {
            const data = userData[type] ?? [];
            for (const id in data) pushDelete(firebase.firestore().collection(type).doc(id));
            userData[type] = [];
        }

        // --- CASE B: viagens (+ protected / gastos) ---
        if (Array.isArray(userData.viagens)) {
            for (const viagemID in userData.viagens) {

                // Main viagem
                pushDelete(firebase.firestore().collection("viagens").doc(viagemID));

                const protRef = firebase.firestore().collection("protegido").doc(viagemID);

                // Try read for protected
                let protSnap = null;
                try { protSnap = await protRef.get(); } catch { }

                if (protSnap?.exists) {
                    const pin = protSnap.data()?.pin;

                    if (pin) {
                        pushDelete(firebase.firestore().doc(`viagens/protected/${pin}/${viagemID}`));
                        pushDelete(firebase.firestore().doc(`gastos/protected/${pin}/${viagemID}`));
                    }

                    pushDelete(protRef);

                } else {
                    // Fallback normal gastos/<viagemID>
                    pushDelete(firebase.firestore().collection("gastos").doc(viagemID));
                }
            }

            userData.viagens = [];
        }

        // Finally update the user document
        ops.push({
            type: "set",
            ref: firebase.firestore().collection("usuarios").doc(uid),
            data: userData
        });

        return ops;
    }

    async function collectCreateOps(restore) {
        const ops = [];

        const pushCreate = (ref, data, options) =>
            ops.push({ type: "set", ref, data, options });

        for (const type of DATABASE_EDITABLE_DOCUMENTS) {
            const group = restore?.[type];
            if (!group) continue;

            for (const docID of Object.keys(group)) {

                if (docID === "protected") {
                    const tree = group.protected;

                    for (const pin of Object.keys(tree)) {
                        for (const innerID of Object.keys(tree[pin])) {
                            pushCreate(
                                firebase.firestore().doc(`${type}/protected/${pin}/${innerID}`),
                                tree[pin][innerID]
                            );
                        }
                    }
                    continue;
                }

                pushCreate(
                    firebase.firestore().doc(`${type}/${docID}`),
                    group[docID]
                );
            }
        }

        return ops;
    }

    function collectUserUpdateOp(restore, uid) {
        const patch = buildUserUpdateFromRestore(restore);

        return {
            type: "set",
            ref: firebase.firestore().collection("usuarios").doc(uid),
            data: patch,
            options: { merge: true }
        };
    }

    function buildUserUpdateFromRestore(restore) {
        const patch = {};
        const types = ["viagens", "destinos", "listagens"];

        for (const type of types) {
            const group = restore?.usuario?.[type];
            if (!group || Object.keys(group).length === 0) {
                patch[type] = {};
                continue;
            }

            patch[type] = group;
        }

        return patch;
    }
}