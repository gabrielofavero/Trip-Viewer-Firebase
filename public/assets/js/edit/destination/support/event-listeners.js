import { goHomeFromEditDocumentPage, reeditEditDocumentPage } from "../../../support/pages/navigation.js";
import { on, onClick } from "../../../support/pages/selectors.js";
import { deleteDestination } from "../editar-destino.js";

export function loadEditDestinationListeners() {
    onClick('#back', goHomeFromEditDocumentPage)
    onClick('#delete-destination', deleteDestination)
    onClick('#re-editar', reeditEditDocumentPage)
}