import { getID, getChildIDs } from "../pages/selectors";

// Accordion Open - Close
export function closeAccordions(categoria) {
    const childs = getChildIDs(`${categoria}-box`);
    
    for (const child of childs) {
        const i = child.split('-').pop();
        const accordionID = `collapse-${categoria}-${i}`;

        if (getID(accordionID).classList.contains('show')) {
            $(`#${accordionID}`).collapse('hide');
        }
    }
}

export function openLastAccordion(categoria) {
    const childs = getChildIDs(`${categoria}-box`);
    const lastChild = childs[childs.length - 1];
    const i = lastChild.split('-').pop();
    const accordionID = `collapse-${categoria}-${i}`;

    $(`#${accordionID}`).collapse('show');
}