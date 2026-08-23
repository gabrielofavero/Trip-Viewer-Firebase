// ======= Image Picker (edit-trip) — destination import provider =======
// Registers the trip page's "From destination" capability for the shared
// image picker (ui/image-picker.ts), tracks the wallpaper source so unlinking
// a destination keeps the wallpaper but marks it custom, and re-exports the
// picker entry points for the trip page.

import { getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { openToast } from '../../../utils/messages.js';
import { getDestinationRaw } from '../../../data/services/destination.service.js';
import { ACTIVE_DESTINATIONS, DESTINOS_DATA } from './destination.js';
import {
	refreshImagePickers,
	setImagePickerDestinationProvider,
} from '../../../ui/image-picker.js';
import type {
	DestinationImageOption,
	ImagePickerDestinationProvider,
} from '../../../ui/image-picker.js';

// Re-export the shared picker entry points for the trip page.
export { openImagePicker, refreshImagePickers } from '../../../ui/image-picker.js';

/** Local cache for this feature's destination fetches. */
const WALLPAPER_DEST_CACHE: Record<string, any> = {};

/**
 * Destination id the current wallpaper was imported from (null = custom).
 * Tracked in-session so unlinking that destination keeps the wallpaper but
 * marks it as a custom image.
 */
let WALLPAPER_SOURCE_DESTINATION: string | null = null;

/**
 * Fetch a destination document reusing any copy already in memory (smart
 * load): the shared caches used by database.getDestination and by the
 * itinerary inner dialog, plus this module's own cache.
 */
async function loadDestinationDocument(destId: string): Promise<any> {
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

const destinationProvider: ImagePickerDestinationProvider = {
	isAvailable() {
		return ACTIVE_DESTINATIONS.length > 0;
	},

	getCurrentDestinationId(): string | null {
		return WALLPAPER_SOURCE_DESTINATION;
	},

	async loadOptions(): Promise<DestinationImageOption[]> {
		const results = await Promise.allSettled(
			ACTIVE_DESTINATIONS.map((dest) => loadDestinationDocument(dest.destinationId)),
		);
		const options: DestinationImageOption[] = [];
		results.forEach((result, i) => {
			if (result.status !== 'fulfilled') return;
			const dest = ACTIVE_DESTINATIONS[i];
			const doc = result.value || {};
			const image = doc?.image && typeof doc.image === 'object' ? doc.image.background || '' : '';
			if (!image) return; // only destinations that actually have an image
			options.push({
				id: dest.destinationId,
				title: doc.title || dest.title || '',
				image,
			});
		});
		return options;
	},

	applyOption(option: DestinationImageOption) {
		// Remember the source so unlinking it later marks the wallpaper custom.
		WALLPAPER_SOURCE_DESTINATION = option.id;
		const input = getID('link-background') as HTMLInputElement | null;
		if (input) input.value = option.image;
		activateImagesModule();
		openToast(translate('labels.customization.images.imported_from', { name: option.title }));
	},

	getWallpaperSourceLabel(): string | null {
		const sourceId = WALLPAPER_SOURCE_DESTINATION;
		if (!sourceId) return null;
		const active = ACTIVE_DESTINATIONS.find((d) => d.destinationId === sourceId);
		if (active?.title) return active.title;
		const doc = ACTIVE_DESTINATIONS[sourceId] || DESTINOS_DATA[sourceId];
		return doc?.title || null;
	},

	onWallpaperCustomApplied() {
		WALLPAPER_SOURCE_DESTINATION = null;
	},
};

function activateImagesModule() {
	const imagesEnabled = getID('images-enabled') as HTMLInputElement | null;
	if (imagesEnabled && !imagesEnabled.checked) {
		imagesEnabled.checked = true;
		const content = getID('images-enabled-content');
		if (content) content.style.display = 'block';
	}
}

// Register the trip's destination-import provider (side effect of loading this
// module — edit-trip only).
setImagePickerDestinationProvider(destinationProvider);

// Re-render the cards whenever the linked-destination set changes during
// editing (e.g. the wallpaper source was unlinked and is now custom).
document.addEventListener('trip:activeDestinationsChanged', () => {
	refreshImagePickers();
});

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
