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