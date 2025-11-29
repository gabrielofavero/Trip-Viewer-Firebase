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

// Trip Data
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

// System
async function _getSystemData() {
  const systemData = await _get("config/system");
  return systemData;
}

// Visibilidade

// Usuário
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
  const userId = await _getUID();
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return console.log("User does not exist");

  const userData = userSnap.data();
  const batch = db.batch();

  // --- CASE A: destinos + listagens (simple delete array) ---
  const simpleCollections = ["destinos", "listagens"];
  simpleCollections.forEach(type => {
    const ids = userData[type] ?? [];
    ids.forEach(id => batch.delete(db.collection(type).doc(id)));
    userData[type] = []; // cleanup
  });

  // --- CASE B: viagens (extra protected handling) ---
  if (Array.isArray(userData.viagens)) {
    for (const viagemID of userData.viagens) {
      // Always delete public trip data
      batch.delete(db.collection("viagens").doc(viagemID));

      // Check protegido/viagemID
      const protSnap = await db.collection("protegido").doc(viagemID).get();

      if (protSnap.exists) {
        const pin = protSnap.data()?.pin;

        if (pin) {
          // Delete protected dirs
          batch.delete(db.doc(`viagens/protected/${pin}/${viagemID}`));
          batch.delete(db.doc(`gastos/protected/${pin}/${viagemID}`));
        }

        // Remove protegido reference
        batch.delete(db.collection("protegido").doc(viagemID));

      } else {
        // No protected doc → delete normal gastos
        batch.delete(db.collection("gastos").doc(viagemID));
      }
    }

    userData.viagens = [];
  }

  // Save cleaned user object
  batch.update(userRef, userData);

  await batch.commit();
  console.log("All user data removed successfully.");
}



async function _createAccountDocuments(data) {
  const uid = await _getUID();
  if (!uid) return;

  const userRef = firebase.firestore().doc(`usuarios/${uid}`);

  await firebase.firestore().runTransaction(async (tx) => {
    const userData = (await tx.get(userRef)).data();

    for (const type of DATABASE_EDITABLE_DOCUMENTS) {
      const group = data?.[type];
      if (!group) continue;

      for (const docID of Object.keys(group)) {
        if (docID === "protected") {
          _processProtectedDocuments(group[docID], type, tx);
          continue;
        }

        tx.set(firebase.firestore().doc(`${type}/${docID}`), group[docID]);
      }
    }

    tx.update(userRef, userData);
  });
}

function _processProtectedDocuments(tree, type, tx) {
  for (const pin of Object.keys(tree)) {
    for (const docID of Object.keys(tree[pin])) {
      tx.set(
        firebase.firestore().doc(`${type}/protected/${pin}/${docID}`),
        tree[pin][docID]
      );
    }
  }
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

async function _getUserList(type, includeData = false, userData) {
  const uid = await _getUID();
  if (uid) {

    if (!userData) {
      userData = await _get(`usuarios/${uid}`);
    }

    var result = [];

    if (userData) {
      for (const id of userData[type]) {
        const data = await _get(`${type}/${id}`);
        var singleResult = {
          code: id,
          titulo: data.titulo,
        }

        if (data.inicio && data.fim) {
          singleResult.inicio = data.inicio;
          singleResult.fim = data.fim;
        }

        if (data.versao?.ultimaAtualizacao) {
          const date = new Date(data.versao.ultimaAtualizacao);
          const dateString = _getDateString(date, "dd/mm/yyyy");
          singleResult.ultimaAtualizacao = data.versao.ultimaAtualizacao;
          singleResult.ultimaAtualizacaoText = `${translate('labels.last_updated_on')} ${dateString}`;
        }

        if (data.subtitulo) {
          singleResult.subtitulo = data.subtitulo;
        }

        if (data.cores) {
          singleResult.cores = data.cores;
        }

        if (includeData) {
          singleResult.data = data;
        }

        result.push(singleResult);
      }
    }

    return result;

  } else {
    throw new Error(translate('messages.errors.unauthenticated'));
  }
}

async function _getUserListIDs(type) {
  const userList = await _getUserList(type);
  return userList.map(item => item.code);
}

async function _getPermissoes() {
  // Seing permissions is only for Front-End purposes. Security is handled by Firebase Rules
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    return userData?.permissoes;
  }
}

function _combineDatabaseResponses(responses) {
  if (responses.length === 1) {
    return responses[0];
  }

  const success = !responses.some(response => response.success === false);
  let message = success ? translate('messages.operations.success') : `${translate('messages.operations.error')}. ${translate('messages.documents.update.error')}`;

  return {
    message: message,
    success: success,
    data: responses
  }
}