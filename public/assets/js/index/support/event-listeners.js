import { signOut } from "../../support/firebase/user.js";
import { onClick } from "../../support/pages/selectors.js";
import { closeModal, openModal } from "../../support/styles/modal.js";
import { closeNotification, goToCurrentTrip, manualListingLoad, manualTripLoad } from "../index.js";

export function loadIndexEventListeners() {
    onClick('#notification-link', goToCurrentTrip);
    onClick('.notification-close', closeNotification, true);
    onClick('#carregar-novamente-proximasViagens', manualTripLoad);
    onClick('#carregar-novamente-viagensAnteriores', manualTripLoad);
    onClick('#carregar-novamente-destinos', manualTripLoad);
    onClick('#carregar-novamente-listagens', manualListingLoad);
    onClick('#settings-delete-account', openModal);
    onClick('#settings-sign-out', signOut);
    onClick('#cancel-action', closeModal);
    onClick('#cancel', closeModal);
}