export function loadEditModuleVisibility(categoria) {
    const habilitado = getID(`habilitado-${categoria}`);
    if (habilitado.checked) {
        showContent(categoria);
        if (!getID(`habilitado-${categoria}-content`).innerText) {
            _add(firstCharToUpperCase(categoria).trim())
        }
    } else {
        hideContent(categoria);
    }
    loadListener(categoria);
}

function loadListener(categoria) {
    const habilitado = getID(`habilitado-${categoria}`);
    habilitado.addEventListener('change', function () {
        if (habilitado.checked) {
            showContent(categoria);
            const box = getID(`${categoria}-box`);
            const habilitadoContent = getID(`habilitado-${categoria}-content`);

            if ((box && !box.innerText) || (habilitadoContent && !habilitadoContent.innerText)) {
                _add(firstCharToUpperCase(categoria).trim())
            }

        } else {
            removeEmptyChild(categoria);
            hideContent(categoria);
        }
    });
}

function showContent(type) {
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

function hideContent(type) {
    const habilitadoContent = getID(`habilitado-${type}-content`);
    habilitadoContent.style.display = 'none';

    const adicionarBox = getID(`${type}-adicionar-box`);
    if (adicionarBox) {
        adicionarBox.style.display = 'none';
    }
}

export function loadEditModuleRemoveListener(categoria, j, customFunction = null) {
    getID(`remove-${categoria}-${j}`).addEventListener('click', function () {
        removeChildWithValidation(categoria, j);
        if (customFunction) {
            eval(customFunction);
        }
    });
}

export function removeChildWithValidation(categoria, j) {
    removeChild(`${categoria}-${j}`);
    hideParentIfNoChildren(categoria);
}

function hideParentIfNoChildren(categoria) {
    if (getChildIDs(`${categoria}-box`).length === 0) {
        getID(`habilitado-${categoria}`).checked = false;
        hideContent(categoria);
    }
}