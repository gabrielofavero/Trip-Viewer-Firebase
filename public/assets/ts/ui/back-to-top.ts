// ======= Back to Top Button =======
//
// Shared behaviour for the floating arrow (`.back-to-top`) rendered by the
// index, view, destination and itinerary pages. The markup lives in each page's
// HTML; this only wires the scroll listener that reveals it.

import { onscroll, select } from '../utils/dom.js';

const ACTIVE_CLASS = 'active';
const VISIBLE_AFTER_SCROLL = 100; // px scrolled before the arrow appears

let initialized = false;

/**
 * Reveal the `.back-to-top` arrow once the page is scrolled past the threshold.
 * Call once at app startup — pages without the element are a no-op.
 */
export function initBackToTop() {
	if (initialized) return;
	initialized = true;

	const backToTop = select('.back-to-top');
	if (!backToTop) return;

	const toggleBackToTop = () => {
		if (window.scrollY > VISIBLE_AFTER_SCROLL) {
			backToTop.classList.add(ACTIVE_CLASS);
		} else {
			backToTop.classList.remove(ACTIVE_CLASS);
		}
	};

	window.addEventListener('load', toggleBackToTop);
	onscroll(document, toggleBackToTop);
	toggleBackToTop();
}
