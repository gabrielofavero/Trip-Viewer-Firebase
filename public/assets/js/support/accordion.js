let dragSrcEl = null;

// Drag and Drop

function _handleDragStart(e) {
    this.style.opacity = '0.5';
    dragSrcEl = this;
}

function _handleDragOver(e) {
    e.preventDefault();
}

function _handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl !== this) {
        const dragSrcIndex = Array.from(dragSrcEl.parentNode.children).indexOf(dragSrcEl);
        const targetIndex = Array.from(this.parentNode.children).indexOf(this);

        if (dragSrcIndex < targetIndex) {
            this.parentNode.insertBefore(dragSrcEl, this.nextSibling);
        } else {
            this.parentNode.insertBefore(dragSrcEl, this);
        }
    }
    return false;
}

function _handleDragEnd(e) {
    this.style.opacity = '1';
}

function _addDragListeners(classType) {
    const items = _getDragQuerySelector(classType, ':not([data-drag-listener])');
    items.forEach(function (item) {
        item.setAttribute('data-drag-listener', 'true');
        item.addEventListener('dragstart', _handleDragStart, false);
        item.addEventListener('dragover', _handleDragOver, false);
        item.addEventListener('drop', _handleDrop, false);
        item.addEventListener('dragend', _handleDragEnd, false);
    });
}

function _removeDragListeners(classType) {
    const items = _getDragQuerySelector(classType, '[data-drag-listener="true"]');
    items.forEach(function (item) {
        item.removeAttribute('data-drag-listener');
        item.removeEventListener('dragstart', _handleDragStart, false);
        item.removeEventListener('dragover', _handleDragOver, false);
        item.removeEventListener('drop', _handleDrop, false);
        item.removeEventListener('dragend', _handleDragEnd, false);
    });
}

function _getDragQuerySelector(classType, properties) {
    const extraClass = classType ? `.accordion-${classType}` : '';
    const selector = `.accordion-item${extraClass}${properties}`;
    return document.querySelectorAll(selector);
}

// Listeners
function _applyAccordionListeners(i, type) {
    const nome = getID(`${type}-nome-${i}`);
    nome.addEventListener('change', function () {
        _accordionOnChange(i, type);
    });

    const emoji = getID(`${type}-emoji-${i}`);
    if (emoji) {
        emoji.addEventListener('change', function () {
            _accordionOnChange(i, type);
        });
    }
}

function _accordionOnChange(i, type) {
    const titleDiv = getID(`${type}-title-${i}`);
    const nomeDiv = getID(`${type}-nome-${i}`);
    const emojiDiv = getID(`${type}-emoji-${i}`);

    const nome = nomeDiv.value;
    const emojiUntreated = emojiDiv ? emojiDiv.value : "";
    const emojiTreated = emojiDiv ? emojiUntreated.replace(/[a-zA-Z0-9\s!-\/:-@\[-`{-~]/g, '') : "";

    if (emojiTreated && nome) {
        titleDiv.innerText = `${nome} ${emojiTreated}`
    } else if (nome) {
        titleDiv.innerText = nome;
    }

    if (emojiTreated && emojiUntreated && emojiTreated !== emojiUntreated) {
        emojiDiv.value = emojiTreated;
    } else if (!emojiTreated && emojiUntreated) {
        emojiDiv.value = '';
        emojiDiv.placeholder = "Insira um Emoji Válido 🫠";
    }
}