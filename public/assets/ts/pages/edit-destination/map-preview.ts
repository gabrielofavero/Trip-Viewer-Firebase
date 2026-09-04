import { getID } from '../../utils/dom.js';
import { buildMyMapsEmbed } from '../../ui/mymaps-embed.js';

const PREVIEW_ID = 'map-preview';
const INPUT_ID = 'map-link';
const VISIBLE_CLASS = 'visible';
const RENDER_DELAY_MS = 350;

let renderTimer: number | undefined;

/** Render the preview container from the current #map-link value. */
function renderPreview(): void {
	renderTimer = undefined;
	const container = getID(PREVIEW_ID);
	const input = getID(INPUT_ID);
	if (!container || !input) return;

	container.innerHTML = '';
	const iframe = buildMyMapsEmbed(input.value || '');
	if (iframe) {
		container.appendChild(iframe);
		container.classList.add(VISIBLE_CLASS);
	} else {
		container.classList.remove(VISIBLE_CLASS);
	}
}

/**
 * Refresh the live My Maps preview below the "My Maps Link" field.
 * Debounced so pasting/typing doesn't rebuild (and reload) the iframe on every
 * keystroke — the map only re-renders after the value settles.
 */
export function updateMapPreview(): void {
	if (renderTimer !== undefined) {
		window.clearTimeout(renderTimer);
	}
	renderTimer = window.setTimeout(renderPreview, RENDER_DELAY_MS);
}

/** Immediately clear the preview (e.g. when the Map module is disabled). */
export function clearMapPreview(): void {
	if (renderTimer !== undefined) {
		window.clearTimeout(renderTimer);
		renderTimer = undefined;
	}
	const container = getID(PREVIEW_ID);
	if (!container) return;
	container.innerHTML = '';
	container.classList.remove(VISIBLE_CLASS);
}

/**
 * Live map preview for the edit-destination "My Maps Link" field:
 *  - refreshes the embed as the user types / changes the link (input/change),
 *  - renders once at init. Existing destinations set the input value (and
 *    dispatch an `input` event) after this runs, which also lands here.
 */
export function initMapPreview(): void {
	const input = getID(INPUT_ID);
	if (!input) return;
	input.addEventListener('input', updateMapPreview);
	input.addEventListener('change', updateMapPreview);
	updateMapPreview();
}
