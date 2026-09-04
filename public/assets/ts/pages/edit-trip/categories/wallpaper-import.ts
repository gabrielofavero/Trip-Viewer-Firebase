// ======= Image Picker (edit-trip) — trip import provider =======
// Registers the trip page's "Trip" capability for the shared image picker
// (ui/image-picker.ts). It gathers every image already inside the trip —
// gallery photos, accommodation photos, destination covers and place photos —
// grouped by source so a wallpaper can be picked naturally. It also tracks
// where the wallpaper came from so unlinking that source keeps the wallpaper
// but marks it as a custom image, and re-exports the picker entry points for
// the trip page.

import { getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { openToast } from '../../../utils/messages.js';
import { getDestinationRaw } from '../../../data/services/destination.service.js';
import { ACTIVE_DESTINATIONS, DESTINOS_DATA } from './destination.js';
import { ACCOMMODATION_IMAGES } from './accommodation.js';
import { GALLERY_ITEMS } from './gallery.js';
import {
	refreshImagePickers,
	setImagePickerTripProvider,
} from '../../../ui/image-picker.js';
import type {
	ImagePickerTripProvider,
	TripImageGroup,
	TripImageOption,
	TripImageSubgroup,
} from '../../../ui/image-picker.js';

// Re-export the shared picker entry points for the trip page.
export { openImagePicker, refreshImagePickers } from '../../../ui/image-picker.js';

/** Local cache for this feature's destination fetches. */
const WALLPAPER_DEST_CACHE: Record<string, any> = {};

/** Destination category fields that may carry item photos. */
const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/**
 * Where the current wallpaper was imported from (null = custom). Tracked
 * in-session so unlinking the source keeps the wallpaper but marks it as a
 * custom image. `destinationId` is set when the source belongs to a linked
 * destination (cover or place photo).
 */
interface WallpaperSource {
	id: string;
	label: string;
	destinationId?: string;
}

let WALLPAPER_SOURCE: WallpaperSource | null = null;

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

/** The destination id an option belongs to, or undefined for non-destination options. */
function getSourceDestinationId(optionId: string): string | undefined {
	if (!optionId.startsWith('dest-')) return undefined;
	const rest = optionId.slice('dest-'.length);
	const dash = rest.indexOf('-');
	return dash === -1 ? rest : rest.slice(0, dash);
}

/** Gallery photos (staged state) as a flat group. */
function buildGalleryGroup(): TripImageGroup {
	const options: TripImageOption[] = [];
	GALLERY_ITEMS.forEach((item, i) => {
		const link = item.link?.trim() || '';
		if (!link) return;
		const title =
			item.title?.trim() ||
			item.description?.trim() ||
			translate('labels.customization.images.image_n', { n: options.length + 1 });
		options.push({
			id: `gallery-${i}`,
			title,
			image: link,
			sourceLabel: translate('labels.customization.images.group_gallery'),
		});
	});
	return {
		key: 'gallery',
		title: translate('labels.customization.images.group_gallery'),
		options,
	};
}

/** Accommodation photos (live DOM + ACCOMMODATION_IMAGES) grouped per stay. */
function buildAccommodationsGroup(): TripImageGroup {
	const subgroups: TripImageSubgroup[] = [];
	const childIDs = getChildIDs('accommodations-box');
	if (!childIDs) {
		return {
			key: 'accommodations',
			title: translate('labels.customization.images.group_accommodations'),
			subgroups,
		};
	}
	childIDs.forEach((childId) => {
		const j = getJ(childId);
		const name =
			(getID(`accommodations-name-${j}`) as HTMLInputElement | null)?.value?.trim() ||
			translate('labels.customization.images.accommodation');
		const images = (ACCOMMODATION_IMAGES[j] || []).filter((img) => img?.link?.trim());
		if (!images.length) return;
		subgroups.push({
			title: name,
			options: images.map((img, k) => ({
				id: `acc-${j}-${k}`,
				title:
					img?.description?.trim() ||
					translate('labels.customization.images.photo_n', { n: k + 1 }),
				image: img.link,
				sourceLabel: name,
			})),
		});
	});
	return {
		key: 'accommodations',
		title: translate('labels.customization.images.group_accommodations'),
		subgroups,
	};
}

/** Destination covers + place photos, grouped per destination. */
async function buildDestinationsGroup(): Promise<TripImageGroup> {
	const subgroups: TripImageSubgroup[] = [];
	const results = await Promise.allSettled(
		ACTIVE_DESTINATIONS.map((dest) => loadDestinationDocument(dest.destinationId)),
	);
	results.forEach((result, i) => {
		if (result.status !== 'fulfilled') return;
		const dest = ACTIVE_DESTINATIONS[i];
		const doc = result.value || {};
		const destTitle = doc.title || dest.title || '';
		const options: TripImageOption[] = [];

		// Destination cover (hero) image.
		const hero = doc?.image && typeof doc.image === 'object' ? doc.image.background || '' : '';
		if (hero) {
			options.push({
				id: `dest-${dest.destinationId}-cover`,
				title: translate('labels.customization.images.cover'),
				image: hero,
				sourceLabel: destTitle,
			});
		}

		// Place photos: one card per image, labelled with the item name.
		for (const category of DESTINATION_CATEGORIES) {
			const entries = doc?.[category];
			if (!entries || typeof entries !== 'object') continue;
			Object.entries(entries).forEach(([entryId, entry]) => {
				const item = entry as any;
				if (!item || typeof item !== 'object') return;
				const images = (Array.isArray(item.images) ? item.images : []).filter((img) =>
					img?.link?.trim(),
				);
				if (!images.length) return;
				const name = item.name || '';
				const itemLabel = item.emoji ? `${item.emoji} ${name}`.trim() : name;
				const sourceLabel = name || itemLabel;
				images.forEach((img, k) => {
					const description = img?.description?.trim();
					const caption = description ? `${itemLabel} · ${description}` : itemLabel;
					options.push({
						id: `dest-${dest.destinationId}-${category}-${entryId}-${k}`,
						title:
							caption || translate('labels.customization.images.image_n', { n: k + 1 }),
						image: img.link,
						sourceLabel,
					});
				});
			});
		}

		if (options.length) {
			subgroups.push({ title: destTitle, options });
		}
	});
	return {
		key: 'destinations',
		title: translate('labels.customization.images.group_destinations'),
		subgroups,
	};
}

function countGroupImages(group: TripImageGroup): number {
	if (group.subgroups?.length) {
		return group.subgroups.reduce((sum, sub) => sum + sub.options.length, 0);
	}
	return group.options?.length || 0;
}

const tripProvider: ImagePickerTripProvider = {
	isAvailable() {
		// The trip page can always offer its own images (gallery, stays, places).
		return true;
	},

	getWallpaperSourceId(): string | null {
		return WALLPAPER_SOURCE?.id || null;
	},

	async loadOptions(): Promise<TripImageGroup[]> {
		const groups: TripImageGroup[] = [];
		const gallery = buildGalleryGroup();
		if (countGroupImages(gallery) > 0) groups.push(gallery);
		const accommodations = buildAccommodationsGroup();
		if (countGroupImages(accommodations) > 0) groups.push(accommodations);
		const destinations = await buildDestinationsGroup();
		if (countGroupImages(destinations) > 0) groups.push(destinations);
		return groups;
	},

	applyOption(option: TripImageOption) {
		// Remember the source so unlinking it later marks the wallpaper custom.
		WALLPAPER_SOURCE = {
			id: option.id,
			label: option.sourceLabel,
			destinationId: getSourceDestinationId(option.id),
		};
		const input = getID('link-background') as HTMLInputElement | null;
		if (input) input.value = option.image;
		activateImagesModule();
		openToast(
			translate('labels.customization.images.imported_from', { name: option.sourceLabel }),
		);
	},

	getWallpaperSourceLabel(): string | null {
		return WALLPAPER_SOURCE?.label || null;
	},

	onWallpaperCustomApplied() {
		WALLPAPER_SOURCE = null;
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

// Register the trip's image-import provider (side effect of loading this
// module — edit-trip only).
setImagePickerTripProvider(tripProvider);

// Re-render the cards whenever the linked-destination set changes during
// editing (e.g. the wallpaper source was unlinked and is now custom).
document.addEventListener('trip:activeDestinationsChanged', () => {
	refreshImagePickers();
});

/** Destination the current wallpaper was imported from (null if custom or non-destination). */
export function getWallpaperSourceDestination(): string | null {
	return WALLPAPER_SOURCE?.destinationId || null;
}

/**
 * If `destId` is the wallpaper's source destination, keep the wallpaper (it is
 * already a plain URL) but treat it as a custom image. Returns true when it was
 * the source.
 */
export function handleWallpaperSourceUnlink(destId: string): boolean {
	if (WALLPAPER_SOURCE?.destinationId === destId) {
		WALLPAPER_SOURCE = null;
		return true;
	}
	return false;
}
