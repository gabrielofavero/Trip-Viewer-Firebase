import { goHomeFromEditDocumentPage, reeditEditDocumentPage } from "../../../support/pages/navigation"
import { on } from "../../../support/pages/selectors"
import { deleteListing } from "../editar-listagem"

export function loadEditListingListeners() {
    on('click', '#back', goHomeFromEditDocumentPage)
    on('click', '#delete-listing', deleteListing)
    on('click', '#re-editar', reeditEditDocumentPage)
}