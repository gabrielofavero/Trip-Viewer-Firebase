let SORTABLE_SKIP_NEXT_ACTION = false;

function _initializeSortableForGroup(groupName, properties) {
    function _initializeSortable(groupName) {
        const containers = document.querySelectorAll(`.draggable-area[data-group="${groupName}"]`);
        const handleSelector = properties?.handleSelector || '.drag-icon';
        const onStartFunc = properties?.onStart;
        const onEndFunc = properties?.onEnd;

        containers.forEach(container => {
            if (!container.sortableInstance) {
                container.sortableInstance = new Sortable(container, {
                    handle: handleSelector,
                    group: groupName,
                    animation: 150,
                    onStart: function(evt) {
                        if (onStartFunc) {
                            onStartFunc(evt);
                        }
                    },
                    onEnd: function(evt) {
                        if (onEndFunc) {
                            onEndFunc(evt);
                        }
                    }
                });
            }
        });
    }

    _initializeSortable(groupName);

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('draggable-area')) {
                    if (node.dataset.group === groupName) {
                        _initializeSortable(groupName);
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return observer; // Return the observer instance in case you want to disconnect it later (observer.disconnect())
}

function _loadDraggablesWithAccordions(items = []) {
    for (const item of items) {
        _initializeSortableForGroup(item)
    }

    _onAccordionOpen([_hideDragIcon]);
    _onAccordionClose([_showDragIcon]);

    function _changeDragIconVisibility(collapseElement, headerButton, toShow) {
        const type = headerButton.id.split('-')[0];

        if (!items.includes(type)) {
            return;
        }

        if ((!toShow && _areThereOpenedAccordions(type))) {
            SORTABLE_SKIP_NEXT_ACTION = true;
            return;
        }

        if (SORTABLE_SKIP_NEXT_ACTION) {
            SORTABLE_SKIP_NEXT_ACTION = false;
            return;
        }

        const parent = document.querySelector(collapseElement.getAttribute('data-bs-parent'));
        if (!parent || parent.children.length == 0) {
            return;
        }

        for (const child of parent.children) {
            const dragIcon = child.querySelector('.drag-icon');
            if (dragIcon) {
                dragIcon.style.display = toShow ? 'block' : 'none';
            }
        }
    }

    function _showDragIcon(collapseElement, headerButton) {
        _changeDragIconVisibility(collapseElement, headerButton, true)
    }

    function _hideDragIcon(collapseElement, headerButton) {
        _changeDragIconVisibility(collapseElement, headerButton, false)
    }
  }