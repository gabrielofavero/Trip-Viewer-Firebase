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
      _logger(WARN, message);
      return;
    }
  } catch (e) {
    _logger(ERROR, e.message);
    return;
  }

}

async function _exists(path) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    return snapshot.exists;
  } catch (e) {
    _logger(ERROR, e.message);
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
    _logger(ERROR, error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao criar o documento: ' + error.message)
  }
}

async function _update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return _buildDatabaseObject(true, update, 'Documento atualizado com sucesso');
  } catch (error) {
    _logger(ERROR, error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao atualizar o documento: ' + error.message)
  }
}

async function _delete(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _buildDatabaseObject(true, deleteObj, 'Documento atualizado com sucesso');
  } catch (error) {
    _logger(ERROR, error.message);
    return _buildDatabaseObject(false, {}, 'Erro ao deletar o documento: ' + error.message)
  }
}

// Backup & Config
async function _getBackup() {
  try {
    const uid = await _getUID();
    if (uid) {
      const collections = [
        "admin",
        "config",
        "passeios",
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
          _logger(ERROR, `Error fetching data from ${collectionName}:`, error);
          throw error;
        }
      });

      const results = await Promise.all(promises);
      console.log(JSON.stringify(results));
    } else {
      console.log("No authenticated user found.");
    }
  } catch (error) {
    _logger(ERROR, "Error while fetching data:", error);
  }
}

async function _getConfig() {
  try {
    const callSyncOrder = await _get('config/call-sync-order');
    const information = await _get('config/information');
    const places = await _get('config/places');
    const transportes = await _get('config/transportes');
    const cores = await _get('config/cores');

    const config = {
      callSyncOrder: callSyncOrder,
      information: information,
      places: places,
      transportes: transportes,
      cores: cores,
    };

    return config;

  } catch (error) {
    _logger(ERROR, 'Error fetching data from Firestore:', error.message);
  }
}

// Visibilidade
async function _updateVisibility(visibility) {
  const uid = await _getUID();
  if (uid) {
    if (!visibility || !["dinamico", "claro", "escuro"].includes(visibility)) {
      _logger(ERROR, "Visibilidade inválida");
    } else {
      const result = await _update(`usuarios/${uid}`, { visibilidade: visibility })
      console.log(result);
    }
  } else {
    _logger(ERROR, "Usuário não logado");
  }
}

async function _getVisibility() {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    return userData.visibilidade;
  }
}

// Viagens
async function _getSingleTrip() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tripID = urlParams.get('v');

    let trip = await _get(`viagens/${tripID}`);

    for (let i = 0; i < trip.cidades.length; i++) {
      const place = await _get(`passeios/${trip.cidades[i].passeiosID}`);
      trip.cidades[i].passeios = place
    }

    return trip;

  } catch (error) {
    _logger(ERROR, 'Error fetching data from Firestore:', error.message);
    return null;
  }
}

async function _isTripPublic(tripID) {
  try {
    const trip = await _get(`viagens/${tripID}`);
    return trip.compartilhamento.ativo;
  } catch (error) {
    _logger(ERROR, 'Error fetching data from Firestore:', error.message);
    return null;
  }
}

async function _updateTripImages(body) {
  if (await _getUID()) {
    try {
      if (body.background || body.logoLight || body.logoDark) {
        let uploadObject = {};

        if (body.background) {
          uploadObject['imagem.background'] = body.background;
        }

        if (body.logoLight) {
          uploadObject['imagem.claro'] = body.logoLight;
        }

        if (body.logoDark) {
          uploadObject['imagem.escuro'] = body.logoDark;
        }

        if (body.galeria?.length > 0) {
          var galeria = await _get(`viagens/${body.viagemID}/galeria`);
          if (galeria) {
            for (let j = 0; j < body.galeria.length; j++) {
              const i = body.galeria[j] - 1;
              if (galeria.imagens[i]) {
                galeria.imagens[i].link = body.galeria[j].link;
              }
            }
            uploadObject['galeria'] = galeria;
          }
        }

        await _update(`viagens/${body.viagemID}`, uploadObject);
      }

      return `Viagem '${body.viagemID}' atualizada com sucesso`;

    } catch (e) {
      return `Erro ao atualizar viagem: ${e.message}`;
    }


  } else return "Usuário não logado"
}

// Passeios
async function _getSinglePlaces() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const placesID = urlParams.get('p');

    let place = await _get(`passeios/${placesID}`);

    if (place == null) {
      _displayNoPlaceError();
    }

    return place;

  } catch (error) {
    _logger(ERROR, 'Error fetching data from Firestore:', error.message);
    _displayNoPlaceError();
    return null;
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

    for (const passeioID of userData.passeios) {
      const passeio = await _get(`passeios/${passeioID}`);
      const dono = passeio.compartilhamento.dono;
      if (uid == dono) {
        promises.push(_deleteUserObjectDB(passeioID, "passeios"));
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

async function _updateUserObjectDB(object, placesID, type) {
  if (await _getUID()) {
    try {
      return await _update(`${type}/${placesID}`, object)
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

async function _getUserList(type) {
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

        result.push(singleResult);
      }
    }

    return result;

  } else {
    _logger(ERROR, "Usuário não logado");
  }
}