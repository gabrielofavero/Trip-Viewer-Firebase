import { DOCUMENT_ID } from "./database.js";
import { USER_PERMISSIONS } from "./user.js";
import { getID } from "../../main/app.js";
import { translate } from "../../main/translate.js";

export var IMAGE_UPLOAD_STATUS = {
  hasErrors: false,
  messages: {}
}

var UPLOAD_SIZE = 1.5 * 1024 * 1024; // 1.5 MB

export async function uploadImage(path, file) {
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

      console.log(`Image '${result.nome}' uploaded successfully: ${result.link}`);

    } catch (error) {
      IMAGE_UPLOAD_STATUS.hasErrors = true;
      console.error('Error while uploading image:', error.message || error);

      const key = _codifyText(getLastDir(path));
      IMAGE_UPLOAD_STATUS.messages[key] = getStorageErrorMessage(error);
    }
  }

  return result;
}

export async function uploadImages(type, files) {
  const results = [];
  for (const file of files) {
    const upload = await uploadImage(`${type}/${DOCUMENT_ID}`, file);
    if (upload.link) {
      results.push(upload);
    }
  }  
  return results;
}

export async function deleteUnusedImages(path, documentLinks) {
  const storageLinks = await getAllImageUrls(path);
  for (const link of storageLinks) {
    if (!documentLinks.includes(link)) {
      deleteImageByLink(link); // No need to await this, as we don't need to wait for the deletion to finish
    }
  }
}

async function deleteImage(path) {
  try {
    if (!path) return
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(path);
    await fileRef.delete();

    console.log(`Image ${path} deleted successfully`);
  } catch (error) {
    console.error(`Error while deleting image ${path}: ${error.message}`);
  }
}

async function deleteImageByLink(link) {
  const path = getImagePathFromLink(link);
  if (!path) {
    console.error("URL path could not be extracted from the link:", link);
    return;
  }

  try {
    const fileRef = firebase.storage().ref().child(path);
    await fileRef.delete();
    console.log(`Image ${path} deleted successfully`);
  } catch (error) {
    console.error(`Error while deleting image ${path}: ${error.message}`);
  }
}

function getImagePathFromLink(link) {
  try {
    const match = link.match(/\/o\/(.*?)\?/);
    if (!match || !match[1]) return null;
    return decodeURIComponent(match[1]);
  } catch (e) {
    console.error("URL path could not be extracted from the link:", e);
    return null;
  }
}

export async function deleteUserObjectStorage(firestoreData) {
  const paths = [];
  const addPathIfExists = (path) => {
    if (path) {
      paths.push(path);
    }
  };

  if (firestoreData) {
    const { imagem, hospedagens, galeria } = firestoreData;

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
      await deleteImage(caminho);
    }
  }

}

function checkFileSize(fileInput, type) {
  const file = fileInput.files[0];

  if ((USER_PERMISSIONS && USER_PERMISSIONS['tamanhoUploadIrrestrito'] === true) ||
    (file.size <= UPLOAD_SIZE)) {
    getID(`upload-${type}-size-message`).style.display = 'none'
  } else {
    getID(`upload-${type}-size-message`).style.display = 'block';
    fileInput.value = '';
  }
}

export function loadImageSelector(type) {
  const checkboxLink = getID(`enable-link-${type}`);
  const checkboxUpload = getID(`enable-upload-${type}`);
  const checkboxGroup = getID(`upload-checkbox-${type}`);

  const link = getID(`link-${type}`);
  const upload = getID(`upload-${type}`);

  if (USER_PERMISSIONS && USER_PERMISSIONS['upload'] === true) {
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
      checkFileSize(upload, type);
    });
  } else {
    link.style.display = 'block';
    upload.style.display = 'none';
    checkboxGroup.style.display = 'none';
  }
}

export function removeImageSelectorListeners(type) {
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
      checkFileSize(upload, type);
    });
  });
}

export function loadLogoSelector() {
  const checkboxLink = getID(`enable-link-logo`);
  const checkboxUpload = getID(`enable-upload-logo`);

  const linkLight = getID(`link-logo-light`);
  const uploadLight = getID(`upload-logo-light`);

  const linkDark = getID(`link-logo-dark`);
  const uploadDark = getID(`upload-logo-dark`);

  if (USER_PERMISSIONS && USER_PERMISSIONS['upload'] === true) {
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
      checkFileSize(uploadLight, 'logo-light');
    });

    uploadDark.addEventListener('change', function () {
      checkFileSize(uploadDark, 'logo-dark');
    });


  } else {
    linkLight.style.display = 'block';
    linkDark.style.display = 'block';
    uploadLight.style.display = 'none';
    uploadDark.style.display = 'none';
  }
}

function getLastDir(path) {
  if (path && typeof path === 'string') {
    const splitPath = path.split('/');
    if (splitPath.length > 0) {
      return splitPath[splitPath.length - 1];
    }
  }
  return translate('messages.errors.unknown_directory');
}

function getStorageErrorMessage(error) {
  if (error.code == 'storage/unauthorized') {
    return translate('messages.errors.no_upload_permission');
  } else {
    return `${translate('messages.errors.upload_error')}: '${error.code}'. ${translate('messages.error.contact_admin')}`;
  }
}

async function getAllImageUrls(path) {
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
    console.error("Error while listing images:", error.message || error);
    return [];
  }
}

