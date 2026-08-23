// ======= Wallpaper Import from Destination =======
// Lets the user reuse a linked destination's background image as the trip
// wallpaper. Destinations are loaded lazily (only when the import dialog is
// opened), reusing any destination document already in memory elsewhere in
// the session (smart load). If the user changes which destinations are
// linked during editing, the button and the dialog adapt.

import { cloneObject, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../../../utils/messages.js';
import { getDestinationRaw } from '../../../data/services/destination.service.js';
import { ACTIVE_DESTINATIONS, DESTINOS_DATA } from './destination.js';

/** Local cache for this feature's destination fetches. */
const WALLPAPER_DEST_CACHE: Record<string, any> = {};

/**
 * Destination id the current wallpaper was imported from (null = custom).
 * Tracked in-session so unlinking that destination keeps the wallpaper but
 * marks it as a custom image.
 */
let WALLPAPER_SOURCE_DESTINATION: string | null = null;

/**
 * Keep the "import from destination" button in sync with the destinations
 * currently linked to the trip. Hidden when nothing is linked.
 */
export function refreshWallpaperDestinationOption() {
	const button = getID('import-wallpaper-from-destination');
	if (!button) return;
	button.style.display = ACTIVE_DESTINATIONS.length > 0 ? '' : 'none';
}

// Re-evaluate whenever the linked-destination set changes during editing.
document.addEventListener('trip:activeDestinationsChanged', refreshWallpaperDestinationOption);

/**
 * Open the destination import dialog. The linked destination documents are
 * fetched only now (lazy), showing a preview of each destination that has a
 * background image. Clicking one applies it as the trip wallpaper.
 */
export function openWallpaperDestinationImport() {
	if (!getID('import-wallpaper-from-destination')) return; // trip page only
	if (ACTIVE_DESTINATIONS.length === 0) return;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('labels.customization.images.import_from_destination');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = `
		<div class="wallpaper-import-loading" id="wallpaper-import-loading">
			<div class="wallpaper-import-spinner"></div>
			<span>${translate('labels.customization.images.import_loading')}</span>
		</div>
		<div class="wallpaper-import-list" id="wallpaper-import-list" style="display: none;"></div>
	`;
	properties.buttons = [
		{
			type: 'cancel',
		},
	];

	displayFullMessage(properties);
	void loadWallpaperImportOptions();
}

async function loadWallpaperImportOptions() {
	const list = getID('wallpaper-import-list');
	const loading = getID('wallpaper-import-loading');
	if (!list || !loading) return;

	const results = await Promise.allSettled(
		ACTIVE_DESTINATIONS.map((dest) => loadWallpaperDestination(dest.destinationId)),
	);

	const importable: { id: string; title: string; image: string }[] = [];
	results.forEach((result, i) => {
		if (result.status !== 'fulfilled') return;
		const dest = ACTIVE_DESTINATIONS[i];
		const doc = result.value || {};
		const image = doc?.image && typeof doc.image === 'object' ? doc.image.background || '' : '';
		if (!image) return; // only destinations that actually have an image
		importable.push({
			id: dest.destinationId,
			title: doc.title || dest.title || '',
			image,
		});
	});

	loading.style.display = 'none';
	list.style.display = 'grid';

	if (importable.length === 0) {
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'labels.customization.images.no_destination_image',
		)}</div>`;
		return;
	}

	list.innerHTML = importable
		.map(
			(entry) => `
			<button type="button" class="wallpaper-import-card" data-destination-id="${entry.id}">
				<div class="wallpaper-import-thumb" style="background-image: url('${entry.image}')"></div>
				<div class="wallpaper-import-name">${entry.title}</div>
			</button>`,
		)
		.join('');

	list.addEventListener('click', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('.wallpaper-import-card');
		if (!card) return;
		const destinationId = card.getAttribute('data-destination-id') || '';
		const title = card.querySelector('.wallpaper-import-name')?.textContent?.trim() || '';
		applyWallpaperFromDestination(destinationId, title);
	});
}

/**
 * Fetch a destination document reusing any copy already in memory (smart
 * load): the shared caches used by database.getDestination and by the
 * itinerary inner dialog, plus this module's own cache.
 */
async function loadWallpaperDestination(destId: string): Promise<any> {
	if (WALLPAPER_DEST_CACHE[destId]) return WALLPAPER_DEST_CACHE[destId];
	if (ACTIVE_DESTINATIONS[destId]) return ACTIVE_DESTINATIONS[destId];
	if (DESTINOS_DATA[destId]) return DESTINOS_DATA[destId];

	const doc = await getDestinationRaw(destId);
	if (doc) {
		WALLPAPER_DEST_CACHE[destId] = doc;
		// Seed the shared caches so other features reuse this fetch too.
		ACTIVE_DESTINATIONS[destId] = doc;
		DESTINOS_DATA[destId] = doc;
	}
	return doc;
}

function applyWallpaperFromDestination(destinationId: string, title: string) {
	const doc = ACTIVE_DESTINATIONS[destinationId];
	const image = doc?.image && typeof doc.image === 'object' ? doc.image.background || '' : '';
	if (!image) return;

	// Remember the source so unlinking it later can mark the wallpaper custom.
	WALLPAPER_SOURCE_DESTINATION = destinationId;

	const linkInput = getID('link-background');
	if (linkInput) linkInput.value = image;

	// Activate the custom images module so the imported wallpaper is visible.
	const imagesEnabled = getID('images-enabled') as HTMLInputElement | null;
	if (imagesEnabled && !imagesEnabled.checked) {
		imagesEnabled.checked = true;
		const content = getID('images-enabled-content');
		if (content) content.style.display = 'block';
	}

	// Present the imported URL through the "Link" source so it is kept/shown.
	forceBackgroundLinkMode();

	closeMessage();
	openToast(translate('labels.customization.images.imported_from', { name: title }));
}

/** Mirrors storage.loadImageSelector's "link" branch for the background. */
function forceBackgroundLinkMode() {
	const checkboxLink = getID('enable-link-background') as HTMLInputElement | null;
	const link = getID('link-background');
	const upload = getID('upload-background');
	const sizeMsg = getID('upload-background-size-message');

	if (checkboxLink) checkboxLink.checked = true;
	if (link) link.style.display = 'block';
	if (upload) upload.style.display = 'none';
	if (sizeMsg) sizeMsg.style.display = 'none';
}

/** Destination the current wallpaper was imported from (null if custom). */
export function getWallpaperSourceDestination(): string | null {
	return WALLPAPER_SOURCE_DESTINATION;
}

/**
 * If `destId` is the wallpaper's source destination, keep the wallpaper (it is
 * already a plain URL) but treat it as a custom image. Returns true when it was
 * the source.
 */
export function handleWallpaperSourceUnlink(destId: string): boolean {
	if (WALLPAPER_SOURCE_DESTINATION === destId) {
		WALLPAPER_SOURCE_DESTINATION = null;
		return true;
	}
	return false;
}
