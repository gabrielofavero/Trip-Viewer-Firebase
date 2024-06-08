var DOCUMENT_ID;

var ERROR_FROM_GET_REQUEST = "";

// Constructors
function _buildDatabaseObject(success, data, message = "") {
  return ({
    success: success,
    data: data,
    message: message
  })

}

// Generic Methods
async function _get(path) {
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
    console.error(error.message);
    ERROR_FROM_GET_REQUEST = error;
    return;
  }

}

async function _getStatus(path) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      return 'Found';
    } else {
      return 'Not Found';
    }

  } catch (e) {
    const message = e.message;
    if (message.includes('Missing or insufficient permissions')) {
      return 'Forbidden';
    } else {
      console.error(message);
      return 'Unknown';
    }
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
    return _buildDatabaseObject(true, docRef, `Documento criado com sucesso`)

  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao criar o documento: ' + error.message)
  }
}

async function _update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return _buildDatabaseObject(true, update, 'Documento atualizado com sucesso');
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao atualizar o documento: ' + error.message)
  }
}

async function _delete(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _buildDatabaseObject(true, deleteObj, 'Documento atualizado com sucesso');
  } catch (error) {
    console.error(error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao deletar o documento: ' + error.message)
  }
}

// Generic Data
async function _getSingleData(type) {
  let data;
  try {
    const param = type[0];
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get(param);

    data = await _get(`${type}/${id}`);

    if (data) {
      for (let i = 0; i < data?.destinos?.length; i++) {
        const place = await _get(`destinos/${data.destinos[i].destinosID}`);
        data.destinos[i].destinos = place
      }
    } else {
      _exibirErro(`Não foi possível carregar a página. Não há um código de ${type} válido na URL`);
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
async function _updateVisibility(visibility) {
  const uid = await _getUID();
  if (uid) {
    if (!visibility || !["dinamico", "claro", "escuro"].includes(visibility)) {
      console.error("Visibilidade inválida");
    } else {
      const result = await _update(`usuarios/${uid}`, { visibilidade: visibility })
      console.log(result);
    }
  } else {
    console.error("Usuário não logado");
  }
}

async function _getVisibility() {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    return userData.visibilidade;
  }
}

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
    const userData = await _get(`usuarios/${uid}`);
    const promises = [];

    for (const viagemID of userData.viagens) {
      const viagem = await _get(`viagens/${viagemID}`);
      const dono = viagem.compartilhamento.dono;
      if (uid == dono) {
        promises.push(_deleteUserObjectDB(viagemID, "viagens"));
      }
    }

    for (const destinoID of userData.destinos) {
      const destino = await _get(`destinos/${destinoID}`);
      const dono = destino.compartilhamento.dono;
      if (uid == dono) {
        promises.push(_deleteUserObjectDB(destinoID, "destinos"));
      }
    }

    await Promise.all(promises);
    await _delete(`usuarios/${uid}`);
    await firebase.auth().currentUser.delete();
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
      console.log("Dados de usuário atualizados");
    }
  }
}

async function _updateUserObjectDB(object, id, type) {
  if (await _getUID()) {
    try {
      return await _update(`${type}/${id}`, object)
    } catch (error) {
      console.error('Error fetching data:', error);
      return error.message;
    }
  } else return "Usuário não logado"
}

async function _newUserObjectDB(object, type) {
  if (await _getUID()) {
    const result = await _create(type, object)
    console.log(`Criação em ${type}:`);
    console.log(result);
    if (result.data) {
      const id = _getIdFromOjbectDB(result);
      _addToUserArray(type, id);
      return result;
    }
  } else return "Usuário não logado"
}

async function _getUserList(type, includeData = false) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
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

async function _getPermissoes() {
  // Seing permissions is only for Front-End purposes. Security is handled by Firebase Rules
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    return userData?.permissoes;
  }
}