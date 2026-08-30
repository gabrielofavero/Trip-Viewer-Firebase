import { translate } from '../i18n/translation.js';

const OPEN_LINK_LABEL = 'labels.open_link';
const BTN_CLASS = 'url-open-btn';
const VISIBLE_CLASS = 'visible';
const ENHANCED_ATTR = 'data-url-open-enhanced';
const BTN_INSET_RIGHT = 6; // px gap between the button and the input's right edge
const INPUT_RIGHT_PADDING = 46; // px reserved inside the input while the button is visible

interface UrlOpenLinkEntry {
	group: HTMLElement;
	input: HTMLInputElement;
	btn: HTMLAnchorElement;
}

const entries: UrlOpenLinkEntry[] = [];
const entryByTarget = new WeakMap<Element, UrlOpenLinkEntry>();

let initialized = false;
let scanScheduled = false;
let intersectionObserver: IntersectionObserver | null = null;

/**
 * Resolve a raw input value into an absolute http(s) URL, or null when the
 * value is empty / not a usable link. Scheme-less values (e.g. "example.com")
 * are accepted and normalized to https://.
 */
function resolveUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed || trimmed.includes(' ')) return null;
	try {
		const url = new URL(trimmed);
		if (url.protocol === 'http:' || url.protocol === 'https:') {
			return url.href;
		}
		return null;
	} catch {
		/* fall through to the scheme-less attempt */
	}
	try {
		const url = new URL(`https://${trimmed}`);
		if (url.hostname.includes('.') || url.hostname === 'localhost') {
			return url.href;
		}
	} catch {
		/* not a link */
	}
	return null;
}

function createOpenButton(): HTMLAnchorElement {
	const btn = document.createElement('a');
	btn.className = BTN_CLASS;
	btn.target = '_blank';
	btn.rel = 'noopener noreferrer';
	btn.setAttribute('role', 'button');
	const label = translate(OPEN_LINK_LABEL);
	btn.setAttribute('aria-label', label);
	btn.title = label;
	btn.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
		'<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
		'<polyline points="15 3 21 3 21 9"/>' +
		'<line x1="10" y1="14" x2="21" y2="3"/>' +
		'</svg>';
	return btn;
}

/** Align the button over the input's right edge, vertically centered on it. */
function positionEntry(entry: UrlOpenLinkEntry): void {
	const { group, input, btn } = entry;
	const groupRect = group.getBoundingClientRect();
	const inputRect = input.getBoundingClientRect();
	const width = btn.offsetWidth;
	const height = btn.offsetHeight;
	btn.style.left = `${inputRect.right - groupRect.left - width - BTN_INSET_RIGHT}px`;
	btn.style.top = `${inputRect.top - groupRect.top + (inputRect.height - height) / 2}px`;
}

/** Toggle the button and the input's right padding based on the field value. */
function updateEntry(entry: UrlOpenLinkEntry): void {
	const { input, btn } = entry;
	const url = resolveUrl(input.value);
	if (url) {
		btn.href = url;
		btn.classList.add(VISIBLE_CLASS);
		input.style.paddingRight = `${INPUT_RIGHT_PADDING}px`;
	} else {
		btn.removeAttribute('href');
		btn.classList.remove(VISIBLE_CLASS);
		input.style.paddingRight = '';
	}
	positionEntry(entry);
}

function enhanceInput(input: HTMLInputElement): void {
	if (input.getAttribute(ENHANCED_ATTR) === '1') return;
	const group = input.closest<HTMLElement>('.nice-form-group');
	if (!group) return;

	input.setAttribute(ENHANCED_ATTR, '1');
	group.style.position = 'relative';

	const btn = createOpenButton();
	group.appendChild(btn);

	const entry: UrlOpenLinkEntry = { group, input, btn };
	entries.push(entry);
	entryByTarget.set(btn, entry);
	intersectionObserver?.observe(btn);

	input.addEventListener('input', () => updateEntry(entry));
	input.addEventListener('change', () => updateEntry(entry));

	updateEntry(entry);
}

function scan(): void {
	const inputs = document.querySelectorAll<HTMLInputElement>('.nice-form-group input[type="url"]');
	inputs.forEach((input) => enhanceInput(input));
}

function scheduleScan(): void {
	if (scanScheduled) return;
	scanScheduled = true;
	requestAnimationFrame(() => {
		scanScheduled = false;
		scan();
	});
}

function ensureIntersectionObserver(): IntersectionObserver | null {
	if (intersectionObserver) return intersectionObserver;
	if (typeof IntersectionObserver === 'undefined') return null;
	intersectionObserver = new IntersectionObserver(
		(items) => {
			items.forEach((item) => {
				if (item.isIntersecting) {
					const entry = entryByTarget.get(item.target);
					if (entry) positionEntry(entry);
				}
			});
		},
		{ threshold: 0 },
	);
	return intersectionObserver;
}

/**
 * Adds an "open in new tab" helper button to every url input that lives inside
 * a .nice-form-group (the edit forms). The button only appears once the field
 * holds a usable link, sits on the right edge of the input, and opens that
 * link in a new tab. Dynamically added inputs are picked up through a
 * MutationObserver, so it covers inputs rendered later (new trip/destination
 * items, image pickers, Places import, etc.).
 */
export function initUrlInputOpenLink(): void {
	if (initialized) return;
	initialized = true;

	ensureIntersectionObserver();
	scan();

	const observer = new MutationObserver(scheduleScan);
	observer.observe(document.body, { childList: true, subtree: true });

	const reposition = () => entries.forEach(positionEntry);
	window.addEventListener('resize', reposition);
	window.addEventListener('load', reposition);
	if (document.fonts?.ready) {
		document.fonts.ready.then(reposition);
	}
}
