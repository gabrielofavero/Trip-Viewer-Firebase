import { onAccordionOpen, onAccordionClose, areThereOpenedAccordions } from './accordion.js';

let SORTABLE_SKIP_NEXT_ACTION = false;

export function initializeSortableForGroup(groupName, properties?) {
	function initializeSortable(groupName) {
		const containers = document.querySelectorAll(`.draggable-area[data-group="${groupName}"]`);
		const handleSelector = properties?.handleSelector || '.drag-icon';
		const onStartFunc = properties?.onStart;
		const onEndFunc = properties?.onEnd;

		containers.forEach((container) => {
			const el = container as HTMLElement & { sortableInstance?: any };
			if (!el.sortableInstance) {
				el.sortableInstance = new Sortable(el, {
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
					},
				});
			}
		});
	}

	initializeSortable(groupName);

	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				const el = node as HTMLElement;
				if (node.nodeType === 1 && el.classList.contains('draggable-area')) {
					if (el.dataset.group === groupName) {
						initializeSortable(groupName);
					}
				}
			});
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return observer; // Return the observer instance in case you want to disconnect it later (observer.disconnect())
}

export function loadDraggablesWithAccordions(items = []) {
	for (const item of items) {
		initializeSortableForGroup(item);
	}

	onAccordionOpen([hideDragIcon]);
	onAccordionClose([showDragIcon]);

	function changeDragIconVisibility(collapseElement, headerButton, toShow) {
		const type = headerButton.id.split('-')[0];

		if (!items.includes(type)) {
			return;
		}

		if (!toShow && areThereOpenedAccordions(type)) {
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
				dragIcon.classList.toggle('drag-icon-hidden', !toShow);
			}
		}
	}

	function showDragIcon(collapseElement, headerButton) {
		changeDragIconVisibility(collapseElement, headerButton, true);
	}

	function hideDragIcon(collapseElement, headerButton) {
		changeDragIconVisibility(collapseElement, headerButton, false);
	}
}
