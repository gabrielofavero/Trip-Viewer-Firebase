function _loadEditModule(type, loadListener = true) {
    const habilitado = getID(`habilitado-${type}`);
    if (habilitado.checked) {
        _showContent(type);
        if (!getID(`habilitado-${type}-content`).innerText) {
            _add(_firstCharToUpperCase(type).trim())
        }
    } else {
        _hideContent(type);
    }
    if (loadListener) {
        _loadListener(type);
    }
}

function _loadListener(type) {
    const habilitado = getID(`habilitado-${type}`);
    habilitado.addEventListener('change', function () {
        if (habilitado.checked) {
            _showContent(type);
            if (!getID(`habilitado-${type}-content`).innerText) {
                _add(_firstCharToUpperCase(type).trim())
            }
        } else {
            _hideContent(type);
        }
    });
}

function _showContent(type) {
    const habilitadoContent = getID(`habilitado-${type}-content`);
    habilitadoContent.style.display = 'block';

    const adicionarBox = getID(`${type}-adicionar-box`);
    if (adicionarBox) {
        adicionarBox.style.display = 'block';
    }

    let i = 1;
    let text = `collapse-${type}-${i}`;

    while (getID(text)) {
        $(`#${text}`).collapse('hide');
        i++;
        text = `${type}-${i}`;
    }
}

function _hideContent(type) {
    const habilitadoContent = getID(`habilitado-${type}-content`);
    habilitadoContent.style.display = 'none';

    const adicionarBox = getID(`${type}-adicionar-box`);
    if (adicionarBox) {
        adicionarBox.style.display = 'none';
    }
}

function _loadImageSelector(type) {
    const checkboxLink = getID(`enable-link-${type}`);
    const checkboxUpload = getID(`enable-upload-${type}`);

    const link = getID(`link-${type}`);
    const upload = getID(`upload-${type}`);

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
    });

}


function _loadLogoSelector() {
    const checkboxLink = getID(`enable-link-logo`);
    const checkboxUpload = getID(`enable-upload-logo`);

    const linkLight = getID(`link-logo-light`);
    const uploadLight = getID(`upload-logo-light`);

    const linkDark = getID(`link-logo-dark`);
    const uploadDark = getID(`upload-logo-dark`);

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
}

