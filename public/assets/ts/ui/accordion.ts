import { getCategoryLegJs, getID } from '../utils/dom.js';

// Accordion Open - Close
export function closeAccordions(category) {
	const childs = getCategoryLegJs(category);

	for (const i of childs) {
		const accordionID = `collapse-${category}-${i}`;

		if (getID(accordionID).classList.contains('show')) {
			$(`#${accordionID}`).collapse('hide');
		}
	}
}

export function openLastAccordion(category) {
	const childs = getCategoryLegJs(category);
	const lastChild = childs[childs.length - 1];
	const accordionID = `collapse-${category}-${lastChild}`;

	$(`#${accordionID}`).collapse('show');
}

export function areThereOpenedAccordions(category) {
	const childs = getCategoryLegJs(category);

	for (const i of childs) {
		const accordionID = `collapse-${category}-${i}`;

		if (getID(accordionID).classList.contains('show')) {
			return true;
		}
	}

	return false;
}

export function onAccordionAction(type, actions = []) {
	document.addEventListener(type, function (event) {
		const collapseElement = event.target;
		const headerButton = collapseElement.previousElementSibling.querySelector('.accordion-button');

		for (const action of actions) {
			action(collapseElement, headerButton);
		}
	});
}

export function onAccordionOpen(actions = []) {
	onAccordionAction('show.bs.collapse', actions);
}

export function onAccordionClose(actions = []) {
	onAccordionAction('hide.bs.collapse', actions);
}
