// ======= Image Picker (Wallpaper + Logos) — shared UI =======
// Card-based pickers for the wallpaper and logos used by the edit-trip and
// edit-destination pages. Clicking a card opens a dialog with a "source" tab
// (images already inside the document being styled — a trip's own photos or a
// destination's saved place photos — grouped by source) plus a custom
// link/upload tab. The source tab is supplied by a provider registered by the
// page: edit-trip exposes the trip's images, edit-destination exposes the
// destination's item photos. When no provider is registered, only the custom
// option is shown.

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

/** A single selectable image inside the "source" tab. */
export interface TripImageOption {
	/** Unique id within the loaded options (also used to restore a selection). */
	id: string;
	/** Short caption shown under the thumbnail. */
	title: string;
	/** Image URL. */
	image: string;
	/** Human source label (used on the wallpaper card + confirmation toast). */
	sourceLabel: string;
}

/** A sub-block inside a group (e.g. one accommodation or one destination). */
export interface TripImageSubgroup {
	title: string;
	options: TripImageOption[];
}

/**
 * A top-level "source" tab section. A group either carries its options directly
 * (e.g. Gallery) or splits them into per-source subgroups (accommodations,
 * destinations) so the several images of the same thing stay together.
 */
export interface TripImageGroup {
	key: string;
	/** Translated group title shown as the section header. */
	title: string;
	/** Flat options (used when `subgroups` is empty). */
	options?: TripImageOption[];
	/** Per-source subgroups (used when present). */
	subgroups?: TripImageSubgroup[];
}

/**
 * Optional "source" capability for the wallpaper picker, registered by an edit
 * page: edit-trip exposes the trip's own images, edit-destination exposes the
 * destination's saved place photos. When absent the dialog only offers the
 * custom option.
 */
export interface ImagePickerSourceProvider {
	isAvailable(): boolean;
	loadOptions(): Promise<TripImageGroup[]>;
	applyOption(option: TripImageOption): void;
	getWallpaperSourceLabel(): string | null;
	/** Option id the current wallpaper was imported from (null = custom). */
	getWallpaperSourceId(): string | null;
	onWallpaperCustomApplied(): void;
	/** Translation key for the source tab label (defaults to the trip label). */
	sourceTabLabelKey?: string;
	/** Translation key for the source tab loading message. */
	sourceLoadingLabelKey?: string;
	/** Translation key for the source tab "no images yet" empty state. */
	sourceEmptyLabelKey?: string;
}

/** Picker type → id of the hidden input that stores the chosen value. */
const IMAGE_INPUT_BY_TYPE: Record<string, string> = {
	background: 'link-background',
	'logo-light': 'link-logo-light',
	'logo-dark': 'link-logo-dark',
};

/** Picker type → translation key used as the dialog title. */
const IMAGE_TYPE_TITLE: Record<string, string> = {
	background: 'labels.wallpaper',
	'logo-light': 'labels.customization.images.logo_light',
	'logo-dark': 'labels.customization.images.logo_dark',
};

/** Type of the currently-open image picker dialog. */
let CURRENT_IMAGE_PICKER_TYPE: string | null = null;

/** Active tab in the open dialog. */
let CURRENT_PICKER_MODE: 'trip' | 'custom' = 'custom';

// Custom-tab image link verification state (see verifyCustomLink). The change
// handler and the Apply action share one check so an invalid link is rejected
// exactly once (value cleared + toast).
let CUSTOM_LAST_GOOD_LINK = '';
let CUSTOM_VERIFY_PENDING: Promise<boolean> | null = null;
let CUSTOM_VERIFY_PENDING_URL = '';

/** Option currently selected (active) in the source tab. */
let SELECTED_OPTION_ID: string | null = null;

/** Source groups loaded for the open dialog. */
let LOADED_TRIP_OPTIONS: TripImageGroup[] = [];

let SOURCE_PROVIDER: ImagePickerSourceProvider | null = null;

/** Register (or clear) the optional source provider for the wallpaper picker. */
export function setImagePickerSourceProvider(provider: ImagePickerSourceProvider | null) {
	SOURCE_PROVIDER = provider;
}

/** Theme exclusivity used by the picker cards ('dynamic' = both modes). */
function getCurrentThemeMode(): 'light' | 'dark' | 'dynamic' {
	const enabled = getID('theme-enabled') as HTMLInputElement | null;
	if (enabled && !enabled.checked) return 'dynamic';
	const lightOnly = getID('theme-mode-light') as HTMLInputElement | null;
	if (lightOnly?.checked) return 'light';
	const darkOnly = getID('theme-mode-dark') as HTMLInputElement | null;
	if (darkOnly?.checked) return 'dark';
	return 'dynamic';
}

let THEME_MODE_LISTENERS_ATTACHED = false;

/** Re-render the logo cards when the theme exclusivity changes. */
function attachThemeModeListeners() {
	if (THEME_MODE_LISTENERS_ATTACHED) return;
	THEME_MODE_LISTENERS_ATTACHED = true;
	const ids = ['theme-enabled', 'theme-mode-dynamic', 'theme-mode-light', 'theme-mode-dark'];
	for (const id of ids) {
		(getID(id) as HTMLInputElement | null)?.addEventListener('change', () =>
			refreshImagePickers(),
		);
	}
}

/** Refresh the wallpaper + logo picker cards from the current values. */
export function refreshImagePickers() {
	attachThemeModeListeners();
	const themeMode = getCurrentThemeMode();
	refreshBackgroundCard();
	refreshLogoCard('logo-light', 'labels.customization.images.light_mode', themeMode);
	refreshLogoCard('logo-dark', 'labels.customization.images.dark_mode', themeMode);
}

function refreshBackgroundCard() {
	const thumb = getID('wallpaper-picker-thumb');
	const label = getID('wallpaper-picker-label');
	if (!thumb || !label) return;

	const link = getID('link-background')?.value || '';
	const sourceLabel = SOURCE_PROVIDER?.getWallpaperSourceLabel() || '';

	let labelText: string;
	if (!link) {
		labelText = translate('labels.customization.images.add_image');
	} else if (sourceLabel) {
		labelText = sourceLabel;
	} else {
		labelText = translate('labels.customization.images.custom');
	}

	renderPickerThumb(thumb, link);
	label.textContent = labelText;
}

function refreshLogoCard(
	type: string,
	modeKey: string,
	themeMode: 'light' | 'dark' | 'dynamic',
) {
	const card = getID(`${type}-picker-card`) as HTMLElement | null;
	const thumb = getID(`${type}-picker-thumb`);
	const label = getID(`${type}-picker-label`);
	if (!card || !thumb || !label) return;

	// Exclusive themes only show the relevant logo card.
	const hidden =
		(themeMode === 'light' && type === 'logo-dark') ||
		(themeMode === 'dark' && type === 'logo-light');
	if (hidden) {
		card.style.display = 'none';
		return;
	}
	card.style.display = '';

	const lightLink = getID('link-logo-light')?.value || '';
	const darkLink = getID('link-logo-dark')?.value || '';

	// In a dark-only theme the dark card represents the effective dark logo:
	// the original dark image, or the light one when that was the only one set.
	const shownLink =
		themeMode === 'dark' && type === 'logo-dark'
			? darkLink || lightLink
			: getID(IMAGE_INPUT_BY_TYPE[type])?.value || '';

	let labelText: string;
	if (themeMode !== 'dynamic') {
		// Exclusive theme: just the mode name (or the add-image placeholder).
		labelText = shownLink
			? translate(modeKey)
			: translate('labels.customization.images.add_image');
	} else if (shownLink) {
		const otherSet = type === 'logo-light' ? !!darkLink : !!lightLink;
		labelText = otherSet
			? translate(modeKey)
			: translate('labels.customization.images.light_and_dark_mode');
	} else {
		const otherSet = type === 'logo-light' ? !!darkLink : !!lightLink;
		labelText = otherSet
			? translate(
					type === 'logo-light'
						? 'labels.customization.images.add_light_mode_image'
						: 'labels.customization.images.add_dark_mode_image',
				)
			: translate('labels.customization.images.add_image');
	}

	renderPickerThumb(thumb, shownLink);
	label.textContent = labelText;
}

function renderPickerThumb(thumb: HTMLElement, link: string) {
	if (!link) {
		thumb.classList.add('placeholder');
		thumb.style.backgroundImage = '';
		thumb.innerHTML =
			'<i class="iconify image-picker-icon" data-icon="material-symbols:image-outline"></i>';
		return;
	}
	thumb.classList.remove('placeholder');
	thumb.style.backgroundImage = `url('${link}')`;
	thumb.innerHTML = '';
}

/** Open the picker dialog for the given type (background / logo-light / logo-dark). */
export function openImagePicker(type: string) {
	const inputID = IMAGE_INPUT_BY_TYPE[type];
	if (!inputID || !getID(inputID)) return; // only pages that host the picker

	CURRENT_IMAGE_PICKER_TYPE = type;
	const canImportSource =
		type === 'background' && !!(SOURCE_PROVIDER && SOURCE_PROVIDER.isAvailable());
	const currentValue = (getID(inputID) as HTMLInputElement).value || '';
	const uploadAvailable = canUploadImages();

	// Auto-select the tab matching the current choice: the source image the
	// wallpaper was imported from, or custom (covers empty and link/upload).
	const currentSourceId = canImportSource ? SOURCE_PROVIDER?.getWallpaperSourceId() || null : null;
	CURRENT_PICKER_MODE = currentSourceId ? 'trip' : 'custom';
	SELECTED_OPTION_ID = currentSourceId;
	LOADED_TRIP_OPTIONS = [];

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate(IMAGE_TYPE_TITLE[type] || 'labels.wallpaper');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getImagePickerContent({
		canImportSource,
		initialMode: CURRENT_PICKER_MODE,
		currentValue,
		uploadAvailable,
	});
	properties.buttons = [
		{
			type: 'cancel',
		},
		{
			type: 'confirm',
			action: () => applyFromDialog(),
			label: 'labels.customization.images.apply',
		},
	];

	displayFullMessage(properties);
	loadImagePickerListeners({ canImportSource });
}

function getImagePickerContent({ canImportSource, initialMode, currentValue, uploadAvailable }) {
	const safeValue = String(currentValue).replace(/"/g, '&quot;');
	const useSource = canImportSource && initialMode === 'trip';
	const sourceChecked = useSource ? 'checked' : '';
	const customChecked = useSource ? '' : 'checked';
	const sourcePanelDisplay = useSource ? 'block' : 'none';
	const customPanelDisplay = useSource ? 'none' : 'block';

	const sourceTabLabel = translate(
		SOURCE_PROVIDER?.sourceTabLabelKey || 'labels.customization.images.import_from_trip',
	);
	const sourceLoadingLabel = translate(
		SOURCE_PROVIDER?.sourceLoadingLabelKey || 'labels.customization.images.import_loading',
	);

	return `
		<div class="image-picker-dialog">
			${canImportSource ? `
				<div class="modern-radio-group image-picker-mode">
					<div class="nice-form-group">
						<input type="radio" name="image-picker-mode" id="image-picker-mode-trip" ${sourceChecked}>
						<label for="image-picker-mode-trip">${sourceTabLabel}</label>
					</div>
					<div class="nice-form-group">
						<input type="radio" name="image-picker-mode" id="image-picker-mode-custom" ${customChecked}>
						<label for="image-picker-mode-custom">${translate('labels.customization.images.custom')}</label>
					</div>
				</div>
			` : ''}
			<div id="image-picker-trip-panel" style="display: ${sourcePanelDisplay}">
				<div class="wallpaper-import-loading" id="image-picker-loading">
					<div class="wallpaper-import-spinner"></div>
					<span>${sourceLoadingLabel}</span>
				</div>
				<div class="wallpaper-import-scroll" id="image-picker-trip-list" style="display: none;"></div>
			</div>
			<div id="image-picker-custom-panel" style="display: ${customPanelDisplay}">
				<div class="nice-form-group">
					<label>${translate('labels.image.link')}</label>
					<input class="image-input" id="image-picker-link" type="url"
						placeholder="https://example.com/image.jpg" value="${safeValue}" />
				</div>
				${uploadAvailable ? `
					<div class="nice-form-group">
						<label>${translate('labels.image.upload')} <span class="optional">(${translate('labels.image.upload_limit')})</span></label>
						<input id="image-picker-upload" type="file" accept=".jpg, .jpeg, .png" />
					</div>
				` : ''}
			</div>
		</div>
	`;
}

function loadImagePickerListeners({ canImportSource }) {
	if (canImportSource) {
		const tripMode = getID('image-picker-mode-trip');
		const customMode = getID('image-picker-mode-custom');
		tripMode?.addEventListener('change', () => switchImagePickerMode('trip'));
		customMode?.addEventListener('change', () => switchImagePickerMode('custom'));
		void loadTripOptions();
	}

	// Custom panel: validate a typed image link on change. The Apply action
	// reuses the same check (see verifyCustomLink), so a link that doesn't
	// actually load as an image is rejected (value cleared + toast).
	const linkInput = getID('image-picker-link') as HTMLInputElement | null;
	if (linkInput) {
		// A pre-existing stored image is trusted as-is; only new/edited values
		// get re-verified.
		CUSTOM_LAST_GOOD_LINK = linkInput.value.trim();
		CUSTOM_VERIFY_PENDING = null;
		CUSTOM_VERIFY_PENDING_URL = '';
		linkInput.addEventListener('input', updateConfirmState);
		linkInput.addEventListener('change', () => void verifyCustomLink());
	}
	const uploadInput = getID('image-picker-upload') as HTMLInputElement | null;
	uploadInput?.addEventListener('change', updateConfirmState);

	updateConfirmState();
}

function switchImagePickerMode(mode: 'trip' | 'custom') {
	CURRENT_PICKER_MODE = mode;
	const tripPanel = getID('image-picker-trip-panel');
	const customPanel = getID('image-picker-custom-panel');
	if (tripPanel) tripPanel.style.display = mode === 'trip' ? 'block' : 'none';
	if (customPanel) customPanel.style.display = mode === 'trip' ? 'none' : 'block';
	updateConfirmState();
}

/** Enable the confirm only when the active tab has a valid selection. */
function updateConfirmState() {
	const confirm = getID('message-confirm') as HTMLButtonElement | null;
	if (!confirm) return;

	let enabled = false;
	if (CURRENT_PICKER_MODE === 'trip') {
		enabled = !!SELECTED_OPTION_ID;
	} else {
		const linkValue = getID('image-picker-link')?.value?.trim() || '';
		const fileChosen = !!(getID('image-picker-upload') as HTMLInputElement | null)?.files?.length;
		enabled = linkValue !== '' || fileChosen;
	}
	confirm.disabled = !enabled;
}

/**
 * Verify the current custom link actually loads as an image. Used by both the
 * change listener and before applying, so an invalid link is rejected exactly
 * once (validateImageLink clears the value + toasts) however the user confirms.
 */
async function verifyCustomLink(): Promise<void> {
	const input = getID('image-picker-link') as HTMLInputElement | null;
	if (!input) return;
	const value = input.value.trim();

	// Nothing new to check (empty or already verified as a loadable image).
	if (!value || value === CUSTOM_LAST_GOOD_LINK) return;

	// Reuse an in-flight check for the same value so rejection happens once.
	if (CUSTOM_VERIFY_PENDING && CUSTOM_VERIFY_PENDING_URL === value) {
		await CUSTOM_VERIFY_PENDING;
		return;
	}

	const pending = validateImageLink('image-picker-link');
	CUSTOM_VERIFY_PENDING = pending;
	CUSTOM_VERIFY_PENDING_URL = value;
	const ok = await pending;
	CUSTOM_VERIFY_PENDING = null;
	CUSTOM_VERIFY_PENDING_URL = '';
	if (ok && input.value.trim() === value) CUSTOM_LAST_GOOD_LINK = value;
}

/** Lazily load the trip image groups through the registered provider. */
async function loadTripOptions() {
	const list = getID('image-picker-trip-list');
	const loading = getID('image-picker-loading');
	if (!list || !loading || !SOURCE_PROVIDER) return;

	const groups = await SOURCE_PROVIDER.loadOptions();
	LOADED_TRIP_OPTIONS = groups;

	loading.style.display = 'none';
	list.style.display = 'block';

	const total = groups.reduce((sum, group) => sum + countGroupImages(group), 0);
	if (total === 0) {
		const emptyMessage = translate(
			SOURCE_PROVIDER?.sourceEmptyLabelKey || 'labels.customization.images.no_trip_images',
		);
		list.innerHTML = `<div class="wallpaper-import-empty">${emptyMessage}</div>`;
		updateConfirmState();
		return;
	}

	list.innerHTML = renderTripGroups(groups);

	// Selecting only marks the card active; the user confirms afterwards.
	list.addEventListener('click', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('.wallpaper-import-card');
		if (!card) return;
		const id = card.getAttribute('data-option-id') || '';
		if (!hasOption(id)) return;
		SELECTED_OPTION_ID = id;
		list.querySelectorAll('.wallpaper-import-card').forEach((c) => {
			c.classList.toggle('selected', c.getAttribute('data-option-id') === id);
		});
		updateConfirmState();
	});

	// Reflect the pre-selected (current wallpaper source) option.
	updateConfirmState();
}

/** Total number of images inside a group (flat options + all subgroups). */
function countGroupImages(group: TripImageGroup): number {
	if (group.subgroups?.length) {
		return group.subgroups.reduce((sum, sub) => sum + sub.options.length, 0);
	}
	return group.options?.length || 0;
}

function hasOption(id: string): boolean {
	return !!findOption(id);
}

function findOption(id: string | null): TripImageOption | null {
	if (!id) return null;
	for (const group of LOADED_TRIP_OPTIONS) {
		for (const sub of group.subgroups || []) {
			const found = sub.options.find((option) => option.id === id);
			if (found) return found;
		}
		const found = (group.options || []).find((option) => option.id === id);
		if (found) return found;
	}
	return null;
}

/** Render the groups as a scrollable, grouped list of selectable cards. */
function renderTripGroups(groups: TripImageGroup[]): string {
	return groups
		.map((group) => {
			const subgroups = (group.subgroups || []).filter((sub) => sub.options.length > 0);
			const header = `
				<h4 class="wallpaper-import-group-title">
					${group.title}
					<span class="wallpaper-import-group-count">${countGroupImages(group)}</span>
				</h4>`;
			const body = subgroups.length
				? subgroups
						.map(
							(sub) => `
							<div class="wallpaper-import-subgroup">
								<h5 class="wallpaper-import-subgroup-title">${sub.title}</h5>
								<div class="wallpaper-import-group-grid">${renderCards(sub.options)}</div>
							</div>`,
						)
						.join('')
				: `<div class="wallpaper-import-group-grid">${renderCards(group.options || [])}</div>`;
			return `<section class="wallpaper-import-group" data-group="${group.key}">${header}${body}</section>`;
		})
		.join('');
}

function renderCards(options: TripImageOption[]): string {
	return options
		.map(
			(option) => `
			<button type="button" class="wallpaper-import-card${option.id === SELECTED_OPTION_ID ? ' selected' : ''}" data-option-id="${option.id}">
				<div class="wallpaper-import-thumb" style="background-image: url('${option.image}')"></div>
				<div class="wallpaper-import-name">${option.title}</div>
			</button>`,
		)
		.join('');
}

/** Confirm: apply the active tab's selection (trip or custom). */
function applyFromDialog() {
	if (CURRENT_PICKER_MODE === 'trip') {
		applySelectedOption();
	} else {
		void applyCustomFromDialog();
	}
}

function applySelectedOption() {
	const option = findOption(SELECTED_OPTION_ID);
	if (!option || !SOURCE_PROVIDER) return;
	SOURCE_PROVIDER.applyOption(option);
	closeMessage();
	refreshImagePickers();
}

async function applyCustomFromDialog() {
	const type = CURRENT_IMAGE_PICKER_TYPE;
	if (!type) return;
	const linkInput = getID(IMAGE_INPUT_BY_TYPE[type]) as HTMLInputElement | null;
	if (!linkInput) return;

	const link = getID('image-picker-link')?.value?.trim() || '';
	const file = (getID('image-picker-upload') as HTMLInputElement | null)?.files?.[0] || null;

	let finalLink = link;
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
		finalLink = result.link;
	}

	// Never apply a typed link that doesn't actually load as an image. The
	// shared verifyCustomLink check rejects it once (value cleared + toast)
	// and we keep the dialog open for a corrected link.
	if (!file && finalLink) {
		await verifyCustomLink();
		if ((getID('image-picker-link') as HTMLInputElement | null)?.value?.trim() !== finalLink) {
			updateConfirmState();
			return; // rejected — do not apply
		}
	}

	const oldValue = linkInput.value;
	if (!finalLink && !oldValue) {
		closeMessage(); // nothing to apply
		return;
	}

	linkInput.value = finalLink;
	copyLogoToEmptyCounterpart(type, finalLink);

	if (type === 'background') {
		// A new custom image replaces any trip-imported wallpaper.
		if (finalLink !== oldValue) SOURCE_PROVIDER?.onWallpaperCustomApplied();
		if (finalLink) activateImagesModule();
	}

	closeMessage();
	refreshImagePickers();
	if (finalLink) openToast(translate('labels.customization.images.custom_applied'));
}

/** Seed an unset logo mode from the first logo the user chooses. */
function copyLogoToEmptyCounterpart(type: string, link: string) {
	if (!link || (type !== 'logo-light' && type !== 'logo-dark')) return;

	const counterpartType = type === 'logo-light' ? 'logo-dark' : 'logo-light';
	const counterpartInput = getID(IMAGE_INPUT_BY_TYPE[counterpartType]) as HTMLInputElement | null;
	if (counterpartInput && !counterpartInput.value.trim()) {
		counterpartInput.value = link;
	}
}

function activateImagesModule() {
	const imagesEnabled = getID('images-enabled') as HTMLInputElement | null;
	if (imagesEnabled && !imagesEnabled.checked) {
		imagesEnabled.checked = true;
		const content = getID('images-enabled-content');
		if (content) content.style.display = 'block';
	}
}

function canUploadImages(): boolean {
	return IMAGE_UPLOAD_ENABLED === true && !!(PERMISSIONS && PERMISSIONS['upload'] === true);
}
