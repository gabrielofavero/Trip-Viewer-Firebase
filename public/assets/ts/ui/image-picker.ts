// ======= Image Picker (Wallpaper + Logos) — shared UI =======
// Card-based pickers for the wallpaper and logos used by the edit-trip and
// edit-destination pages. Clicking a card opens a dialog that can use a custom
// link/upload, plus an optional "From destination" tab supplied by a provider
// registered by the trip page (a destination document has nothing to import,
// so that page only shows the custom option). When no provider is registered,
// only the custom option is shown.

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

export interface DestinationImageOption {
	id: string;
	title: string;
	image: string;
}

/**
 * Optional destination-import capability, registered by the trip page. When
 * absent (e.g. edit-destination), the dialog only offers the custom option.
 */
export interface ImagePickerDestinationProvider {
	isAvailable(): boolean;
	loadOptions(): Promise<DestinationImageOption[]>;
	applyOption(option: DestinationImageOption): void;
	getWallpaperSourceLabel(): string | null;
	getCurrentDestinationId(): string | null;
	onWallpaperCustomApplied(): void;
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
let CURRENT_PICKER_MODE: 'destination' | 'custom' = 'custom';

/** Destination currently selected (active) in the destination tab. */
let SELECTED_DESTINATION_ID: string | null = null;

/** Destination options loaded for the open dialog. */
let LOADED_DESTINATION_OPTIONS: DestinationImageOption[] = [];

let DESTINATION_PROVIDER: ImagePickerDestinationProvider | null = null;

/** Register (or clear) the optional destination-import provider. */
export function setImagePickerDestinationProvider(
	provider: ImagePickerDestinationProvider | null,
) {
	DESTINATION_PROVIDER = provider;
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
	const sourceLabel = DESTINATION_PROVIDER?.getWallpaperSourceLabel() || '';

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
	const canImportDestination =
		type === 'background' && !!(DESTINATION_PROVIDER && DESTINATION_PROVIDER.isAvailable());
	const currentValue = (getID(inputID) as HTMLInputElement).value || '';
	const uploadAvailable = canUploadImages();

	// Auto-select the tab matching the current choice: the destination the
	// wallpaper was imported from, or custom (covers empty and link/upload).
	const currentDestinationId = canImportDestination
		? DESTINATION_PROVIDER?.getCurrentDestinationId() || null
		: null;
	CURRENT_PICKER_MODE = currentDestinationId ? 'destination' : 'custom';
	SELECTED_DESTINATION_ID = currentDestinationId;
	LOADED_DESTINATION_OPTIONS = [];

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate(IMAGE_TYPE_TITLE[type] || 'labels.wallpaper');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getImagePickerContent({
		canImportDestination,
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
	loadImagePickerListeners({ canImportDestination });
}

function getImagePickerContent({ canImportDestination, initialMode, currentValue, uploadAvailable }) {
	const safeValue = String(currentValue).replace(/"/g, '&quot;');
	const useDestination = canImportDestination && initialMode === 'destination';
	const destChecked = useDestination ? 'checked' : '';
	const customChecked = useDestination ? '' : 'checked';
	const destPanelDisplay = useDestination ? 'block' : 'none';
	const customPanelDisplay = useDestination ? 'none' : 'block';

	return `
		<div class="image-picker-dialog">
			${canImportDestination ? `
				<div class="modern-radio-group image-picker-mode">
					<div class="nice-form-group">
						<input type="radio" name="image-picker-mode" id="image-picker-mode-destination" ${destChecked}>
						<label for="image-picker-mode-destination">${translate('labels.customization.images.import_from_destination')}</label>
					</div>
					<div class="nice-form-group">
						<input type="radio" name="image-picker-mode" id="image-picker-mode-custom" ${customChecked}>
						<label for="image-picker-mode-custom">${translate('labels.customization.images.custom')}</label>
					</div>
				</div>
			` : ''}
			<div id="image-picker-destination-panel" style="display: ${destPanelDisplay}">
				<div class="wallpaper-import-loading" id="image-picker-loading">
					<div class="wallpaper-import-spinner"></div>
					<span>${translate('labels.customization.images.import_loading')}</span>
				</div>
				<div class="wallpaper-import-list" id="image-picker-destination-list" style="display: none;"></div>
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

function loadImagePickerListeners({ canImportDestination }) {
	if (canImportDestination) {
		const destMode = getID('image-picker-mode-destination');
		const customMode = getID('image-picker-mode-custom');
		destMode?.addEventListener('change', () => switchImagePickerMode('destination'));
		customMode?.addEventListener('change', () => switchImagePickerMode('custom'));
		void loadDestinationOptions();
	}

	// Custom panel: the confirm stays disabled until a link is provided or a
	// file is chosen.
	const linkInput = getID('image-picker-link') as HTMLInputElement | null;
	linkInput?.addEventListener('input', updateConfirmState);
	const uploadInput = getID('image-picker-upload') as HTMLInputElement | null;
	uploadInput?.addEventListener('change', updateConfirmState);

	updateConfirmState();
}

function switchImagePickerMode(mode: 'destination' | 'custom') {
	CURRENT_PICKER_MODE = mode;
	const destPanel = getID('image-picker-destination-panel');
	const customPanel = getID('image-picker-custom-panel');
	if (destPanel) destPanel.style.display = mode === 'destination' ? 'block' : 'none';
	if (customPanel) customPanel.style.display = mode === 'destination' ? 'none' : 'block';
	updateConfirmState();
}

/** Enable the confirm only when the active tab has a valid selection. */
function updateConfirmState() {
	const confirm = getID('message-confirm') as HTMLButtonElement | null;
	if (!confirm) return;

	let enabled = false;
	if (CURRENT_PICKER_MODE === 'destination') {
		enabled = !!SELECTED_DESTINATION_ID;
	} else {
		const linkValue = getID('image-picker-link')?.value?.trim() || '';
		const fileChosen = !!(getID('image-picker-upload') as HTMLInputElement | null)?.files?.length;
		enabled = linkValue !== '' || fileChosen;
	}
	confirm.disabled = !enabled;
}

/** Lazily load the destination options through the registered provider. */
async function loadDestinationOptions() {
	const list = getID('image-picker-destination-list');
	const loading = getID('image-picker-loading');
	if (!list || !loading || !DESTINATION_PROVIDER) return;

	const options = await DESTINATION_PROVIDER.loadOptions();
	LOADED_DESTINATION_OPTIONS = options;

	loading.style.display = 'none';
	list.style.display = 'grid';

	if (options.length === 0) {
		list.innerHTML = `<div class="wallpaper-import-empty">${translate(
			'labels.customization.images.no_destination_image',
		)}</div>`;
		updateConfirmState();
		return;
	}

	list.innerHTML = options
		.map(
			(option) => `
			<button type="button" class="wallpaper-import-card${option.id === SELECTED_DESTINATION_ID ? ' selected' : ''}" data-destination-id="${option.id}">
				<div class="wallpaper-import-thumb" style="background-image: url('${option.image}')"></div>
				<div class="wallpaper-import-name">${option.title}</div>
			</button>`,
		)
		.join('');

	list.addEventListener('click', (event) => {
		const card = (event.target as Element).closest<HTMLElement>('.wallpaper-import-card');
		if (!card) return;
		const id = card.getAttribute('data-destination-id') || '';
		if (!options.some((o) => o.id === id)) return;

		// Selecting only marks the card active; the user confirms afterwards.
		SELECTED_DESTINATION_ID = id;
		list.querySelectorAll('.wallpaper-import-card').forEach((c) => {
			c.classList.toggle('selected', c.getAttribute('data-destination-id') === id);
		});
		updateConfirmState();
	});

	// Reflect the pre-selected (current wallpaper source) destination.
	updateConfirmState();
}

/** Confirm: apply the active tab's selection (destination or custom). */
function applyFromDialog() {
	if (CURRENT_PICKER_MODE === 'destination') {
		applySelectedDestination();
	} else {
		void applyCustomFromDialog();
	}
}

function applySelectedDestination() {
	const option = LOADED_DESTINATION_OPTIONS.find((o) => o.id === SELECTED_DESTINATION_ID);
	if (!option || !DESTINATION_PROVIDER) return;
	DESTINATION_PROVIDER.applyOption(option);
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

	const oldValue = linkInput.value;
	if (!finalLink && !oldValue) {
		closeMessage(); // nothing to apply
		return;
	}

	linkInput.value = finalLink;

	if (type === 'background') {
		// A new custom image replaces any destination-imported wallpaper.
		if (finalLink !== oldValue) DESTINATION_PROVIDER?.onWallpaperCustomApplied();
		if (finalLink) activateImagesModule();
	}

	closeMessage();
	refreshImagePickers();
	if (finalLink) openToast(translate('labels.customization.images.custom_applied'));
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
