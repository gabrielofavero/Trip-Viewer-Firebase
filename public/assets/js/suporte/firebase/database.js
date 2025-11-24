var DOCUMENT_ID;
var ERROR_FROM_GET_REQUEST = "";

const DATABASE_TRIP_DOCUMENTS = ["viagens", "destinos", "listagens"];

// Constructors
function _buildDatabaseObject(success, message = "", data = {}) {
  return ({
    success: success,
    data: data,
    message: message
  })

}

// Generic Methods
async function _get(path, treatError = true) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      return snapshot.data();
    } else {
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

async function _delete(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _buildDatabaseObject(true, translate('messages.documents.delete.success'), deleteObj);
  } catch (error) {
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
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    const promises = [];

    for (const type of DATABASE_TRIP_DOCUMENTS) {
      if (userData[type]) {
        for (const docID of userData[type]) {
          promises.push(_delete(`${type}/${docID}`));
        }
        userData[type] = [];
      }
    }

    promises.push(_update(`usuarios/${uid}`, userData));
    await Promise.all(promises);
  }
}

async function _createAccountDocuments(data) {
  const uid = await _getUID();
  if (!uid) return;

  const promises = [];
  const userData = await _get(`usuarios/${uid}`);

  for (const type of DATABASE_TRIP_DOCUMENTS) {
    if (data[type]) {
      for (const document of data[type]) {
        promises.push(_create(type, document.data, document.code));
        userData[type].push(document.code);
      }
    }
  }

  promises.push(_update(`usuarios/${uid}`, userData));
  await Promise.all(promises);
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