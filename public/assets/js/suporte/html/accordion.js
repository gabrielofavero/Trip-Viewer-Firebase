// Accordion Open - Close
function _closeAccordions(categoria) {
	const childs = _getChildIDs(`${categoria}-box`);

	for (const child of childs) {
		const i = child.split("-").pop();
		const accordionID = `collapse-${categoria}-${i}`;

		if (getID(accordionID).classList.contains("show")) {
			$(`#${accordionID}`).collapse("hide");
		}
	}
}

function _openLastAccordion(categoria) {
	const childs = _getChildIDs(`${categoria}-box`);
	const lastChild = childs[childs.length - 1];
	const i = lastChild.split("-").pop();
	const accordionID = `collapse-${categoria}-${i}`;

	$(`#${accordionID}`).collapse("show");
}

function _areThereOpenedAccordions(categoria) {
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

function _onAccordionAction(type, actions = []) {
	document.addEventListener(type, function (event) {
		const collapseElement = event.target;
		const headerButton =
			collapseElement.previousElementSibling.querySelector(".accordion-button");

		for (const action of actions) {
			action(collapseElement, headerButton);
		}
	});
}

function _onAccordionOpen(actions = []) {
	_onAccordionAction("show.bs.collapse", actions);
}

function _onAccordionClose(actions = []) {
	_onAccordionAction("hide.bs.collapse", actions);
}
