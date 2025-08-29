import { goHomeFromEditDocumentPage, reeditEditDocumentPage } from "../../../support/pages/navigation"
import { on, onClick } from "../../../support/pages/selectors"
import { deleteListing } from "../editar-listagem"

export function loadEditListingListeners() {
    onClick('#back', goHomeFromEditDocumentPage)
    onClick('#delete-listing', deleteListing)
    onClick('#re-editar', reeditEditDocumentPage)
}