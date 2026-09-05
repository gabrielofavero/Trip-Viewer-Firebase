// ======= Image Slot Picker — shared carousel + dialog =======
// Used by the edit-destination and edit-trip editors to manage the photo
// collections of a destination entry, a trip accommodation, and the trip
// gallery. Each flow stages a live array of slots (`ImageSlot[]`); the
// carousel renders one card per slot (logo-picker-card proportions) plus a
// single "add" card while slots remain (max 5 for destinations/accommodations,
// unlimited for the gallery). Clicking a card opens the same style of dialog
// as the wallpaper/logo picker (link/upload), extended with optional extra
// fields: a "label" (description) for destination/accommodation photos, and
// title/category/description for gallery photos.

import { cloneObject, getID } from '../utils/dom.js';
import { translate } from '../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../utils/messages.js';
import { IMAGE_UPLOAD_ENABLED, PERMISSIONS, uploadImage } from '../data/firebase/storage.js';
import { DOCUMENT_ID } from '../data/state.js';
import { getHTMLpage } from '../app/main.js';
import { validateImageLink } from './fields.js';
import {
	addSelectorDS,
	buildDS,
	newDynamicSelect,
	updateValueDS,
} from './dynamic-select.js';

/** A single photo slot. `link` is the photo URL; the rest are optional metadata. */
export interface ImageSlot {
	link: string;
	/** Caption / label — destination & accommodation photos. */
	description?: string;
	/** Title — gallery photos. */
	title?: string;
	/** Category (type) — gallery photos. */
	category?: string;
}

export interface ImageSlotPickerOptions {
	/** Id of the element that holds the carousel. */
	containerId: string;
	/** Live array of slots (mutated in place). */
	images: ImageSlot[];
	/** Maximum number of slots (omit for unlimited). */
	maxSlots?: number;
	/** Label shown on the trailing "add" card. */
	addLabel?: string;
	/** Extra fields shown inside the dialog. */
	extraFields?: 'label' | 'gallery';
	/** Called after a slot is added/edited/removed. */
	onChanged?: () => void;
	/** Title builder for the dialog (index === images.length means "add"). */
	dialogTitle?: (index: number) => string;
}

/** Gallery category dynamic-select type (only used with extraFields: 'gallery'). */
const GALLERY_CATEGORY_DS = 'image-slot-gallery-category';

// ---------------------------------------------------------------------------
// Carousel rendering
// ---------------------------------------------------------------------------

/** Render (or re-render) the slot carousel inside the container. */
export function renderImageSlotCarousel(options: ImageSlotPickerOptions): void {
	const container = getID(options.containerId) as HTMLElement | null;
	if (!container) return;

	const images = options.images || [];
	const unlimited = options.maxSlots === undefined;
	const canAdd = unlimited || images.length < options.maxSlots!;

	let html = '';
	images.forEach((image, i) => {
		html += getSlotCardHTML(image, i, options);
	});
	if (canAdd) {
		html += getAddCardHTML(images.length, options);
	}
	container.innerHTML = html;

	// Cards are plain buttons — delegate clicks.
	container.querySelectorAll<HTMLElement>('.image-slot-card').forEach((card) => {
		card.addEventListener('click', () => {
			const index = parseInt(card.getAttribute('data-slot-index') || '-1', 10);
			if (index >= 0 && index <= images.length) openImageSlotDialog(options, index);
		});
	});
}

function getSlotCardHTML(image: ImageSlot, i: number, options: ImageSlotPickerOptions): string {
	const link = (image.link || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
	const title =
		image.title?.trim() ||
		image.description?.trim() ||
		translate('labels.image.photo_n', { n: i + 1 });
	const thumb = link
		? `<span class="image-picker-thumb image-slot-thumb" style="background-image:url('${link}')"></span>`
		: `<span class="image-picker-thumb image-slot-thumb placeholder"><i class="iconify image-picker-icon" data-icon="material-symbols:image-outline"></i></span>`;
	return `
		<button type="button" class="image-picker-card image-slot-card" data-slot-index="${i}">
			${thumb}
			<span class="image-picker-label image-slot-label" title="${title.replace(/"/g, '&quot;')}">${title}</span>
		</button>
	`;
}

function getAddCardHTML(index: number, options: ImageSlotPickerOptions): string {
	const label = options.addLabel || translate('labels.image.add_photo');
	return `
		<button type="button" class="image-picker-card image-slot-card is-add" data-slot-index="${index}">
			<span class="image-picker-thumb image-slot-thumb placeholder">
				<i class="iconify image-picker-icon" data-icon="material-symbols:image-outline"></i>
			</span>
			<span class="image-picker-label image-slot-label">${label}</span>
		</button>
	`;
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

let CURRENT_DIALOG_OPTIONS: ImageSlotPickerOptions | null = null;
let CURRENT_DIALOG_INDEX = -1;
let CURRENT_DIALOG_REMOVE = false;

// Image link verification state for the open dialog (see verifySlotLink). The
// change handler and the Apply action share one check so an invalid link is
// rejected exactly once (value cleared + toast).
let SLOT_LAST_GOOD_LINK = '';
let SLOT_VERIFY_PENDING: Promise<boolean> | null = null;
let SLOT_VERIFY_PENDING_URL = '';

/** Open the slot dialog for `index` (images.length = add new). */
export function openImageSlotDialog(options: ImageSlotPickerOptions, index: number): void {
	const images = options.images || [];
	const isNew = index === images.length;
	const current = isNew ? null : images[index];
	if (current === null && !isNew) return;

	CURRENT_DIALOG_OPTIONS = options;
	CURRENT_DIALOG_INDEX = index;
	CURRENT_DIALOG_REMOVE = false;

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title =
		options.dialogTitle?.(index) ||
		(isNew
			? translate('labels.image.add_photo')
			: translate('labels.image.photo_n', { n: index + 1 }));
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getDialogContent(isNew, current);
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: () => applySlotDialog(),
			label: 'labels.customization.images.apply',
		},
	];

	displayFullMessage(properties);
	loadDialogListeners(isNew, current);
}

function getDialogContent(isNew: boolean, current: ImageSlot | null): string {
	const options = CURRENT_DIALOG_OPTIONS!;
	const link = current?.link || '';
	const description = current?.description || '';
	const title = current?.title || '';
	const category = current?.category || '';
	const uploadAvailable = canUploadImages();

	const safe = (value: string) => value.replace(/"/g, '&quot;');

	let extraFields = '';
	if (options.extraFields === 'gallery') {
		extraFields = `
			<div class="nice-form-group">
				<label>${translate('labels.title')}</label>
				<input id="image-slot-title" type="text" value="${safe(title)}" placeholder="${translate('destination.lineup.title')}" />
			</div>
			<div class="nice-form-group">
				<label>${translate('labels.type')} <span class="optional"> (${translate('labels.optional')})</span></label>
				<select id="image-slot-gallery-category-select" class="edit-select" style="display: none;"></select>
				<input class="nice-form-group" id="image-slot-gallery-category" type="text" placeholder="${translate('destination.map.title')}" />
			</div>
			<div class="nice-form-group">
				<label>${translate('labels.image.description')} <span class="optional"> (${translate('labels.optional')})</span></label>
				<input id="image-slot-label" type="text" value="${safe(description)}" placeholder="${translate('trip.gallery.description_placeholder')}" />
			</div>
		`;
	} else if (options.extraFields === 'label') {
		extraFields = `
			<div class="nice-form-group">
				<label>${translate('labels.image.description')} <span class="optional"> (${translate('labels.optional')})</span></label>
				<input id="image-slot-label" type="text" value="${safe(description)}" placeholder="${translate('labels.image.description_placeholder')}" />
			</div>
		`;
	}

	return `
		<div class="image-picker-dialog image-slot-dialog">
			<div class="nice-form-group">
				<label>${translate('labels.image.link')}</label>
				<input class="image-input" id="image-slot-link" type="url"
					placeholder="${translate('labels.image.placeholder')}" value="${safe(link)}" />
			</div>
			${uploadAvailable ? `
				<div class="nice-form-group">
					<label>${translate('labels.image.upload')} <span class="optional">(${translate('labels.image.upload_limit')})</span></label>
					<input id="image-slot-upload" type="file" accept=".jpg, .jpeg, .png" />
				</div>
			` : ''}
			${extraFields}
			${isNew ? '' : `
				<div class="button-box-right" style="margin-top: 8px; margin-bottom: 8px;">
					<button type="button" id="image-slot-remove" class="btn btn-basic btn-format">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
							<path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
						</svg>
					</button>
				</div>
			`}
		</div>
	`;
}

function loadDialogListeners(isNew: boolean, current: ImageSlot | null): void {
	const options = CURRENT_DIALOG_OPTIONS!;

	// Image link validation on change: whenever the user commits a link we
	// actually try to load it, rejecting (clearing + toasting) values that
	// don't decode as an image. The Apply action reuses the same check (see
	// verifySlotLink), so a bad link can't be added even without a change event.
	const linkInput = getID('image-slot-link') as HTMLInputElement | null;
	if (linkInput) {
		// A pre-existing stored link (editing a saved photo) is trusted as-is;
		// only new/edited values get re-verified.
		SLOT_LAST_GOOD_LINK = linkInput.value.trim();
		SLOT_VERIFY_PENDING = null;
		SLOT_VERIFY_PENDING_URL = '';
		linkInput.addEventListener('input', updateDialogConfirmState);
		linkInput.addEventListener('change', () => void verifySlotLink());
	}
	const uploadInput = getID('image-slot-upload') as HTMLInputElement | null;
	uploadInput?.addEventListener('change', updateDialogConfirmState);

	// Remove existing slot.
	const removeBtn = getID('image-slot-remove') as HTMLButtonElement | null;
	if (removeBtn) {
		removeBtn.addEventListener('click', () => {
			CURRENT_DIALOG_REMOVE = true;
			applySlotDialog();
		});
	}

	// Gallery category dynamic-select.
	if (options.extraFields === 'gallery') {
		initGalleryCategoryDS(current?.category || '');
	}

	updateDialogConfirmState();
}

/**
 * Verify the current link actually loads as an image. Used by both the change
 * listener and before applying, so an invalid link is rejected exactly once
 * (validateImageLink clears the value + toasts) however the user confirms.
 */
async function verifySlotLink(): Promise<void> {
	const input = getID('image-slot-link') as HTMLInputElement | null;
	if (!input) return;
	const value = input.value.trim();

	// Nothing new to check (empty or already verified as a loadable image).
	if (!value || value === SLOT_LAST_GOOD_LINK) return;

	// Reuse an in-flight check for the same value so rejection happens once.
	if (SLOT_VERIFY_PENDING && SLOT_VERIFY_PENDING_URL === value) {
		await SLOT_VERIFY_PENDING;
		return;
	}

	const pending = validateImageLink('image-slot-link');
	SLOT_VERIFY_PENDING = pending;
	SLOT_VERIFY_PENDING_URL = value;
	const ok = await pending;
	SLOT_VERIFY_PENDING = null;
	SLOT_VERIFY_PENDING_URL = '';
	if (ok && input.value.trim() === value) SLOT_LAST_GOOD_LINK = value;
}

/** Enable the confirm only when a link or an upload file is present. */
function updateDialogConfirmState(): void {
	const confirm = getID('message-confirm') as HTMLButtonElement | null;
	if (!confirm) return;
	const linkValue = (getID('image-slot-link') as HTMLInputElement | null)?.value?.trim() || '';
	const fileChosen = !!(getID('image-slot-upload') as HTMLInputElement | null)?.files?.length;
	confirm.disabled = linkValue === '' && !fileChosen;
}

/** Set up the gallery category select with known values from all gallery items. */
function initGalleryCategoryDS(currentCategory: string): void {
	newDynamicSelect(GALLERY_CATEGORY_DS);
	const selectID = 'image-slot-gallery-category-select';
	const inputID = 'image-slot-gallery-category';
	// The selector must be registered before updateValueDS touches it.
	addSelectorDS(GALLERY_CATEGORY_DS, selectID, inputID);
	const images = CURRENT_DIALOG_OPTIONS?.images || [];
	for (const image of images) {
		if (image.category) updateValueDS(GALLERY_CATEGORY_DS, image.category, selectID);
	}
	if (currentCategory) updateValueDS(GALLERY_CATEGORY_DS, currentCategory, selectID);
	buildDS(GALLERY_CATEGORY_DS);
}

/** Apply the dialog result to the staged array. */
function applySlotDialog(): void {
	const options = CURRENT_DIALOG_OPTIONS;
	if (!options) return;

	const images = options.images;
	const isNew = CURRENT_DIALOG_INDEX === images.length;

	if (CURRENT_DIALOG_REMOVE) {
		if (isNew) {
			closeMessage();
			return;
		}
		images.splice(CURRENT_DIALOG_INDEX, 1);
		closeMessage();
		renderImageSlotCarousel(options);
		options.onChanged?.();
		return;
	}

	void (async () => {
		const linkInput = getID('image-slot-link') as HTMLInputElement | null;
		const uploadInput = getID('image-slot-upload') as HTMLInputElement | null;
		const file = uploadInput?.files?.[0] || null;

		let link = linkInput?.value?.trim() || '';
		if (file) {
			if (!canUploadImages()) {
				openToast(translate('messages.errors.no_upload_permission'));
				return;
			}
			const folder = getHTMLpage() === 'edit-destination' ? 'destinations' : 'trips';
			const result = await uploadImage(`${folder}/${DOCUMENT_ID}`, file);
			if (!result.link) {
				openToast(translate('messages.errors.upload_error'));
				return;
			}
			link = result.link;
		}

		if (!link) {
			closeMessage();
			return;
		}

		// Never add a typed link that doesn't actually load as an image. The
		// shared verifySlotLink check rejects it once (value cleared + toast)
		// and we keep the dialog open for a corrected link.
		if (!file && link) {
			await verifySlotLink();
			if ((linkInput?.value?.trim() || '') !== link) return; // rejected
		}

		const description =
			(getID('image-slot-label') as HTMLInputElement | null)?.value?.trim() || '';
		const title = (getID('image-slot-title') as HTMLInputElement | null)?.value?.trim() || '';
		const category = readGalleryCategory();

		// Only include the fields that belong to this flow so saved documents
		// stay clean (EntryImage is { description, link } for dest/accommodation).
		const slot: ImageSlot = { link };
		if (options.extraFields === 'label') {
			slot.description = description;
		} else if (options.extraFields === 'gallery') {
			slot.title = title;
			slot.category = category;
			slot.description = description;
		}

		if (isNew) {
			images.push(slot);
		} else {
			images[CURRENT_DIALOG_INDEX] = slot;
		}

		closeMessage();
		renderImageSlotCarousel(options);
		options.onChanged?.();
	})();
}

/** Read the gallery category value (dynamic-select aware). */
function readGalleryCategory(): string {
	const select = getID('image-slot-gallery-category-select') as HTMLSelectElement | null;
	const input = getID('image-slot-gallery-category') as HTMLInputElement | null;
	if (!select || !input) return '';
	if (select.value === 'other') return input.value?.trim() || '';
	return select.value || '';
}

function canUploadImages(): boolean {
	return IMAGE_UPLOAD_ENABLED === true && !!(PERMISSIONS && PERMISSIONS['upload'] === true);
}
