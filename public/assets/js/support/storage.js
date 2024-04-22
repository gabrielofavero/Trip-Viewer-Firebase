var UPDATE_IMAGES_STATUS = '';

async function _uploadImage(path, divID) {
  let result = {
    nome: null,
    link: null,
    caminho: null,
    status: {
      sucesso: true,
      mensagem: 'Image uploaded successfully!'
    }
  };

  const file = document.getElementById(divID)?.files[0];
  if (file) {
    try {
      const storageRef = await firebase.storage().ref();
      const imageRef = storageRef.child(`${path}/${file.name}`);

      const snapshot = await imageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      console.log(result.status.mensagem);
      console.log('Download URL:', downloadURL);

      result.nome = file.name;
      result.link = downloadURL;
      result.caminho = snapshot.ref.fullPath;

    } catch (error) {
      console.error('Error uploading image:', error);
      result.status.mensagem = error.message;
      result.status.sucesso = false;
    }
  }

  return result;
}

async function _updateImages(body) {
  if (await _getUID()) {
    try {
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
        const db = await _get(`${body.type}/${body.id}`);
        if (_objectExistsAndHasKeys(db)) {
          for (const customKey of Object.keys(body.custom)) {
            const result = body.custom[customKey];
            const dbResult = db[customKey].imagens;
            if (_objectExistsAndHasKeys(result) && result !== dbResult) {
              uploadObject[`${customKey}.imagens`] = result
            }
          }
        }
      }
      await _update(`${body.type}/${body.id}`, uploadObject);

      UPDATE_IMAGES_STATUS = `Imagens de '${body.type}/${body.id}' atualizadas com sucesso`;

    } catch (e) {
      UPDATE_IMAGES_STATUS = `Erro ao atualizar imagens: ${e.message}`;
    }
  } else {
    UPDATE_IMAGES_STATUS = "Usuário não logado"
  }
}

async function _deleteUnusedImages(beforeDB, afterDB) {
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.background, afterDB?.imagem?.background);
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.claro, afterDB?.imagem?.claro);
  _validateSingleValueAndDeleteImage(beforeDB?.imagem?.escuro, afterDB?.imagem?.escuro);

  _validateMultiValueAndDeleteImage(beforeDB?.hospedagens?.imagens, afterDB?.hospedagens?.imagens);
  _validateMultiValueAndDeleteImage(beforeDB?.galeria?.imagens, afterDB?.galeria?.imagens);
}

async function _canUpload() {
  const user = firebase.auth().currentUser;

  if (user) {
    const uid = user.uid;
    const canUploadList = await _get('admin/canUpload');

    if (canUploadList && canUploadList.users && canUploadList.users.includes(uid)) {
      return true;
    }
  }

  return false;
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
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(path);
    await fileRef.delete();

    console.log(`Image ${path} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting image ${path}: ${error.message}`);
  }
}

async function _uploadBackground(viagemID, type) {
  return await _uploadImage(`${type}/${viagemID}/background`, 'upload-background');
}

async function _uploadLogoLight(viagemID, type) {
  return await _uploadImage(`${type}/${viagemID}/logo-light`, 'upload-logo-light');
}

async function _uploadLogoDark(viagemID, type) {
  return await _uploadImage(`${type}/${viagemID}/logo-dark`, 'upload-logo-dark');
}

async function _uploadBathImages(path, uploadItens) {
  result = [];
  for (const item of uploadItens) {
    if (item.toUpload) {
      result.push(await _uploadImage(path, item.value));
    } else if (_isObject(item)){
      result.push(item.value);
    } else {
      result.push(item);
    }
  }
  return result;
}

function _checkFileSize(fileInput, type) {
  const file = fileInput.files[0];

  if ((PERMISSOES && PERMISSOES['tamanhoUploadIrrestrito'] === true) ||
    (file.size <= 1048576)) { // 1MB = 1 * 1024 * 1024 = 1048576 bytes
    document.getElementById(`upload-${type}-size-message`).style.display = 'none'
  } else {
    document.getElementById(`upload-${type}-size-message`).style.display = 'block';
    fileInput.value = '';
  }
}

function _loadImageSelector(type) {
  const checkboxLink = document.getElementById(`enable-link-${type}`);
  const checkboxUpload = document.getElementById(`enable-upload-${type}`);
  const checkboxGroup = document.getElementById(`upload-checkbox-${type}`);

  const link = document.getElementById(`link-${type}`);
  const upload = document.getElementById(`upload-${type}`);

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
  const checkboxLink = document.getElementById(`enable-link-${type}`);
  const checkboxUpload = document.getElementById(`enable-upload-${type}`);

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
  const checkboxLink = document.getElementById(`enable-link-logo`);
  const checkboxUpload = document.getElementById(`enable-upload-logo`);

  const linkLight = document.getElementById(`link-logo-light`);
  const uploadLight = document.getElementById(`upload-logo-light`);

  const linkDark = document.getElementById(`link-logo-dark`);
  const uploadDark = document.getElementById(`upload-logo-dark`);

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

function _getUploadItem(toUpload, value) {
  return {
    toUpload: toUpload,
    value: value
  }
}

function _getImageObjectFromDB(link, arrayDB) {
  let result = link;
  for (const item of arrayDB) {
    if (item && item.link === link) {
      result = item;
      break;
    }
  }
  return result;
}

function _addToUploadItens(type, j) {
  if (!uploadItens) {
    _logger(ERROR, 'Função _addToUploadItens chamada fora de contexto');
    return;
  }

  const id = `${type}-${j}`;
  if (document.getElementById(`enable-link-${id}`).checked) {
    const link = document.getElementById(`link-${id}`).value;
    uploadItens[type].push(_getUploadItem(false, link));
  } else {
    uploadItens[type].push(_getUploadItem(true, `upload-${id}`));
  }
}