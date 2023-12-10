function _validateRequiredInputs() {
    var inputs = document.querySelectorAll('input[required]');
    var invalidFields = [];

    inputs.forEach(function (input) {
        if (input.value.trim() === '') {
            invalidFields.push(input.id);
        }
    });

    if (invalidFields.length > 0) {
        const text = _getInvalidInputsText(invalidFields);
        document.getElementById('modal-inner-text').innerHTML = text;
        _openModal();
    }
}

function _getInvalidInputsText(invalidFields) {
    const dadosBasicos = ['titulo', 'moeda'];

    let text = 'Os seguintes campos obrigatórios não foram preenchidos:<br><br>'
    let title = 'Dados Básicos'
    text += `<strong>${title}:</strong><br><ul>`;

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
            
            for (let i = 1; i < idSplit.length; i++) {
                innerText += _firstCharToUpperCase(idSplit[i]) + " ";
            }

            innerText = innerText.trim();
        }

        if (title == innerTitle || dadosBasicos.includes(id)) {
            text += `
            <li>
                ${innerText}
            </li>`
        } else {
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