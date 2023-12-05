async function _uploadImage(path, id) {
    const fileInput = document.getElementById(id);
    const file = fileInput.files[0];
  
    if (file) {
      const storageRef = await firebase.storage().ref();
      const imageRef = storageRef.child('trips/' + path);
  
      imageRef.put(file).then(snapshot => {
        console.log('Image uploaded successfully!');
      }).catch(error => {
        console.error('Error uploading image:', error);
      });
    }
  }

  async function _retrieveImage(path) {
    const storageRef = firebase.storage().ref();
    const imageRef = storageRef.child('trips/' + path);
  
    try {
      const url = await imageRef.getDownloadURL();
      return url;
    } catch (error) {
      console.error('Error getting download URL:', error);
      _displayErrorMessage(error);
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
  