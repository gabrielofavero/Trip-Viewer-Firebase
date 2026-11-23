// ======= Trip / Accommodation Templates (trip editor) =======
//
// Applies account-level templates to the trip being edited:
//
//   - trip skeleton  → colors, background image, logos, theme/visibility and
//                      the template's destination (linked on demand).
//   - accommodation  → name, address, description, check-in/out TIMES and
//                      photos of one stay row. Dates, reservation code/link,
//                      payment status and breakfast stay trip-specific.
//
// Templates are registered in the account Settings — this module only reads
// them from the page-session cache seeded by `loadEditTripPage()`.

import { cloneObject, getChildIDs, getID, getJ } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
} from '../../../utils/messages.js';
import { markStagedChanges } from '../../../ui/fields.js';
import { DESTINATIONS } from '../../../data/state.js';
import {
	filterTemplatesByDestinations,
	getAccommodationTemplates,
	getTripSkeletonTemplates,
	type AccommodationTemplate,
	type TripSkeletonTemplate,
	type TripTemplate,
} from '../../../data/services/trip-templates.service.js';
import { ACCOMMODATION_IMAGES, renderAccommodationImageCarousel } from './accommodation.js';
import { refreshImagePickers, clearWallpaperSource } from './wallpaper-import.js';
import { setColorsFromValues } from './customization.js';
import { reorganizeDestinationsCheckbox, updateActiveDestinationsHTMLs } from './destination.js';
import { expandDestinationFoldersWithSelection } from '../new-trip.js';
import { syncAccommodationItinerary } from './itinerary-module/inner-itinerary/auto-populate.js';

type PickerMode = 'trip' | 'accommodation';

let PICKER_MODE: PickerMode = 'trip';
let PICKER_TARGET_INDEX = 0;
let PICKER_SELECTED_ID = '';
let PICKER_SHOW_ALL = false;
let PICKER_QUERY = '';

function escapeHTML(value: any): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ── Buttons visibility ──

/**
 * Show the "apply template" button in the basic-information tab and the
 * per-row accommodation template buttons only when templates exist.
 */
export function refreshTemplateButtons(): void {
	const box = getID('trip-template-box');
	if (box) box.style.display = getTripSkeletonTemplates().length ? 'block' : 'none';

	const hasAccommodationTemplates = getAccommodationTemplates().length > 0;
	for (const childId of getChildIDs('accommodations-box')) {
		const button = getID(`accommodation-template-button-${getJ(childId)}`);
		if (button) button.style.display = hasAccommodationTemplates ? '' : 'none';
	}
}

// ── Picker dialog ──

/** Open the trip-skeleton picker (basic information tab). */
export function openTripTemplatePicker(): void {
	openTemplatePicker('trip', 0);
}

/** Open the accommodation template picker for stay row `index`. */
export function openAccommodationTemplatePicker(index: number): void {
	if (!index) return;
	openTemplatePicker('accommodation', index);
}

function openTemplatePicker(mode: PickerMode, index: number): void {
	PICKER_MODE = mode;
	PICKER_TARGET_INDEX = index;
	PICKER_SELECTED_ID = '';
	PICKER_SHOW_ALL = false;
	PICKER_QUERY = '';

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title =
		mode === 'accommodation'
			? translate('trip.template.accommodation_picker_title')
			: translate('trip.template.picker_title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getPickerContent();
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: () => applySelectedTemplate(), label: 'labels.confirm' },
	];

	displayFullMessage(properties);
	(getID('message-confirm') as HTMLButtonElement).disabled = true;

	bindPickerListeners();
	renderPickerList();
}

function getPickerContent(): string {
	return `
		<div class="wallpaper-import-search-bar">
			<div class="search-bar">
				<i class="iconify search-icon" data-icon="material-symbols:search"></i>
				<input type="text" id="template-picker-search" class="search-input"
					placeholder="${escapeHTML(translate('trip.template.search_placeholder'))}" />
				<button class="search-clear" id="template-picker-search-clear" style="display:none"
					aria-label="${escapeHTML(translate('labels.search'))}">
					<i class="iconify" data-icon="material-symbols:close"></i>
				</button>
			</div>
		</div>
		<div class="nice-form-group template-picker-show-all">
			<input type="checkbox" id="template-picker-show-all" class="switch">
			<label for="template-picker-show-all">${escapeHTML(translate('trip.template.show_all'))}</label>
		</div>
		<div class="wallpaper-import-scroll" id="template-picker-list"></div>`;
}

function bindPickerListeners(): void {
	const search = getID('template-picker-search') as HTMLInputElement | null;
	const clear = getID('template-picker-search-clear');
	if (search) {
		search.addEventListener('input', () => {
			PICKER_QUERY = search.value;
			if (clear) clear.style.display = search.value ? 'flex' : 'none';
			renderPickerList();
		});
	}
	if (clear) {
		clear.addEventListener('click', () => {
			if (!search) return;
			search.value = '';
			PICKER_QUERY = '';
			clear.style.display = 'none';
			renderPickerList();
		});
	}

	getID('template-picker-show-all')?.addEventListener('change', () => {
		const checkbox = getID('template-picker-show-all') as HTMLInputElement | null;
		PICKER_SHOW_ALL = checkbox?.checked === true;
		renderPickerList();
	});

	getID('template-picker-list')?.addEventListener('click', (event) => {
		const card = (event.target as Element)?.closest<HTMLElement>('[data-template-id]');
		const id = card?.getAttribute('data-template-id') || '';
		if (!card || !id) return;

		PICKER_SELECTED_ID = id;
		getID('template-picker-list')
			?.querySelectorAll('.wallpaper-import-card')
			.forEach((item) => item.classList.toggle('selected', item === card));

		const confirm = getID('message-confirm') as HTMLButtonElement | null;
		if (confirm) confirm.disabled = false;
	});
}

/** Templates that pass the destination filter + search query. */
function getVisibleTemplates(): TripTemplate[] {
	const all: TripTemplate[] =
		PICKER_MODE === 'accommodation' ? getAccommodationTemplates() : getTripSkeletonTemplates();
	const linked = getLinkedDestinationIds();

	// With a destination linked, only that destination's templates are offered
	// unless the user asks for all of them.
	const byDestination =
		PICKER_SHOW_ALL || !linked.length
			? all
			: filterTemplatesByDestinations(all, linked);

	const query = PICKER_QUERY.trim().toLowerCase();
	if (!query) return byDestination;

	return byDestination.filter((template) => {
		const accommodationName =
			template.type === 'accommodation' ? template.accommodation.name : '';
		const destinationTitles = template.destinationIds
			.map((destinationId) => getDestinationTitle(destinationId))
			.join(' ');
		const haystack = [template.name, accommodationName, destinationTitles]
			.join(' ')
			.toLowerCase();
		return haystack.includes(query);
	});
}

function renderPickerList(): void {
	const list = getID('template-picker-list');
	if (!list) return;

	const templates = getVisibleTemplates();
	if (!templates.length) {
		list.innerHTML = `<div class="wallpaper-import-empty">${escapeHTML(
			translate(
				PICKER_MODE === 'accommodation'
					? 'trip.template.empty_accommodation'
					: 'trip.template.empty',
			),
		)}</div>`;
		return;
	}

	// Group by destination so templates from different cities never mix.
	const linked = getLinkedDestinationIds();
	const groups = new Map<string, TripTemplate[]>();
	for (const template of templates) {
		const key = getTemplateGroupDestinationId(template, linked);
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(template);
	}

	const ordered = [...groups.entries()].sort((a, b) =>
		getDestinationTitle(a[0]).localeCompare(getDestinationTitle(b[0])),
	);

	list.innerHTML = ordered
		.map(
			([destinationId, items]) => `
			<p class="wallpaper-import-subgroup-title">${escapeHTML(
				getDestinationTitle(destinationId) || translate('trip.template.no_destination'),
			)}</p>
			<div class="wallpaper-import-group-grid">
				${items.map((template) => getTemplateCard(template)).join('')}
			</div>`,
		)
		.join('');
}

function getTemplateCard(template: TripTemplate): string {
	const image =
		template.type === 'accommodation'
			? template.accommodation.images?.[0]?.link || ''
			: template.image.active
				? template.image.background || ''
				: '';

	const thumb = image
		? `<div class="wallpaper-import-thumb" style="background-image: url('${escapeHTML(image)}')"></div>`
		: `<div class="wallpaper-import-thumb no-image"><i class="iconify image-picker-icon" data-icon="${
				template.type === 'accommodation'
					? 'material-symbols:hotel-outline'
					: 'material-symbols:content-copy'
			}"></i></div>`;

	return `
		<button type="button" class="wallpaper-import-card" data-template-id="${escapeHTML(template.id)}">
			${thumb}
			<div class="wallpaper-import-name">${escapeHTML(template.name)}</div>
		</button>`;
}

// ── Apply ──

function applySelectedTemplate(): void {
	const all: TripTemplate[] =
		PICKER_MODE === 'accommodation' ? getAccommodationTemplates() : getTripSkeletonTemplates();
	const template = all.find((item) => item.id === PICKER_SELECTED_ID);
	if (!template) return;

	if (template.type === 'accommodation') {
		applyAccommodationTemplate(template, PICKER_TARGET_INDEX);
	} else {
		void applyTripSkeleton(template);
	}

	closeMessage();
}

/** Copy the skeleton values into the customization fields + link the destination. */
async function applyTripSkeleton(template: TripSkeletonTemplate): Promise<void> {
	// Theme / visibility first — the logo cards render per theme mode.
	const themeEnabled = getID('theme-enabled') as HTMLInputElement | null;
	const forced = !template.visibility.light || !template.visibility.dark;
	if (themeEnabled) {
		themeEnabled.checked = forced;
		const content = getID('theme-enabled-content');
		if (content) content.style.display = forced ? 'block' : 'none';

		const radioId = !forced
			? 'theme-mode-dynamic'
			: template.visibility.light
				? 'theme-mode-light'
				: 'theme-mode-dark';
		const radio = getID(radioId) as HTMLInputElement | null;
		if (radio) radio.checked = true;
	}

	// Colors
	const colorsEnabled = getID('colors-enabled') as HTMLInputElement | null;
	if (colorsEnabled) {
		colorsEnabled.checked = template.colors.active;
		const content = getID('colors-enabled-content');
		if (content) content.style.display = template.colors.active ? 'block' : 'none';
	}
	if (template.colors.light && template.colors.dark) {
		setColorsFromValues(template.colors.light, template.colors.dark);
	}

	// Background + logos
	const imagesEnabled = getID('images-enabled') as HTMLInputElement | null;
	if (imagesEnabled) {
		imagesEnabled.checked = template.image.active;
		const content = getID('images-enabled-content');
		if (content) content.style.display = template.image.active ? 'block' : 'none';
	}
	const background = getID('link-background') as HTMLInputElement | null;
	if (background) background.value = template.image.background || '';
	const logoLight = getID('link-logo-light') as HTMLInputElement | null;
	if (logoLight) logoLight.value = template.image.light || '';
	const logoDark = getID('link-logo-dark') as HTMLInputElement | null;
	if (logoDark) logoDark.value = template.image.dark || '';
	// The template's image is not an import from a trip image group.
	clearWallpaperSource();
	refreshImagePickers();

	// The template's destinations become linked destinations of this trip.
	for (const destinationId of template.destinationIds) {
		await ensureDestinationLinked(destinationId);
	}

	// Selecting a destination card is not a tracked form field, so a template
	// that only changes the linked destination would otherwise be reported as
	// "no new data" on save.
	markStagedChanges();
}

/** Copy the stay's reusable fields into row `index` (never its dates/booking data). */
function applyAccommodationTemplate(template: AccommodationTemplate, index: number): void {
	const data = template.accommodation;

	const nameInput = getID(`accommodations-name-${index}`) as HTMLInputElement | null;
	if (nameInput) nameInput.value = data.name || '';
	const title = getID(`accommodations-title-${index}`);
	if (title) {
		title.innerText = data.name || translate('trip.accommodation.accommodation');
	}

	const address = getID(`accommodations-address-${index}`) as HTMLInputElement | null;
	if (address) address.value = data.address || '';
	const description = getID(`accommodations-description-${index}`) as HTMLInputElement | null;
	if (description) description.value = data.description || '';

	const checkIn = getID(`check-in-time-${index}`) as HTMLInputElement | null;
	if (checkIn && data.times.checkIn) checkIn.value = data.times.checkIn;
	const checkOut = getID(`check-out-time-${index}`) as HTMLInputElement | null;
	if (checkOut && data.times.checkOut) checkOut.value = data.times.checkOut;

	ACCOMMODATION_IMAGES[index] = cloneObject(data.images || []);
	renderAccommodationImageCarousel(index);
	markStagedChanges();
	syncAccommodationItinerary(index);
}

// ── Destination linking ──

/** Destination ids currently linked to this trip (selected picker cards). */
function getLinkedDestinationIds(): string[] {
	const ids: string[] = [];
	const container = getID('destinations-checkboxes');
	if (!container) return ids;

	for (const card of container.querySelectorAll('.destination-card.selected')) {
		const id = card.getAttribute('data-destination-id');
		if (id && !ids.includes(id)) ids.push(id);
	}
	return ids;
}

/**
 * Link a destination to the trip, enabling the destinations module when it is
 * disabled. Returns false when the destination is no longer selectable (its
 * document may have been deleted since the template was registered).
 */
async function ensureDestinationLinked(destinationId: string): Promise<boolean> {
	if (!destinationId) return false;

	const container = getID('destinations-checkboxes');
	const card = container?.querySelector<HTMLElement>(
		`.destination-card[data-destination-id="${destinationId}"]`,
	);
	if (!card) return false;

	const enabled = getID('destinations-enabled') as HTMLInputElement | null;
	if (enabled && !enabled.checked) {
		enabled.checked = true;
		const content = getID('destinations-enabled-content');
		if (content) content.style.display = 'flex';
		const empty = getID('no-destinations');
		if (empty) empty.style.display = 'none';
		const hasDestinations = getID('has-destinations');
		if (hasDestinations) hasDestinations.style.display = 'flex';
	}

	if (!card.classList.contains('selected')) {
		card.classList.add('selected');
		card.parentElement?.prepend(card);
	}

	reorganizeDestinationsCheckbox();
	expandDestinationFoldersWithSelection();
	await updateActiveDestinationsHTMLs();
	return true;
}

function getDestinationTitle(destinationId: string): string {
	if (!destinationId) return '';
	const destination = (DESTINATIONS || []).find((item) => item.id === destinationId);
	if (destination?.title) return destination.title;

	const card = getID('destinations-checkboxes')?.querySelector(
		`.destination-card[data-destination-id="${destinationId}"] .destination-card-name`,
	);
	return card?.textContent?.trim() || '';
}

/**
 * Destination that groups a template in the picker. Prefers a destination
 * already linked to the trip, then the template's first destination.
 */
function getTemplateGroupDestinationId(template: TripTemplate, linked: string[]): string {
	return (
		template.destinationIds.find((destinationId) => linked.includes(destinationId)) ||
		template.destinationIds[0] ||
		''
	);
}
