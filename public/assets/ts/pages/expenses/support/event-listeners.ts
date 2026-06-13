import { registerActions } from '../../../ui/actions.js';
import { openAttributions } from '../../../utils/attributions.js';

export function loadExpensesListeners() {
    registerActions({
        "open-attributions": () => openAttributions(),
    });
}
