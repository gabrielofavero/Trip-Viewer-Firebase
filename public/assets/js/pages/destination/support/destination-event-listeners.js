import { getID, onClick } from "../../support/pages/selectors.js";

export function loadDestinationListeners() {
    const closeButton = getID("closeButton");
    if (window.parent._closeLightbox) {
        onClick('#closeButton', () => {
            _unloadMedias();
            window.parent._closeLightbox();
        });
    } else {
        closeButton.style.display = "none";
    }

    onClick("#logo-link", () => {
        if (window.parent._closeLightbox) {
            window.parent._closeLightbox(true);
        } else {
            window.location.href = "index.html";
        }
    });
}