
async function _postCloudFunction(functionName, body, auth = false) {
    const url = await _getCloudFunctionURL(functionName, auth);
    return $.post(url, body);
}

async function _getCloudFunctionURL(functionName, auth = false) {
    let authString = '';

    if (auth) {
        const user = await _getUser();
        if (user) {
            const token = await _getFirebaseIdToken(user);
            authString = `?token=${token}`;
        }
    }

    if (window.location.hostname == "localhost") {
        return `http://127.0.0.1:5001/trip-viewer-tcc/us-central1/${functionName}${authString}`;
    } else {
        return `https://us-central1-trip-viewer-tcc.cloudfunctions.net/${functionName}${authString}`;
    }
}