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


async function _retrieveImage(path) {
  const storageRef = firebase.storage().ref();
  const imageRef = storageRef.child(path);

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