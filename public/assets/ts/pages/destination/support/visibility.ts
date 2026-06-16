import { loadVisibility } from '../../../theme/visibility.js';
import { loadEmbedVisibility } from '../../../ui/embed.js';
import { getID } from '../../../utils/dom.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { getDescriptionValue } from '../../../models/destination.model.js';
import { THEME_COLOR } from "../../../theme/theme.js";
import { adjustEditVisibility } from "../edit-destination.js";
import { unloadMedias, MEDIA_HYPERLINKS } from "./media-embed.js";

export async function loadDestinationVisibility() {
	loadVisibility();
	loadEmbedVisibility({ closeAction() { unloadMedias(undefined); } });
	await adjustEditVisibility();
}

function adjustButtonsPositionDestinations() {
	const first = "10px";
	const second = "50px";

	const nightMode = getID("night-mode");
	const closeButton = getID("closeButton");

	closeButton.style.right = first;
	nightMode.style.right = second;
}

export function applyDestinationsMediaHeight() {
	const keys = Object.keys(MEDIA_HYPERLINKS);
	const firstDiv = getID("destinations-1");
	if (keys.length > 0 && firstDiv) {
		const width = firstDiv.offsetWidth - 40; // 20px padding em cada lado

		const heightPortrait = (width * 16) / 9;
		const heightLandscape = (width * 9) / 16;

		setCSSRule(".youtube-embed", "height", `${heightLandscape}px`);

		if (getID("content").offsetWidth <= 550) {
			setCSSRule(".tiktok-embed-v3", "height", `${heightPortrait}px`);
		} else {
			setCSSRule(".tiktok-embed-v3", "height", `533px`);
		}
	}
}

export function applyAccordionArrowCustomColor() {
	const color = THEME_COLOR.replace("#", "%23");
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${color}'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>`;
	setCSSRule(
		".accordion-button::after",
		"background-image",
		`url("data:image/svg+xml,${svg}") !important`,
	);
}

export function getDestinationsTitleVisibility(item) {
	if (item.rating || item.map || item.website || item.instagram) return "flex";
	else return "none";
}

export function getLinksContainerVisibility(item) {
	if (item.map || item.website || item.instagram) return "flex";
	else return "none";
}

function getStageRegionVisibility(item) {
	return item.region ? "block" : "none";
}

export function getPriceVisibility(item) {
	return item.price ? "block" : "none";
}

export function getDescriptionVisibility(item) {
	return getDescriptionValue(item) ? "block" : "none";
}

export function getSystemWidth() {
	return window.innerWidth || document.documentElement.clientWidth;
}

export function openDestinationsAccordion(id) {
	const num = String(id).match(/\d+$/)?.[0];
	if (!num) return false;

	const target = document.getElementById(`collapse-destinations-${num}`);
	if (!target) return false;

	for (const el of getID("content").children) {
		const id = el.id;
		if (isDestinationsAccordionOpen(id)) {
			closeDestinationsAccordion(id);
		}
	}

	const acc = bootstrap.Collapse.getOrCreateInstance(target, { toggle: false });
	acc.show();

	return true;
}

function closeDestinationsAccordion(id) {
	const num = String(id).match(/\d+$/)?.[0];
	if (!num) return false;

	const target = document.getElementById(`collapse-destinations-${num}`);
	if (!target) return false;

	const acc = bootstrap.Collapse.getOrCreateInstance(target, { toggle: false });
	acc.hide();

	return true;
}

function isDestinationsAccordionOpen(id) {
	const num = String(id).match(/\d+$/)?.[0];
	if (!num) return false;

	const target = document.getElementById(`collapse-destinations-${num}`);
	if (!target) return false;

	return target.classList.contains("show");
}
