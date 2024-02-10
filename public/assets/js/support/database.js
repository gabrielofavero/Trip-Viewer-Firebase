function _getDatabaseObject(success, data, message = "") {
  return ({
    success: success,
    data: data,
    message: message
  })

}

// Main Methods
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

async function _create(collection, data, docName = "") {
  try {
    let docRef = '';
    if (!docName) {
      docRef = await firebase.firestore().collection(collection).add(data);
    } else {
      docRef = await firebase.firestore().collection(collection).doc(docName).set(data)
    }
    return _getDatabaseObject(true, docRef, `Documento criado com sucesso`)

  } catch (error) {
    _logger(ERROR, error.message);
    return _getDatabaseObject(false, {}, 'Erro ao criar o documento: ' + error.message)
  }
}

async function _update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return _getDatabaseObject(true, update, 'Documento atualizado com sucesso');
  } catch (error) {
    _logger(ERROR, error.message);
    return _getDatabaseObject(false, {}, 'Erro ao atualizar o documento: ' + error.message)
  }
}

async function _delete(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return _getDatabaseObject(true, deleteObj, 'Documento atualizado com sucesso');
  } catch (error) {
    _logger(ERROR, error.message);
    return _getDatabaseObject(false, {}, 'Erro ao deletar o documento: ' + error.message)
  }
}

// Modules
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

async function _getUserTrips() {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    var viagens = [];

    if (userData) {
      for (const viagemID of userData.viagens) {
        const viagem = await _get(`viagens/${viagemID}`);
        viagens.push({
          code: viagemID,
          titulo: viagem.titulo,
          inicio: viagem.inicio,
          fim: viagem.fim,
        });
      }
    }

    return viagens;

  } else {
    _logger(ERROR, "Usuário não logado");
  }
}

async function _getUserPlaces() {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    var passeios = [];

    if (userData) {
      for (const passeioID of userData.passeios) {
        const passeio = await _get(`passeios/${passeioID}`);
        passeios.push({
          code: passeioID,
          titulo: passeio.titulo
        })
      }
    }

    return passeios

  } else {
    _logger(ERROR, "Usuário não logado");
  }
}

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

async function _deleteTrip(id) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    var viagens = userData.viagens;

    const index = viagens.indexOf(id);
    if (index !== -1) {
      viagens.splice(index, 1);
      _update(`viagens/${id}`, { viagens: viagens })
    }

    return await _delete(`viagens/${id}`);
  }
}

async function _deletePlace(id) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    var passeios = userData.passeios;

    const index = passeios.indexOf(id);
    if (index !== -1) {
      passeios.splice(index, 1);
      _update(`passeios/${id}`, { passeios: passeios })
    }

    return await _delete(`passeios/${id}`);
  }
}

async function _addTripToUser(id) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    let viagens = userData.viagens
    viagens.push(id);
    return await _update(`usuarios/${uid}`, { viagens: viagens })
  }
}

async function _addPlaceToUser(id) {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);
    let passeios = userData.passeios
    passeios.push(id);
    return await _update(`usuarios/${uid}`, { passeios: passeios })
  }
}

async function _deleteAccount() {
  const uid = await _getUID();
  if (uid) {
    const userData = await _get(`usuarios/${uid}`);

    for (const viagemID of userData.viagens) {
      const viagem = await _get(`viagens/${viagemID}`);
      const dono = viagem.compartilhamento.dono;
      if (viagemID == dono) {
        _deleteTrip(viagemID)
      }
    }

    for (const passeioID of userData.passeios) {
      const passeio = await _get(`passeios/${passeioID}`);
      const dono = passeio.compartilhamento.dono;
      if (passeioID == dono) {
        _deletePlace(passeioID)
      }
    }
  }
}

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

async function _updatePlaces(places, placesID) {
  if (await _getUID()) {
    try {
      return await _update(`passeios/${placesID}`, places)
    } catch (error) {
      console.error('Error fetching data:', error);
      return error.message;
    }
  } else return "Usuário não logado"
}

async function _newPlaces(places) {
  if (await _getUID()) {
    return await _create('passeios', places)
  } else return "Usuário não logado"
}

async function _updateTripImage(body) {
  if (await _getUID()) {
    const viagemDoc = admin.firestore().doc(`viagens/${body.viagemID}`);

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

        await viagemDoc.update(uploadObject);
      }

      return `Viagem '${body.viagemID}' atualizada com sucesso`;

    } catch (e) {
      return `Erro ao atualizar viagem: ${e.message}`;
    }


  } else return "Usuário não logado"
}