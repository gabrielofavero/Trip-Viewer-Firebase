// ======= Image Picker (edit-destination) — destination source provider =======
// Registers the destination page's "Destination" capability for the shared
// image picker (ui/image-picker.ts). It gathers every photo already saved for
// this destination's items — the restaurants, snacks, nightlife, tourism and
// shopping entries (both the ones loaded from Firestore and any the user is
// staging in this session) — so a wallpaper can be picked from them. It also
// tracks where the wallpaper came from so applying a custom image (or removing
// the source entry) keeps the wallpaper but marks it as a custom image.

import { translate } from '../../../i18n/translation.js';
import type {
	ImagePickerSourceProvider,
	TripImageGroup,
	TripImageOption,
} from '../../../ui/image-picker.js';
import { refreshImagePickers, setImagePickerSourceProvider } from '../../../ui/image-picker.js';
import { getID } from '../../../utils/dom.js';
import { openToast } from '../../../utils/messages.js';
import { DESTINATION_IMAGES } from './image.js';

/** Destination categories whose entries can hold item photos. */
const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/**
 * Where the current wallpaper was imported from (null = custom). Tracked
 * in-session so removing the source entry keeps the wallpaper but marks it as
 * a custom image.
 */
interface WallpaperSource {
	id: string;
	label: string;
}

let WALLPAPER_SOURCE: WallpaperSource | null = null;

/** HTML-escape text so it is safe to interpolate into the picker's innerHTML. */
function escapeHtml(value: string): string {
	const div = document.createElement('div');
	div.textContent = value;
	return div.innerHTML;
}

/**
 * The images of one destination entry (a DOM row) as selectable wallpaper
 * options. Existing entries carry a stable id; staged (unsaved) ones fall back
 * to the row index until they are persisted.
 */
function buildEntryOptions(category: string, j: number): TripImageOption[] {
	const images = DESTINATION_IMAGES[`${category}-${j}`] || [];
	if (!images.length) return [];

	const name = (getID(`${category}-name-${j}`) as HTMLInputElement | null)?.value?.trim() || '';
	const emoji = (getID(`${category}-emoji-${j}`) as HTMLInputElement | null)?.value?.trim() || '';
	const entryId = (getID(`${category}-id-${j}`) as HTMLInputElement | null)?.value?.trim() || '';
	const prefix = escapeHtml((emoji ? `${emoji} ${name}` : name).trim());

	const options: TripImageOption[] = [];
	images.forEach((img, k) => {
		const link = img?.link?.trim();
		if (!link) return;

		const description = img?.description?.trim();
		let title = prefix;
		if (description) {
			title = title ? `${title} · ${escapeHtml(description)}` : escapeHtml(description);
		}
		if (!title) {
			title = translate('labels.customization.images.photo_n', { n: k + 1 });
		}

		options.push({
			id: entryId ? `dest-${category}-${entryId}-${k}` : `dest-${category}-new-${j}-${k}`,
			title,
			image: link,
			sourceLabel: prefix || title,
		});
	});
	return options;
}

/** Every saved item photo of the destination, grouped per category. */
function buildDestinationGroups(): TripImageGroup[] {
	const groups: TripImageGroup[] = [];
	for (const category of DESTINATION_CATEGORIES) {
		const box = getID(`${category}-box`);
		if (!box) continue;

		const options: TripImageOption[] = [];
		// Each row's id is `${category}-${j}` (j starts at 1); parse it from the
		// element so the mapping stays correct even after a row is removed.
		box.querySelectorAll<HTMLElement>('.accordion-item').forEach((row) => {
			const j = parseInt(row.id.slice(`${category}-`.length), 10);
			if (Number.isNaN(j)) return;
			options.push(...buildEntryOptions(category, j));
		});

		if (options.length) {
			groups.push({
				key: category,
				title: translate(`destination.${category}.title`),
				options,
			});
		}
	}
	return groups;
}

/** Whether the stored wallpaper source still exists among the current options. */
function wallpaperSourceExists(options: TripImageOption[]): boolean {
	if (!WALLPAPER_SOURCE) return false;
	const sourceId = WALLPAPER_SOURCE.id;
	return options.some((option) => option.id === sourceId);
}

function activateImagesModule() {
	const imagesEnabled = getID('images-enabled') as HTMLInputElement | null;
	if (imagesEnabled && !imagesEnabled.checked) {
		imagesEnabled.checked = true;
		const content = getID('images-enabled-content');
		if (content) content.style.display = 'block';
	}
}

const destinationProvider: ImagePickerSourceProvider = {
	// The destination's own item photos are always an option for its wallpaper.
	isAvailable() {
		return true;
	},

	getWallpaperSourceId(): string | null {
		// Self-heal: if the source entry was removed since the wallpaper was
		// applied, drop the stale source so it behaves as a custom image.
		const options = buildDestinationGroups().flatMap((group) => group.options || []);
		if (WALLPAPER_SOURCE && !wallpaperSourceExists(options)) {
			WALLPAPER_SOURCE = null;
			refreshImagePickers();
		}
		return WALLPAPER_SOURCE?.id || null;
	},

	async loadOptions(): Promise<TripImageGroup[]> {
		return buildDestinationGroups();
	},

	applyOption(option: TripImageOption) {
		// Remember the source so removing it later marks the wallpaper custom.
		WALLPAPER_SOURCE = { id: option.id, label: option.sourceLabel };
		const input = getID('link-background') as HTMLInputElement | null;
		if (input) input.value = option.image;
		activateImagesModule();
		openToast(translate('labels.customization.images.imported_from', { name: option.sourceLabel }));
	},

	getWallpaperSourceLabel(): string | null {
		return WALLPAPER_SOURCE?.label || null;
	},

	onWallpaperCustomApplied() {
		WALLPAPER_SOURCE = null;
	},

	// Destination-specific source tab copy (trip defaults are overridden).
	sourceTabLabelKey: 'labels.customization.images.destination',
	sourceLoadingLabelKey: 'labels.customization.images.destination_loading',
	sourceEmptyLabelKey: 'labels.customization.images.no_destination_images',
};

// Register the destination's image-import provider (side effect of loading
// this module — edit-destination only).
setImagePickerSourceProvider(destinationProvider);
