function _validateRequiredFields() {
    var invalidFields = [];

    var inputs = document.querySelectorAll('input[required]');
    var selects = document.querySelectorAll('select[required]');
    var fields = Array.from(inputs).concat(Array.from(selects));

    fields.forEach(function (field) {
        if (field.value.trim() === '') {
            invalidFields.push(field.id);
        }
    });

    if (invalidFields.length > 0) {
        wasSaved = false;
        document.getElementById('modal-inner-text').innerHTML = _getInvalidFieldsText(invalidFields);
        _openModal();
        _stopLoadingScreen();
    }
}

function _getInvalidFieldsText(invalidFields) {
    const dadosBasicos = ['titulo', 'moeda'];

    let text = 'Os seguintes campos obrigatórios não foram preenchidos:<br><br>'
    let title = '';

    if (dadosBasicos.includes(invalidFields[0])) {
        title = 'Dados Básicos'
        text += `<strong>${title}:</strong><br><ul>`
    }

    for (const id of invalidFields) {
        const label = document.getElementById(id + '-label');
        const idSplit = id.split('-');

        let innerTitle = title;
        let innerText = "";

        if (label && label.innerText) {
            const lastChar = id[id.length - 1];

            innerTitle = _firstCharToUpperCase(idSplit[0]);
            innerText = label.innerText;

            if (!isNaN(lastChar)) {
                let position = idSplit[idSplit.length - 1];
                const typeTitle = document.getElementById(`${innerTitle}-title-${position}`);
                if (typeTitle && typeTitle.innerText) {
                    innerTitle = typeTitle.innerText;
                }
            }
        } else {
            innerTitle = _firstCharToUpperCase(idSplit[0])
            innerText = _getInnerText(idSplit);
        }

        if (title == innerTitle || dadosBasicos.includes(id)) {
            text += `
            <li>
                ${innerText || innerTitle}
            </li>`
        } else {
            
            if (innerTitle == 'Select') {
                innerTitle = innerText.replace(/[0-9]/g, '').trim();
            }

            title = innerTitle
            text += `
            </ul><br>
            <strong>${title}:</strong><br>
            <ul>
                <li>
                    ${innerText}
                </li>`
        }


    }
    return text + '</ul>';
}

function _reEdit(id, type, wasSaved = true) {
    let param;
    let url;

    if (type == 'viagens') {
        param = 'v';
        url = 'editar-viagem.html';
    } else if (type == 'destinos') {
        param = 'p';
        url = 'editar-destino.html';
    }


    if (param && id && wasSaved) {
        window.location.href = `${url}?${param}=${id}`;
    } else if (!wasSaved) {
        _closeModal();
    } else {
        window.location.href = 'index.html';
    }
}

function _getInnerText(idSplit) {
    let innerText = '';
    for (let i = 1; i < idSplit.length; i++) {
        innerText += _firstCharToUpperCase(idSplit[i]) + " ";
    }
    return innerText.trim();
}

function _getInnerTextNoNumbers(innerText) {
    return ;
}