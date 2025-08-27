import { getID } from "../pages/selectors";
import { animateFadeIn, animateFadeOut } from "./animations";

export function openModal(modalID = 'modal') {
    animateFadeIn([modalID]);
}

export function closeModal(modalID = 'modal') {
    animateFadeOut([modalID], 'down');
}

export function isModalOpen(modalID = 'modal') {
    return getID(modalID).style.display === 'block';
}