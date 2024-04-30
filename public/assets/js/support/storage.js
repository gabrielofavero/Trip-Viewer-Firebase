const FIREBASE_IMAGE_ORIGIN = 'https://firebasestorage.googleapis.com/v0/b/trip-viewer-tcc.appspot.com/';

var FIREBASE_IMAGES = {
  background: false,
  claro: false,
  escuro: false
}

var IMAGE_UPLOAD_ERROR = {
  status: false,
  messages: {}
}
var UPLOAD_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
var PERMISSOES;

async function _uploadImage(path, divID) {
  let result = {
    nome: null,
    link: null,
    caminho: null,
  };

  const file = getID(divID)?.files[0];
  if (file && IMAGE_UPLOAD_ERROR.status === false) {
    try {
      const storageRef = await firebase.storage().ref();
      const imageRef = storageRef.child(`${path}/${file.name}`);

      const snapshot = await imageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      result.nome = file.name;
      result.link = downloadURL;
      result.caminho = snapshot.ref.fullPath;

      console.log(`Imagem '${result.nome}' carregada com sucesso: ${result.link}`);

    } catch (error) {
      IMAGE_UPLOAD_ERROR.status = true;
      console.error('Erro ao fazer upload da imagem:', error.message || error);

      const key = _codifyText(_getLastDir(path));
      IMAGE_UPLOAD_ERROR.messages[key] = _getStorageErrorMessage(error);
    }
  }

  return result;
}

async function _updateImages(body) {
  if (await _getUID() && IMAGE_UPLOAD_ERROR.status === false) {
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

    if (_objectExistsAndHasKeys(body.custom)) {
      for (const key in body.custom) {
        if (TO_UPLOAD[key]) {
          uploadObject[`${key}.imagens`] = body.custom[key];
        }
      }
    }

    if (_objectExistsAndHasKeys(uploadObject)) {
      await _update(`${body.type}/${body.id}`, uploadObject);
      IMAGE_UPDATE_MADE = true;
    } else {
    }
  }
}

async function _deleteUnusedImages(beforeDB, afterDB) {
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.background, afterDB?.imagem?.background);
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.claro, afterDB?.imagem?.claro);
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.escuro, afterDB?.imagem?.escuro);

  _validateMultiValueAndDeleteImage(beforeDB?.hospedagens?.imagens, afterDB?.hospedagens?.imagens);
  _validateMultiValueAndDeleteImage(beforeDB?.galeria?.imagens, afterDB?.galeria?.imagens);
}

async function _validateSingleValueAndDeleteImage(before, after) {
  const exists = (!!before && !!after);
  const isInternalReplacement = (_isExternalImage(before) && _isInternalImage(after));
  const areBothInternal = (_isInternalImage(before) && _isInternalImage(after));

  if (exists && (isInternalReplacement || (areBothInternal && before.nome !== after.nome))) {
    _deleteImage(before.caminho);
  }
}

async function _validateMultiValueAndDeleteImage(beforeArr, afterArr) {
  if (beforeArr && afterArr) {
    const beforeInternals = beforeArr.filter(obj => _isInternalImage(obj));
    const afterInternals = afterArr.filter(obj => _isInternalImage(obj));

    const beforeNomes = beforeInternals.map(obj => obj.nome);
    const afterNomes = afterInternals.map(obj => obj.nome);

    const beforeCaminhos = beforeInternals.map(obj => obj.caminho);

    for (let i = 0; i < beforeNomes.length; i++) {
      if (!afterNomes.includes(beforeNomes[i])) {
        _deleteImage(beforeCaminhos[i]);
      }
    }
  }
}

async function _deleteImage(path) {
  try {
    if (!path) return
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(path);
    await fileRef.delete();

    console.log(`Imagem ${path} apagada com sucesso.`);
  } catch (error) {
    console.error(`Erro ao apagar imagem ${path}: ${error.message}`);
  }
}

async function _deleteUserObjectStorage() {
  const paths = [];
  const addPathIfExists = (path) => {
    if (path) {
      paths.push(path);
    }
  };

  if (FIRESTORE_DATA) {
    const { imagem, hospedagens, galeria } = FIRESTORE_DATA;

    addPathIfExists(imagem?.background?.caminho);
    addPathIfExists(imagem?.claro?.caminho);
    addPathIfExists(imagem?.escuro?.caminho);

    if (hospedagens?.imagens) {
      hospedagens.imagens.forEach(({ caminho }) => addPathIfExists(caminho));
    }

    if (galeria?.imagens) {
      galeria.imagens.forEach(({ caminho }) => addPathIfExists(caminho));
    }

    for (const caminho of paths) {
      await _deleteImage(caminho);
    }
  }

}

async function _deleteImageFolderContents(folderPath) {
  try {
    const storageRef = firebase.storage().ref();
    const folderRef = storageRef.child(folderPath);

    // List all items (files) in the folder
    const items = await folderRef.listAll();

    // Iterate over each item and delete it
    await Promise.all(
      items.items.map(async (item) => {
        await _deleteFile(item.fullPath);
      })
    );

  } catch (error) {
    console.error(`Erro ao deletar imagens em ${folderPath}: ${error.message}`);
  }
}

async function _uploadBackground(type) {
  return await _uploadImage(`${type}/${DOCUMENT_ID}/background`, 'upload-background');
}

async function _uploadLogoLight(type) {
  return await _uploadImage(`${type}/${DOCUMENT_ID}/logo-light`, 'upload-logo-light');
}

async function _uploadLogoDark(type) {
  return await _uploadImage(`${type}/${DOCUMENT_ID}/logo-dark`, 'upload-logo-dark');
}

function _checkFileSize(fileInput, type) {
  const file = fileInput.files[0];

  if ((PERMISSOES && PERMISSOES['tamanhoUploadIrrestrito'] === true) ||
    (file.size <= UPLOAD_SIZE)) {
    getID(`upload-${type}-size-message`).style.display = 'none'
  } else {
    getID(`upload-${type}-size-message`).style.display = 'block';
    fileInput.value = '';
  }
}

function _loadImageSelector(type) {
  const checkboxLink = getID(`enable-link-${type}`);
  const checkboxUpload = getID(`enable-upload-${type}`);
  const checkboxGroup = getID(`upload-checkbox-${type}`);

  const link = getID(`link-${type}`);
  const upload = getID(`upload-${type}`);

  if (PERMISSOES && PERMISSOES['upload'] === true) {
    if (checkboxLink.checked) {
      link.style.display = 'block';
      upload.style.display = 'none';
    } else {
      link.style.display = 'none';
      upload.style.display = 'block';
    }

    checkboxLink.addEventListener('change', function () {
      if (checkboxLink.checked) {
        link.style.display = 'block';
        upload.style.display = 'none';
      } else {
        link.style.display = 'none';
        upload.style.display = 'block';
      }
    });
    checkboxUpload.addEventListener('change', function () {
      if (checkboxUpload.checked) {
        link.style.display = 'none';
        upload.style.display = 'block';
      } else {
        link.style.display = 'block';
        upload.style.display = 'none';
      }
    });
    upload.addEventListener('change', function () {
      _checkFileSize(upload, type);
    });
  } else {
    link.style.display = 'block';
    upload.style.display = 'none';
    checkboxGroup.style.display = 'none';
  }
}

function _removeImageSelectorListeners(type) {
  const checkboxLink = getID(`enable-link-${type}`);
  const checkboxUpload = getID(`enable-upload-${type}`);

  checkboxLink.removeEventListener('change', function () {
    if (checkboxLink.checked) {
      link.style.display = 'block';
      upload.style.display = 'none';
    } else {
      link.style.display = 'none';
      upload.style.display = 'block';
    }
  });
  checkboxUpload.removeEventListener('change', function () {
    if (checkboxUpload.checked) {
      link.style.display = 'none';
      upload.style.display = 'block';
    } else {
      link.style.display = 'block';
      upload.style.display = 'none';
    }
    upload.removeEventListener('change', function () {
      _checkFileSize(upload, type);
    });
  });

}

function _loadLogoSelector() {
  const checkboxLink = getID(`enable-link-logo`);
  const checkboxUpload = getID(`enable-upload-logo`);

  const linkLight = getID(`link-logo-light`);
  const uploadLight = getID(`upload-logo-light`);

  const linkDark = getID(`link-logo-dark`);
  const uploadDark = getID(`upload-logo-dark`);

  if (PERMISSOES && PERMISSOES['upload'] === true) {
    if (checkboxLink.checked) {
      linkLight.style.display = 'block';
      linkDark.style.display = 'block';

      uploadLight.style.display = 'none';
      uploadDark.style.display = 'none';
    } else {
      linkLight.style.display = 'none';
      linkDark.style.display = 'none';

      uploadLight.style.display = 'block';
      uploadDark.style.display = 'block';
    }

    checkboxLink.addEventListener('change', function () {
      if (checkboxLink.checked) {
        linkLight.style.display = 'block';
        linkDark.style.display = 'block';

        uploadLight.style.display = 'none';
        uploadDark.style.display = 'none';
      } else {
        linkLight.style.display = 'none';
        linkDark.style.display = 'none';

        uploadLight.style.display = 'block';
        uploadDark.style.display = 'block';
      }
    });
    checkboxUpload.addEventListener('change', function () {
      if (checkboxUpload.checked) {
        linkLight.style.display = 'none';
        linkDark.style.display = 'none';

        uploadLight.style.display = 'block';
        uploadDark.style.display = 'block';
      } else {
        linkLight.style.display = 'block';
        linkDark.style.display = 'block';

        uploadLight.style.display = 'none';
        uploadDark.style.display = 'none';
      }
    });

    uploadLight.addEventListener('change', function () {
      _checkFileSize(uploadLight, 'logo-light');
    });

    uploadDark.addEventListener('change', function () {
      _checkFileSize(uploadDark, 'logo-dark');
    });


  } else {
    linkLight.style.display = 'block';
    linkDark.style.display = 'block';
    uploadLight.style.display = 'none';
    uploadDark.style.display = 'none';
  }
}

function _isExternalImage(value) {
  if (value && (typeof value === 'string' || value instanceof String) && value.startsWith('http')) {
    return true;
  } else {
    return false;
  }
}

function _isInternalImage(value) {
  if (value && typeof value === 'object' && value.nome && value.link && value.caminho) {
    return true;
  } else {
    return false;
  }
}

function _getImageObject(link, type) {
  const values = FIRESTORE_DATA[type].imagens;
  for (const value of values) {
    if (_objectExistsAndHasKeys(value) && value.link === link) {
      return value;
    }
  }
  return link;
}

function _getImageLink(object) {
  if (_objectExistsAndHasKeys(object)) {
    return object.link;
  } else {
    return object;
  }
}

function _imageExists(object) {
  return (_isInternalImage(object) || _isExternalImage(object));
}

function _getLastDir(path) {
  if (path && typeof path === 'string') {
    const splitPath = path.split('/');
    if (splitPath.length > 0) {
      return splitPath[splitPath.length - 1];
    }
  }
  return 'Pasta Desconhecida';
}

function _getStorageErrorMessage(error) {
  if (error.code == 'storage/unauthorized') {
    return 'Você não possui permissão para fazer upload de arquivos.';
  } else {
    return `Erro "${error.code}" ao fazer upload de arquivos. Contate o administrador do sistema`;
  }
}