function _loadEditModule(type, loadListener = true) {
    const habilitado = document.getElementById(`habilitado-${type}`);
    if (habilitado.checked) {
        _showContent(type);
        if (!document.getElementById(`habilitado-${type}-content`).innerText) {
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
    const habilitado = document.getElementById(`habilitado-${type}`);
    habilitado.addEventListener('change', function () {
        if (habilitado.checked) {
            _showContent(type);
            if (!document.getElementById(`habilitado-${type}-content`).innerText) {
                _add(_firstCharToUpperCase(type).trim())
            }
        } else {
            _hideContent(type);
        }
    });
}

function _showContent(type) {
    const habilitadoContent = document.getElementById(`habilitado-${type}-content`);
    habilitadoContent.style.display = 'block';

    const adicionarBox = document.getElementById(`${type}-adicionar-box`);
    if (adicionarBox) {
        adicionarBox.style.display = 'block';
    }

    let i = 1;
    let text = `collapse-${type}-${i}`;

    while (document.getElementById(text)) {
        $(`#${text}`).collapse('hide');
        i++;
        text = `${type}-${i}`;
    }
}

function _hideContent(type) {
    const habilitadoContent = document.getElementById(`habilitado-${type}-content`);
    habilitadoContent.style.display = 'none';

    const adicionarBox = document.getElementById(`${type}-adicionar-box`);
    if (adicionarBox) {
        adicionarBox.style.display = 'none';
    }
}

function _loadImageSelector(type) {
    const checkboxLink = document.getElementById(`enable-link-${type}`);
    const checkboxUpload = document.getElementById(`enable-upload-${type}`);

    const link = document.getElementById(`link-${type}`);
    const upload = document.getElementById(`upload-${type}`);

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
    });

}


function _loadLogoSelector() {
    const checkboxLink = document.getElementById(`enable-link-logo`);
    const checkboxUpload = document.getElementById(`enable-upload-logo`);

    const linkLight = document.getElementById(`link-logo-light`);
    const uploadLight = document.getElementById(`upload-logo-light`);

    const linkDark = document.getElementById(`link-logo-dark`);
    const uploadDark = document.getElementById(`upload-logo-dark`);

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

