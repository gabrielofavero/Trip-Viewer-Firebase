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
      const message = `O documento buscado não existe: ${path}`;
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
      console.warn(`O documento '${path}' não existe restrições de leitura, mas não pode existe`);
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
    return _buildDatabaseObject(true, `Documento criado com sucesso`, docRef)

  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, 'Erro ao criar o documento: ' + error.message)
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

    return _buildDatabaseObject(true, `Documento criado com sucesso`, docRef);
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, 'Erro ao criar o documento: ' + error.message);
  }
}

async function _update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return _buildDatabaseObject(true, 'Documento atualizado com sucesso', update);
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, 'Erro ao atualizar o documento: ' + error.message)
  }
}

async function _override(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    await docRef.set(newData, { merge: false });
    return _buildDatabaseObject(true, 'Documento substituído com sucesso');
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, 'Erro ao substituir o documento: ' + error.message);
  }
}

async function _delete(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _buildDatabaseObject(true, 'Documento atualizado com sucesso', deleteObj);
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, 'Erro ao deletar o documento: ' + error.message)
  }
}

// Generic Data
async function _getSingleData(type) {
  let data;
  try {
    data = await _get(`${type}/${_getURLParam(type[0])}`);

    if (data) {
      for (let i = 0; i < data?.destinos?.length; i++) {
        let place;
        try {
          place = await _get(`destinos/${data.destinos[i].destinosID}`, false);
          data.destinos[i].destinos = place
        } catch (e) {
          console.warn(`Não foi possível carregar o destino ${data.destinos[i].destinosID}: ${e.message}`);
          data.destinos.splice(i, 1);
        }
      }
    } else {
      _displayError(`Não foi possível carregar a página. Não há um código de ${type} válido na URL`);
    }
  } catch (error) {
    console.error('Error fetching data from Firestore:', error.message);
  }

  return data;
}

// Backup e System
async function _getBackup() {
  try {
    const uid = await _getUID();
    if (uid) {
      const collections = [
        "admin",
        "config",
        "destinos",
        "usuarios",
        "viagens",
      ];

      const promises = collections.map(async (collectionName) => {
        try {
          const collectionRef = firebase.firestore().collection(collectionName);
          const snapshot = await collectionRef.get();
          const docs = snapshot.docs.map((doc) => doc.data());
          return { collection: collectionName, docs };
        } catch (error) {
          console.error(`Error fetching data from ${collectionName}:`, error);
          throw error;
        }
      });

      const results = await Promise.all(promises);
      console.log(JSON.stringify(results));
    } else {
      console.log("No authenticated user found.");
    }
  } catch (error) {
    console.error("Error while fetching data:", error);
  }
}

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
      console.log("Dados de usuário atualizados");
    }
  }
}

async function _newUserObjectDB(object, type) {
  if (await _getUID()) {
    const result = await _create(type, object)
    console.log(`Criação em ${type}:`);
    console.log(result);
    if (result.data) {
      const id = _getIdFromObjectDB(result);
      _addToUserArray(type, id);
      return result;
    }
  } else return "Usuário não logado"
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
          const dateString = _jsDateToDate(date, "dd/mm/yyyy");
          singleResult.ultimaAtualizacao = data.versao.ultimaAtualizacao;
          singleResult.ultimaAtualizacaoText = `Atualizado em ${dateString}`;
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
    throw new Error(`Não foi possível carregar a lista de ${type} pois o usuário não está logado`);
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
  let message = success ? "Operações concluídas com sucesso" : "Uma ou mais operações falharam. Não foi possível atualizar seu documento por completo";

  return {
    message: message,
    success: success,
    data: responses
  }
}