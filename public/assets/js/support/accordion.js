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

// Accordion Open - Close

function _closeAccordions(categoria) {
    const childs = _getChildIDs(`${categoria}-box`);
    
    for (const child of childs) {
        const i = child.split('-').pop();
        const accordionID = `collapse-${categoria}-${i}`;

        if (getID(accordionID).classList.contains('show')) {
            $(`#${accordionID}`).collapse('hide');
        }
    }
}

function _openLastAccordion(categoria) {
    const childs = _getChildIDs(`${categoria}-box`);
    const lastChild = childs[childs.length - 1];
    const i = lastChild.split('-').pop();
    const accordionID = `collapse-${categoria}-${i}`;

    $(`#${accordionID}`).collapse('show');
}