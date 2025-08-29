export function initializeSortableForGroup(groupName, properties) {
    function initializeSortable(groupName) {
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
                    onStart: function (evt) {
                        if (onStartFunc) {
                            onStartFunc(evt);
                        }
                    },
                    onEnd: function (evt) {
                        if (onEndFunc) {
                            onEndFunc(evt);
                        }
                    }
                });
            }
        });
    }

    initializeSortable(groupName);

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('draggable-area')) {
                    if (node.dataset.group === groupName) {
                        initializeSortable(groupName);
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
