import { signOut } from "../../support/firebase/user.js";
import { on } from "../../support/pages/selectors.js";
import { closeModal, openModal } from "../../support/styles/modal.js";
import { closeNotification, goToCurrentTrip, manualListingLoad, manualTripLoad } from "../index.js";

export function loadIndexEventListeners() {
    on('click', '#notification-link', goToCurrentTrip);
    on('click', '.notification-close', closeNotification, true);
    on('click', '#carregar-novamente-proximasViagens', manualTripLoad);
    on('click', '#carregar-novamente-viagensAnteriores', manualTripLoad);
    on('click', '#carregar-novamente-destinos', manualTripLoad);
    on('click', '#carregar-novamente-listagens', manualListingLoad);
    on('click', '#settings-delete-account', openModal);
    on('click', '#settings-sign-out', signOut);
    on('click', '#cancel-action', closeModal);
    on('click', '#cancel', closeModal);
}