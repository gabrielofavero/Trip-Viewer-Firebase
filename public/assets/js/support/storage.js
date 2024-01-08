async function _uploadImage(path, id) {
  const fileInput = document.getElementById(id);
  const file = fileInput.files[0];

  if (file) {
    try {
      const storageRef = await firebase.storage().ref();
      const imageRef = storageRef.child(path);

      // Upload the file
      const snapshot = await imageRef.put(file);

      // Get the download URL
      const downloadURL = await snapshot.ref.getDownloadURL();

      console.log('Image uploaded successfully!');
      console.log('Download URL:', downloadURL);

      // Return the download URL
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null; // Return null or handle the error as needed
    }
  }
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


function _getFileExtension(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    return fileName.slice(dotIndex + 1).toLowerCase();
  } else {
    return '';
  }
}

async function _checkAndClearFirebaseImages(id = tripID) {
  const path = `trips/${id}/`;
  if (CLEAR_IMAGES.background === true) {
    _deleteImage(path + 'hero-bg.jpg');
  }

  if (CLEAR_IMAGES.claro === true) {
    _deleteImage(path + 'logo.png');
  }

  if (CLEAR_IMAGES.escuro === true) {
    _deleteImage(path + 'logo-dark.png');
  }
}