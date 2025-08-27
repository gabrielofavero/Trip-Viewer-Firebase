import { goHomeFromEditDocumentPage, reeditEditDocumentPage } from "../../../support/pages/navigation.js";
import { on } from "../../../support/pages/selectors.js";
import { deleteDestination } from "../editar-destino.js";

export function loadEditDestinationListeners() {
    on('click', '#back', goHomeFromEditDocumentPage)
    on('click', '#delete-destination', deleteDestination)
    on('click', '#re-editar', reeditEditDocumentPage)
}