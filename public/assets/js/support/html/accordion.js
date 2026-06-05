import { _getChildIDs } from "../pages/data.js";

// Accordion Open - Close
export function _closeAccordions(categoria) {
	const childs = _getChildIDs(`${categoria}-box`);

	for (const child of childs) {
		const i = child.split("-").pop();
		const accordionID = `collapse-${categoria}-${i}`;

		if (getID(accordionID).classList.contains("show")) {
			$(`#${accordionID}`).collapse("hide");
		}
	}
}

export function _openLastAccordion(categoria) {
	const childs = _getChildIDs(`${categoria}-box`);
	const lastChild = childs[childs.length - 1];
	const i = lastChild.split("-").pop();
	const accordionID = `collapse-${categoria}-${i}`;

	$(`#${accordionID}`).collapse("show");
}

export function _areThereOpenedAccordions(categoria) {
	const childs = _getChildIDs(`${categoria}-box`);

	for (const child of childs) {
		const i = child.split("-").pop();
		const accordionID = `collapse-${categoria}-${i}`;

		if (getID(accordionID).classList.contains("show")) {
			return true;
		}
	}

	return false;
}

export function _onAccordionAction(type, actions = []) {
	document.addEventListener(type, function (event) {
		const collapseElement = event.target;
		const headerButton =
			collapseElement.previousElementSibling.querySelector(".accordion-button");

		for (const action of actions) {
			action(collapseElement, headerButton);
		}
	});
}

export function _onAccordionOpen(actions = []) {
	_onAccordionAction("show.bs.collapse", actions);
}

export function _onAccordionClose(actions = []) {
	_onAccordionAction("hide.bs.collapse", actions);
}

// BACKWARD COMPAT: attach to window during migration
window._closeAccordions = _closeAccordions;
window._openLastAccordion = _openLastAccordion;
window._areThereOpenedAccordions = _areThereOpenedAccordions;
window._onAccordionAction = _onAccordionAction;
window._onAccordionOpen = _onAccordionOpen;
window._onAccordionClose = _onAccordionClose;
