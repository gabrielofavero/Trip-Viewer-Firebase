var DOCUMENT_ID;
var ERROR_FROM_GET_REQUEST = "";

const DATABASE_TRIP_DOCUMENTS = ["viagens", "destinos", "listagens"];
const DATABASE_EDITABLE_DOCUMENTS = ["viagens", "destinos", "listagens", "gastos", "protegido"];

// Constructors
function _buildDatabaseObject(success, message = "", data = {}) {
  return ({
    success: success,
    data: data,
    message: message
  })

}

// Generic Methods
async function _get(path, treatError = true, hideWarn = false) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      return snapshot.data();
    } else if (!hideWarn) {
      const message = `Document not found: ${path}`;
      console.warn(message);
      return;
    }
  } catch (error) {
    if (treatError) {
      console.error(error.message);
      ERROR_FROM_GET_REQUEST = error;
      return;
    } else throw error;
  }
}

async function _hasReadPermission(path) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.warn(`Document has reading permissions, but it was not found: ${path}`);
    }

    return true;
  } catch (e) {
    return false;
  }

}

async function _create(collection, data, docName = "") {
  try {
    let docRef = '';
    if (!docName) {
      docRef = await firebase.firestore().collection(collection).add(data);
    } else {
      docRef = await firebase.firestore().collection(collection).doc(docName).set(data)
    }
    return _buildDatabaseObject(true, translate('messages.documents.create.success'), docRef)

  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, `${translate('messages.documents.create.error')}: ${error.message}`)
  }
}

async function _deepCreate(path, data, docId = "") {
  try {
    let docRef;

    if (!docId) {
      // Auto-generate document ID
      docRef = await firebase.firestore().collection(path).add(data);
    } else {
      // Specify custom document ID (supports deeper paths)
      docRef = firebase.firestore().doc(`${path}/${docId}`);
      await docRef.set(data);
    }

    return _buildDatabaseObject(true, translate('messages.documents.create.success'), docRef);
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, `${translate('messages.documents.create.error')}: ${error.message}`);
  }
}

async function _update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return _buildDatabaseObject(true, translate('messages.documents.update.success'), update);
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, `${translate('messages.documents.update.error')}: ${error.message}`)
  }
}

async function _override(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    await docRef.set(newData, { merge: false });
    return _buildDatabaseObject(true, translate('messages.documents.replace.success'));
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, `${translate('messages.documents.replace.error')}: ${error.message}`);
  }
}

async function _delete(path, ignoreError = false) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _buildDatabaseObject(true, translate('messages.documents.delete.success'), deleteObj);
  } catch (error) {
    if (ignoreError) {
      _buildDatabaseObject(true, translate('messages.documents.delete.success'));
    }
    console.error(error.message);
    return _buildDatabaseObject(false, `${translate('messages.documents.delete.error')}: ${error.message}`)
  }
}

// Business logic functions
function _createBatchOps() {
  const db = firebase.firestore();
  const batch = db.batch();
  const ops = [];

  function ref(path) {
    return db.doc(path);
  }

  function track(type, path, data) {
    ops.push({ type, path, data });
  }

  return {
    set(path, data) {
      batch.set(ref(path), data, { merge: true });
      track('set', path, data);
    },

    overwrite(path, data) {
      batch.set(ref(path), data, { merge: false });
      track('overwrite', path, data);
    },

    update(path, data) {
      batch.update(ref(path), data);
      track('update', path, data);
    },

    delete(path) {
      batch.delete(ref(path));
      track('delete', path);
    },

    commit: async () => {
      try {
        await batch.commit();
        return {
          success: true,
          operations: ops.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          operations: ops
        };
      }
    }
  };
}


async function _getSingleData(type) {
  let data;
  try {
    data = await _get(`${type}/${_getURLParam(type[0])}`);
    if (!data) {
      _displayError(`${translate('messages.documents.get.error')}. ${translate(translate('messages.documents.get.no_code'))}`);
    }
    if (type === 'viagens' && data?.destinos && data.destinos.length > 0) {
      data = await _getTripDataWithDestinos(data);
    }
  } catch (error) {
    console.error('Error fetching data from Firestore:', error.message);
  }

  return data;
}

async function _getTripDataWithDestinos(tripData) {
  for (let i = 0; i < tripData?.destinos?.length; i++) {
    let place;
    try {
      place = await _get(`destinos/${tripData.destinos[i].destinosID}`, false);
      tripData.destinos[i].destinos = place
    } catch (e) {
      console.warn(`Unable to get destination ${tripData.destinos[i].destinosID}: ${e.message}`);
      tripData.destinos.splice(i, 1);
    }
  }
  return tripData;
}

async function _getSystemData() {
  const systemData = await _get("config/system");
  return systemData;
}

async function _deleteUserObjectDB(id, type) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    let dataArray = userData[type];
    dataArray = dataArray.filter(item => item !== id);

    let result = {};
    result[type] = dataArray;

    _update(`usuarios/${uid}/`, result)

    return await _delete(`${type}/${id}`);
  }

}

async function _deleteAccount() {
  const uid = await _getUID();
  if (uid) {
    await _deleteAccountDocuments();
    await _delete(`usuarios/${uid}`);
    await firebase.auth().currentUser.delete();
  }
}

async function _deleteAccountDocuments() {
  const uid = await _getUID();
  const userData = await _get(`usuarios/${uid}`);

  const deleteOps = [];

  const safePushDelete = (ref) => {
    deleteOps.push(
      ref.delete().then(
        () => console.log("Deleted:", ref.path),
        (err) => console.warn("⚠️ Failed:", ref.path, err.message)
      )
    );
  };

  // --- CASE A: destinos + listagens ---
  for (const type of ["destinos", "listagens"]) {
    const ids = userData[type] ?? [];
    for (const id of ids) {
      const ref = firebase.firestore().collection(type).doc(id);
      safePushDelete(ref);
    }
    userData[type] = [];
  }

  // --- CASE B: viagens ---
  if (Array.isArray(userData.viagens)) {

    for (const viagemID of userData.viagens) {

      const refViagem = firebase.firestore().collection("viagens").doc(viagemID);
      safePushDelete(refViagem);

      const protRef = firebase.firestore().collection("protegido").doc(viagemID);

      // Read protRef (read must be awaited, deletes can be parallel)
      let protSnap = null;
      try {
        protSnap = await protRef.get();
      } catch (e) {
        console.warn("⚠️ Failed reading:", protRef.path, e.message);
      }

      if (protSnap?.exists) {
        const pin = protSnap.data()?.pin;

        if (pin) {
          safePushDelete(firebase.firestore().doc(`viagens/protected/${pin}/${viagemID}`));
          safePushDelete(firebase.firestore().doc(`gastos/protected/${pin}/${viagemID}`));
        }

        safePushDelete(protRef);

      } else {
        const gastosRef = firebase.firestore().collection("gastos").doc(viagemID);
        safePushDelete(gastosRef);
      }
    }

    userData.viagens = [];
  }

  // --- Update user object individually (not batched) ---
  const userRef = firebase.firestore().collection("usuarios").doc(uid);
  deleteOps.push(
    userRef.update(userData).then(
      () => console.log("Updated user:", userRef.path),
      (err) => console.warn("⚠️ Failed updating user:", userRef.path, err.message)
    )
  );

  console.log("Running all delete ops...");
  await Promise.allSettled(deleteOps);
}

async function _addToUserArray(type, value) {
  const uid = await _getUID();
  if (uid) {
    const userDoc = await _get(`usuarios/${uid}`);
    if (userDoc) {
      let list = userDoc[type];
      if (!list) {
        list = [];
      }
      if (!list.includes(value)) {
        list.push(value);
        await _update(`usuarios/${uid}`, {
          [type]: list
        });
      }
      console.log("User data updated successfully");
    }
  }
}

async function _newUserObjectDB(object, type) {
  if (await _getUID()) {
    const result = await _create(type, object)
    console.log(`Document created in ${type}:`);
    console.log(result);
    if (result.data) {
      const id = _getIdFromObjectDB(result);
      _addToUserArray(type, id);
      return result;
    }
  } else return translate('messages.unauthenticated');
}

async function _getUserData(uid) {
  if (!uid) {
    uid = await _getUID();
  }
  return await _get(`usuarios/${uid}`);
}

async function _getPermissoes() {
  // Seing permissions is only for Front-End purposes. Security is handled by Firebase Rules
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    return userData?.permissoes;
  }
}

async function _getDestination(id, containerID) {
  if (DESTINOS_ATIVOS[id]) return DESTINOS_ATIVOS[id];

  let content, preloader, isAlreadyLoading;
  if (containerID) {
    const container = getID(containerID);
    content = container.querySelector('.content');
    preloader = container.querySelector('.preloader');

    content.style.display = 'none';
    preloader.style.display = 'block';
  } else {
    isAlreadyLoading = _isAlreadyLoading();
    if (!isAlreadyLoading) {
      _startLoadingScreen();
    }
  }

  try {
    DESTINOS_ATIVOS[id] = await _get(`destinos/${id}`);
    return DESTINOS_ATIVOS[id];
  } finally {
    if (containerID) {
      content.style.display = 'block';
      preloader.style.display = 'none';
    } else if (!isAlreadyLoading) {
      _stopLoadingScreen();
    }
  }
}