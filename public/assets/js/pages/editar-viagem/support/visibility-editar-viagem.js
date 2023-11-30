function _loadEditModule(type) {
    const habilitado = document.getElementById(`habilitado-${type}`);
    if (habilitado.checked) {
        _showContent(type);
    } else {
        _hideContent(type);
    }
    _loadListener(type);
}

function _loadListener(type) {
    const habilitado = document.getElementById(`habilitado-${type}`);
    habilitado.addEventListener('change', function () {
        if (habilitado.checked) {
            _showContent(type);
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