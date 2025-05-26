var IMAGE_UPLOAD_STATUS = {
  hasErrors: false,
  messages: {}
}

var UPLOAD_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
var PERMISSOES;

async function _uploadImage(path, file) {
  let result = {
    nome: null,
    link: null,
    caminho: null,
  };

  if (file && IMAGE_UPLOAD_STATUS.hasErrors === false) {
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
      IMAGE_UPLOAD_STATUS.hasErrors = true;
      console.error('Erro ao fazer upload da imagem:', error.message || error);

      const key = _codifyText(_getLastDir(path));
      IMAGE_UPLOAD_STATUS.messages[key] = _getStorageErrorMessage(error);
    }
  }

  return result;
}

async function _uploadImages(type, files) {
  const results = [];
  for (const file of files) {
    const upload = await _uploadImage(`${type}/${DOCUMENT_ID}`, file);
    if (upload.link) {
      results.push(upload);
    }
  }  
  return results;
}

async function _deleteUnusedImages(path, documentLinks) {
  const storageLinks = await _getAllImageUrls(path);
  for (const link of storageLinks) {
    if (!documentLinks.includes(link)) {
      _deleteImageByLink(link); // No need to await this, as we don't need to wait for the deletion to finish
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

async function _deleteImageByLink(link) {
  const path = _getImagePathFromLink(link);
  if (!path) {
    console.error("Caminho não encontrado na URL.");
    return;
  }

  try {
    const fileRef = firebase.storage().ref().child(path);
    await fileRef.delete();
    console.log(`Imagem apagada com sucesso: ${path}`);
  } catch (error) {
    console.error(`Erro ao apagar imagem ${path}: ${error.message}`);
  }
}

function _getImagePathFromLink(link) {
  try {
    const match = link.match(/\/o\/(.*?)\?/);
    if (!match || !match[1]) return null;

    return decodeURIComponent(match[1]);
  } catch (e) {
    console.error("Erro ao extrair o caminho da URL:", e);
    return null;
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

async function _getAllImageUrls(path) {
  const storageRef = firebase.storage().ref(path);

  try {
    const listResult = await storageRef.listAll();
    const downloadURLs = await Promise.all(
      listResult.items
        .filter(item => item.name.match(/\.(jpg|jpeg|png|gif)$/i)) // optional image-only filter
        .map(itemRef => itemRef.getDownloadURL())
    );

    return downloadURLs; // Array of image URLs
  } catch (error) {
    console.error("Erro ao listar imagens:", error.message || error);
    return [];
  }
}

