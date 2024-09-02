function _initializeSortableForGroup(groupName, handleSelector = '.drag-icon') {
    function _initializeSortable(groupName) {
        const containers = document.querySelectorAll(`.draggable-area[data-group="${groupName}"]`);

        containers.forEach(container => {
            if (!container.sortableInstance) {
                container.sortableInstance = new Sortable(container, {
                    handle: handleSelector,
                    group: groupName,
                    animation: 150,
                    onEnd: function(evt) {
                        console.log(`Moved item from index ${evt.oldIndex} to ${evt.newIndex} in group ${groupName}`);
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
