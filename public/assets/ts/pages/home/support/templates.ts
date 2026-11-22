// ======= Templates Manager (Settings) =======
//
// Account-level registry of trip / accommodation templates. Templates are
// created here from an existing trip (trip skeleton) or from a stay of an
// existing trip (accommodation), always associated with one or more
// destinations. The trip editor only applies them — it never registers new
// ones.

import { cloneObject, getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../../../utils/messages.js';
import { convertFromDateObject, getTimeStringFromDate } from '../../../utils/dates.js';
import { getUserDestinations, getUserTrips } from '../../../data/services/auth.service.js';
import { getTripAccommodations, getTripRaw } from '../../../data/services/trip.service.js';
import {
	getCachedDestinationFolders,
	groupDestinationsByFolder,
} from '../../../data/services/destination-folders.service.js';
import {
	createTripTemplateId,
	getAccommodationTemplates,
	getCachedTripTemplates,
	getTripSkeletonTemplates,
	saveTripTemplates,
	type AccommodationTemplate,
	type TripSkeletonTemplate,
	type TripTemplate,
	type TripTemplatePhoto,
} from '../../../data/services/trip-templates.service.js';

function escapeHTML(value: any): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

interface DestinationOption {
	id: string;
	title: string;
	image: string;
}

/** Working copy edited by the manager — persisted only on Confirm. */
let DRAFT_TEMPLATES: TripTemplate[] = [];
let DESTINATIONS: DestinationOption[] = [];
let SOURCE_TRIPS: Record<string, any>[] = [];

/** Create flow state (kept across the creator sub-dialog). */
let CREATOR_TYPE: 'trip' | 'accommodation' = 'trip';
let CREATOR_ACCOMMODATIONS: Record<string, any>[] = [];
let CREATOR_TRIP_ID = '';
let CREATOR_DESTINATION_IDS = new Set<string>();
let CREATOR_DESTINATION_QUERY = '';

interface ActiveTemplateCombo {
	combo: HTMLElement;
	input: HTMLInputElement;
	menu: HTMLElement;
}

let ACTIVE_TEMPLATE_COMBO: ActiveTemplateCombo | null = null;
let TEMPLATE_COMBO_LISTENERS_BOUND = false;

// ── Settings tab preview ──

/** Refresh the read-only preview strip in the Settings tab. */
export function loadSettingsTemplates(): void {
	const preview = getID('settings-templates-preview');
	const empty = getID('settings-templates-empty');
	if (!preview) return;

	const templates = getCachedTripTemplates();
	const tripCount = getTripSkeletonTemplates().length;
	const accommodationCount = getAccommodationTemplates().length;

	preview.innerHTML = templates.length
		? `<span class="template-chip">
				<i class="iconify" data-icon="material-symbols:image-outline"></i>
				${translate('account.templates.trip_count', { count: tripCount })}
			</span>
			<span class="template-chip">
				<i class="iconify" data-icon="material-symbols:hotel-outline"></i>
				${translate('account.templates.accommodation_count', { count: accommodationCount })}
			</span>`
		: '';

	if (empty) empty.style.display = templates.length ? 'none' : 'block';
}

// ── Manager dialog ──

/** Open the fullscreen templates manager dialog. */
export async function openTemplatesManager(): Promise<void> {
	try {
		DESTINATIONS = await loadDestinationOptions();
		SOURCE_TRIPS = await loadSourceTrips();
		DRAFT_TEMPLATES = cloneObject(getCachedTripTemplates());
		renderTemplatesManager();
	} catch (error) {
		displayError(error);
	}
}

function renderTemplatesManager(): void {
	closeActiveTemplateCombo();

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.templates.manager_title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = getTemplatesManagerContent();
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: () => saveTemplatesManager() },
	];

	displayFullMessage(properties);
	bindTemplatesManagerListeners();
}

function getTemplatesManagerContent(): string {
	const tripTemplates = DRAFT_TEMPLATES.filter((t) => t.type === 'trip');
	const accommodationTemplates = DRAFT_TEMPLATES.filter((t) => t.type === 'accommodation');

	return `
		<div class="templates-manager" id="templates-manager">
			<div class="templates-manager-grid">
				${getTemplatePanelHTML('trip', tripTemplates)}
				${getTemplatePanelHTML('accommodation', accommodationTemplates)}
			</div>

			<p class="templates-manager-hint">
				<i class="iconify" data-icon="material-symbols:info"></i>
				<span>${escapeHTML(translate('account.templates.hint'))}</span>
			</p>

			<div class="nice-form-group templates-manager-error" id="templates-manager-error" style="display: none">
				<span class="red" id="templates-manager-error-text"></span>
			</div>
		</div>`;
}

function getTemplatePanelHTML(
	type: 'trip' | 'accommodation',
	templates: TripTemplate[],
): string {
	const isTrip = type === 'trip';
	const icon = isTrip ? 'material-symbols:image-outline' : 'material-symbols:hotel-outline';
	const title = translate(
		isTrip ? 'account.templates.trip_section' : 'account.templates.accommodation_section',
	);
	const addLabel = translate(
		isTrip ? 'account.templates.add_trip' : 'account.templates.add_accommodation',
	);

	return `
		<section class="templates-panel templates-panel-${type}">
			<header class="templates-panel-header">
				<span class="templates-panel-icon">
					<i class="iconify" data-icon="${icon}"></i>
				</span>
				<h4 class="templates-panel-title">${escapeHTML(title)}</h4>
				${templates.length ? `<span class="templates-panel-count">${templates.length}</span>` : ''}
			</header>
			<div class="templates-panel-list" id="templates-${type}-list">
				${templates.map((template) => getTemplateRowHTML(template)).join('')}
			</div>
			<button type="button" class="templates-add" id="templates-${type}-add">
				<i class="iconify" data-icon="material-symbols:add"></i>
				<span>${escapeHTML(addLabel)}</span>
			</button>
		</section>`;
}

function getTemplateRowHTML(template: TripTemplate): string {
	const destinationTitles = template.destinationIds
		.map(getDestinationTitle)
		.filter(Boolean)
		.join(', ');
	const subtitle =
		template.type === 'accommodation'
			? [template.accommodation.name, destinationTitles].filter(Boolean).join(' · ')
			: destinationTitles;

	return `
		<div class="templates-card" data-template-id="${escapeHTML(template.id)}">
			<span class="templates-card-icon">
				<i class="iconify" data-icon="${template.type === 'accommodation' ? 'material-symbols:hotel-outline' : 'material-symbols:image-outline'}"></i>
			</span>
			<div class="templates-card-text">
				<span class="templates-card-name">${escapeHTML(template.name)}</span>
				${subtitle ? `<span class="templates-card-meta">${escapeHTML(subtitle)}</span>` : ''}
			</div>
			<button type="button" class="people-editor-remove templates-manager-remove"
				aria-label="${escapeHTML(translate('labels.delete'))}" title="${escapeHTML(translate('labels.delete'))}">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path fill="currentColor" fill-rule="evenodd"
						d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z"
						clip-rule="evenodd"></path>
				</svg>
			</button>
		</div>`;
}

function bindTemplatesManagerListeners(): void {
	getID('templates-trip-add')?.addEventListener('click', () => openTemplateCreator('trip'));
	getID('templates-accommodation-add')?.addEventListener('click', () =>
		openTemplateCreator('accommodation'),
	);

	for (const list of [getID('templates-trip-list'), getID('templates-accommodation-list')]) {
		list?.addEventListener('click', (event) => {
			const button = (event.target as Element)?.closest<HTMLElement>('.templates-manager-remove');
			if (!button) return;
			const row = button.closest<HTMLElement>('.templates-card');
			const id = row?.dataset.templateId;
			if (!id) return;
			DRAFT_TEMPLATES = DRAFT_TEMPLATES.filter((template) => template.id !== id);
			renderTemplatesManager();
		});
	}
}

/** Persist the working copy and refresh the Settings preview. */
export async function saveTemplatesManager(): Promise<void> {
	try {
		const success = await saveTripTemplates(DRAFT_TEMPLATES);
		if (!success) {
			showManagerError(translate('account.templates.error_save'));
			return;
		}

		closeMessage();
		loadSettingsTemplates();
		openToast(translate('account.templates.saved'));
	} catch (error) {
		displayError(error);
	}
}

function showManagerError(message: string): void {
	const container = getID('templates-manager-error');
	const text = getID('templates-manager-error-text');
	if (text) text.textContent = message;
	if (container) container.style.display = 'block';
}

// ── Create flow ──

function openTemplateCreator(type: 'trip' | 'accommodation'): void {
	closeActiveTemplateCombo();

	CREATOR_TYPE = type;
	CREATOR_ACCOMMODATIONS = [];
	CREATOR_TRIP_ID = '';
	CREATOR_DESTINATION_IDS = new Set();
	CREATOR_DESTINATION_QUERY = '';

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title =
		type === 'accommodation'
			? translate('account.templates.add_accommodation')
			: translate('account.templates.add_trip');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	// Back arrow returns to the manager (discarding the creator).
	properties.icons = [{ type: 'goBack', action: () => renderTemplatesManager() }];
	properties.content = getTemplateCreatorContent(type);
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: () => applyTemplateCreator() },
	];

	displayFullMessage(properties);
	// The goBack icon is rendered hidden by default (shared #back-icon) — show
	// it so the user can return to the manager without losing the draft.
	const back = getID('back-icon');
	if (back) back.style.visibility = 'visible';
	bindTemplateCreatorListeners(type);
	refreshCreatorDestinations();
}

function getTemplateCreatorContent(type: 'trip' | 'accommodation'): string {
	const accommodationGroup =
		type === 'accommodation'
			? `<div class="templates-creator-group" id="templates-creator-accommodation-group">
					<label class="templates-creator-label">${escapeHTML(translate('account.templates.source_accommodation'))}</label>
					<select id="templates-creator-accommodation" class="templates-creator-select">
						<option value="">${escapeHTML(translate('account.templates.loading_accommodations'))}</option>
					</select>
				</div>`
			: '';

	const noTripsNote = SOURCE_TRIPS.length
		? ''
		: `<p class="templates-creator-note">${escapeHTML(
				translate(
					type === 'accommodation'
						? 'account.templates.no_source_trips_accommodation'
						: 'account.templates.no_source_trips',
				),
			)}</p>`;

	const noDestinationsNote = DESTINATIONS.length
		? ''
		: `<p class="templates-creator-note red">${escapeHTML(
				translate('account.templates.no_destinations'),
			)}</p>`;

	return `
		<div class="templates-creator" id="templates-creator">
			<div class="templates-creator-group">
				<label class="templates-creator-label">${escapeHTML(translate('account.templates.name'))}</label>
				<input type="text" id="templates-creator-name" class="templates-creator-input" maxlength="60"
					placeholder="${escapeHTML(translate('account.templates.name_placeholder'))}" />
			</div>

			<div class="templates-creator-group">
				<label class="templates-creator-label" for="templates-creator-trip-input">${escapeHTML(translate('account.templates.source_trip'))}</label>
				<div class="templates-combo" id="templates-trip-combo">
					<input type="text" id="templates-creator-trip-input"
						class="templates-creator-input templates-combo-input"
						placeholder="${escapeHTML(translate('account.templates.select_trip'))}"
						autocomplete="off" role="combobox" aria-expanded="false"
						aria-controls="templates-trip-options" aria-autocomplete="list"
						${SOURCE_TRIPS.length ? '' : 'disabled'} />
					<div class="templates-combo-menu" id="templates-trip-options" role="listbox" hidden></div>
				</div>
				${noTripsNote}
			</div>

			${accommodationGroup}

			<div class="templates-creator-group">
				<label class="templates-creator-label" for="templates-creator-destination-input">${escapeHTML(translate('account.templates.destination'))}</label>
				${
					DESTINATIONS.length
						? `<div class="templates-combo templates-combo-multi" id="templates-destination-combo">
							<div class="templates-combo-field" id="templates-destination-field">
								<div class="templates-combo-chips" id="templates-destination-chips"></div>
								<input type="text" id="templates-creator-destination-input"
									class="templates-combo-typing"
									placeholder="${escapeHTML(translate('account.templates.search_destinations'))}"
									autocomplete="off" role="combobox" aria-expanded="false"
									aria-controls="templates-destination-options" aria-autocomplete="list" />
							</div>
							<div class="templates-combo-menu" id="templates-destination-options" role="listbox" hidden></div>
						</div>
						<p class="templates-creator-note" id="templates-creator-destination-status" style="display: none"></p>`
						: ''
				}
				${noDestinationsNote}
			</div>

			<div class="templates-creator-group templates-manager-error" id="templates-creator-error" style="display: none">
				<span class="red" id="templates-creator-error-text"></span>
			</div>
		</div>`;
}

function getSourceTripsForType(type: 'trip' | 'accommodation'): Record<string, any>[] {
	return SOURCE_TRIPS.filter((trip) =>
		type === 'accommodation' ? trip.modules?.accommodations === true : true,
	);
}

/** Case- and accent-insensitive text used by the autocomplete filters. */
function normalizeSearch(value: any): string {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function filterByTitle<T extends Record<string, any>>(items: T[], query: string): T[] {
	const term = normalizeSearch(query);
	if (!term) return items;
	return items.filter((item) => normalizeSearch(item.title).includes(term));
}

function getSelectedTripTitle(): string {
	const trip = SOURCE_TRIPS.find((item) => item.id === CREATOR_TRIP_ID);
	return String(trip?.title || '');
}

function bindTemplateCreatorListeners(type: 'trip' | 'accommodation'): void {
	const tripInput = getID('templates-creator-trip-input') as HTMLInputElement | null;
	const tripCombo = getID('templates-trip-combo');
	const tripMenu = getID('templates-trip-options');

	tripInput?.addEventListener('focus', () => {
		const query = tripInput.value === getSelectedTripTitle() ? '' : tripInput.value;
		renderTripOptions(type, query);
	});
	tripInput?.addEventListener('input', () => {
		hideCreatorError();
		if (tripInput.value.trim() !== getSelectedTripTitle()) CREATOR_TRIP_ID = '';
		renderTripOptions(type, tripInput.value);
	});
	tripInput?.addEventListener('keydown', (event) => {
		handleComboKeydown(event, tripCombo, tripInput, tripMenu);
	});
	tripMenu?.addEventListener('mousedown', (event) => event.preventDefault());
	tripMenu?.addEventListener('click', (event) => {
		const option = (event.target as Element)?.closest<HTMLElement>('[data-trip-id]');
		if (!option?.dataset.tripId) return;
		selectCreatorTrip(type, option.dataset.tripId);
	});
	bindComboCloseOnBlur(tripCombo, tripInput, tripMenu);

	const destinationCombo = getID('templates-destination-combo');
	const destinationInput = getID('templates-creator-destination-input') as HTMLInputElement | null;
	const destinationMenu = getID('templates-destination-options');
	const destinationField = getID('templates-destination-field');
	const destinationChips = getID('templates-destination-chips');

	destinationField?.addEventListener('click', () => destinationInput?.focus());
	destinationInput?.addEventListener('focus', () => renderDestinationOptions());
	destinationInput?.addEventListener('input', () => {
		CREATOR_DESTINATION_QUERY = destinationInput.value;
		hideCreatorError();
		renderDestinationOptions();
	});
	destinationInput?.addEventListener('keydown', (event) => {
		handleComboKeydown(event, destinationCombo, destinationInput, destinationMenu);
	});
	destinationMenu?.addEventListener('mousedown', (event) => event.preventDefault());
	destinationMenu?.addEventListener('click', (event) => {
		const option = (event.target as Element)?.closest<HTMLElement>('[data-destination-id]');
		if (!option?.dataset.destinationId) return;
		toggleCreatorDestination(option.dataset.destinationId);
	});
	bindComboCloseOnBlur(destinationCombo, destinationInput, destinationMenu);

	destinationChips?.addEventListener('click', (event) => {
		const button = (event.target as Element)?.closest<HTMLElement>(
			'[data-remove-destination-id]',
		);
		if (!button?.dataset.removeDestinationId) return;
		CREATOR_DESTINATION_IDS.delete(button.dataset.removeDestinationId);
		refreshCreatorDestinations();
		destinationInput?.focus();
	});

	if (type === 'accommodation') {
		getID('templates-creator-accommodation')?.addEventListener('change', () => {
			hideCreatorError();
			const select = getID('templates-creator-accommodation') as HTMLSelectElement;
			const accommodation = CREATOR_ACCOMMODATIONS.find((item) => item.id === select.value);
			const nameInput = getID('templates-creator-name') as HTMLInputElement | null;
			if (nameInput && !nameInput.value.trim() && accommodation?.name) {
				nameInput.value = accommodation.name;
			}
		});
	}

	if (type === 'accommodation' && CREATOR_TRIP_ID) {
		void loadCreatorAccommodations(CREATOR_TRIP_ID);
	}
}

function selectCreatorTrip(type: 'trip' | 'accommodation', tripId: string): void {
	const trip = SOURCE_TRIPS.find((item) => item.id === tripId);
	if (!trip) return;

	CREATOR_TRIP_ID = tripId;
	hideCreatorError();

	const tripInput = getID('templates-creator-trip-input') as HTMLInputElement | null;
	if (tripInput) tripInput.value = String(trip.title || '');
	const nameInput = getID('templates-creator-name') as HTMLInputElement | null;
	if (nameInput && !nameInput.value.trim()) nameInput.value = String(trip.title || '');

	closeTemplateCombo(getID('templates-trip-combo'), tripInput, getID('templates-trip-options'));

	// The destinations linked to the base trip become the template's
	// destinations automatically (the user can still adjust the list). Clear
	// any previous search so the selected chips are visible.
	CREATOR_DESTINATION_QUERY = '';
	const destinationInput = getID('templates-creator-destination-input') as HTMLInputElement | null;
	if (destinationInput) destinationInput.value = '';
	void loadCreatorDestinations(tripId);

	if (type === 'accommodation') void loadCreatorAccommodations(tripId);
}

function renderTripOptions(type: 'trip' | 'accommodation', query: string): void {
	const menu = getID('templates-trip-options');
	if (!menu) return;

	const trips = filterByTitle(getSourceTripsForType(type), query);
	menu.innerHTML = trips.length
		? trips
				.map(
					(trip) => `
					<button type="button" class="templates-combo-option${
						trip.id === CREATOR_TRIP_ID ? ' selected' : ''
					}" role="option" aria-selected="${trip.id === CREATOR_TRIP_ID}" data-trip-id="${escapeHTML(trip.id)}">
						<i class="iconify" data-icon="material-symbols:calendar-month"></i>
						<span class="templates-combo-option-text">${escapeHTML(
							trip.title || translate('labels.no_title'),
						)}</span>
						<i class="iconify templates-combo-option-check" data-icon="material-symbols:check"></i>
					</button>`,
				)
				.join('')
		: `<div class="templates-combo-empty">${escapeHTML(
				translate('account.templates.no_trip_matches'),
			)}</div>`;

	openTemplateCombo(
		getID('templates-trip-combo'),
		getID('templates-creator-trip-input') as HTMLInputElement | null,
		menu,
	);
}

function renderDestinationOptions(): void {
	const menu = getID('templates-destination-options');
	if (!menu) return;

	const matches = filterByTitle(DESTINATIONS, CREATOR_DESTINATION_QUERY);
	if (!matches.length) {
		menu.innerHTML = `<div class="templates-combo-empty">${escapeHTML(
			translate('account.templates.no_destination_matches'),
		)}</div>`;
	} else {
		const { groups, loose } = groupDestinationsByFolder(
			matches,
			getCachedDestinationFolders(),
		);
		const visibleGroups = groups.filter((group) => group.items.length > 0);

		let html = '';
		for (const { folder, items } of visibleGroups) {
			html += `<div class="templates-combo-group">
				<i class="iconify" data-icon="material-symbols:folder"></i>
				<span>${escapeHTML(folder.name)}</span>
			</div>`;
			html += items.map(getDestinationOptionHTML).join('');
		}
		if (visibleGroups.length && loose.length) {
			html += `<div class="templates-combo-group">
				<i class="iconify" data-icon="material-symbols:label"></i>
				<span>${escapeHTML(translate('index.folders.loose'))}</span>
			</div>`;
		}
		html += loose.map(getDestinationOptionHTML).join('');
		menu.innerHTML = html;
	}

	openTemplateCombo(
		getID('templates-destination-combo'),
		getID('templates-creator-destination-input') as HTMLInputElement | null,
		menu,
	);
}

function getDestinationOptionHTML(destination: DestinationOption): string {
	const selected = CREATOR_DESTINATION_IDS.has(destination.id);
	return `
		<button type="button" class="templates-combo-option${selected ? ' selected' : ''}"
			role="option" aria-selected="${selected}" data-destination-id="${escapeHTML(destination.id)}">
			<span class="templates-combo-thumb"${
				destination.image
					? ` style="background-image: url('${escapeHTML(destination.image)}')"`
					: ''
			}>${
				destination.image
					? ''
					: '<i class="iconify" data-icon="material-symbols:location-on"></i>'
			}</span>
			<span class="templates-combo-option-text">${escapeHTML(destination.title || destination.id)}</span>
			<i class="iconify templates-combo-option-check" data-icon="material-symbols:check"></i>
		</button>`;
}

function toggleCreatorDestination(destinationId: string): void {
	if (CREATOR_DESTINATION_IDS.has(destinationId)) {
		CREATOR_DESTINATION_IDS.delete(destinationId);
	} else {
		CREATOR_DESTINATION_IDS.add(destinationId);
	}
	hideCreatorError();

	const input = getID('templates-creator-destination-input') as HTMLInputElement | null;
	CREATOR_DESTINATION_QUERY = '';
	if (input) {
		input.value = '';
		input.focus();
	}
	refreshCreatorDestinations();
}

function refreshCreatorDestinations(): void {
	renderCreatorDestinationChips();
	const menu = getID('templates-destination-options');
	if (menu && !menu.hidden) renderDestinationOptions();
}

function renderCreatorDestinationChips(): void {
	const container = getID('templates-destination-chips');
	if (!container) return;

	const ids = getSelectedDestinationIds();
	container.innerHTML = ids
		.map((id) => {
			const title = getDestinationTitle(id) || id;
			return `<span class="templates-dest-pill">
				<span class="templates-dest-pill-label">${escapeHTML(title)}</span>
				<button type="button" class="templates-dest-pill-remove" data-remove-destination-id="${escapeHTML(id)}"
					aria-label="${escapeHTML(translate('labels.delete'))}" title="${escapeHTML(translate('labels.delete'))}">
					<i class="iconify" data-icon="material-symbols:close"></i>
				</button>
			</span>`;
		})
		.join('');

	const input = getID('templates-creator-destination-input') as HTMLInputElement | null;
	if (input) {
		input.placeholder = ids.length ? '' : translate('account.templates.search_destinations');
	}
}

function openTemplateCombo(
	combo: HTMLElement | null,
	input: HTMLInputElement | null,
	menu: HTMLElement | null,
): void {
	if (!combo || !input || !menu) return;

	if (ACTIVE_TEMPLATE_COMBO && ACTIVE_TEMPLATE_COMBO.menu !== menu) {
		closeActiveTemplateCombo();
	}

	// The dialog is itself a scroll container, so an in-flow absolute menu gets
	// clipped by it ("contained in the box"). Move the menu to <body> and use a
	// fixed layer over the viewport instead.
	if (menu.parentElement !== document.body) document.body.appendChild(menu);

	menu.hidden = false;
	combo.classList.add('open');
	input.setAttribute('aria-expanded', 'true');
	ACTIVE_TEMPLATE_COMBO = { combo, input, menu };

	positionTemplateComboMenu();
	ensureTemplateComboListeners();
}

/** Anchor the floating menu to the field, flipping up when space runs out. */
function positionTemplateComboMenu(): void {
	const active = ACTIVE_TEMPLATE_COMBO;
	if (!active || active.menu.hidden) return;

	const { combo, menu } = active;
	const anchor = combo.getBoundingClientRect();
	const margin = 12;
	const gap = 4;
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	const width = Math.max(140, Math.min(anchor.width, viewportWidth - margin * 2));
	const left = Math.max(margin, Math.min(anchor.left, viewportWidth - width - margin));

	const spaceBelow = viewportHeight - anchor.bottom - gap - margin;
	const spaceAbove = anchor.top - gap - margin;
	const dropUp = spaceBelow < 140 && spaceAbove > spaceBelow;
	const available = Math.max(120, dropUp ? spaceAbove : spaceBelow);

	menu.style.position = 'fixed';
	menu.style.left = `${left}px`;
	menu.style.width = `${width}px`;
	menu.style.maxHeight = `${Math.min(320, available)}px`;

	if (dropUp) {
		menu.style.top = 'auto';
		menu.style.bottom = `${viewportHeight - anchor.top + gap}px`;
	} else {
		menu.style.top = `${anchor.bottom + gap}px`;
		menu.style.bottom = 'auto';
	}
}

function closeTemplateCombo(
	combo: HTMLElement | null,
	input: HTMLInputElement | null,
	menu: HTMLElement | null,
): void {
	if (!combo || !menu) return;
	menu.hidden = true;
	combo.classList.remove('open');
	input?.setAttribute('aria-expanded', 'false');
	menu.removeAttribute('style');
	// Put the menu back inside the field wrapper for the next render pass.
	combo.appendChild(menu);
	if (ACTIVE_TEMPLATE_COMBO?.menu === menu) ACTIVE_TEMPLATE_COMBO = null;
}

function closeActiveTemplateCombo(): void {
	const active = ACTIVE_TEMPLATE_COMBO;
	if (!active) return;
	closeTemplateCombo(active.combo, active.input, active.menu);
}

function ensureTemplateComboListeners(): void {
	if (TEMPLATE_COMBO_LISTENERS_BOUND) return;
	TEMPLATE_COMBO_LISTENERS_BOUND = true;
	window.addEventListener('resize', positionTemplateComboMenu);
	// Capture scrolls from the dialog as well, keeping the menu anchored.
	window.addEventListener('scroll', positionTemplateComboMenu, true);
}

function bindComboCloseOnBlur(
	combo: HTMLElement | null,
	input: HTMLInputElement | null,
	menu: HTMLElement | null,
): void {
	combo?.addEventListener('focusout', () => {
		window.setTimeout(() => {
			const active = document.activeElement;
			const focusInCombo = combo.contains(active);
			const focusInMenu = Boolean(menu && menu.contains(active));
			if (!focusInCombo && !focusInMenu) closeTemplateCombo(combo, input, menu);
		}, 0);
	});
}

/** Arrow/Enter/Escape navigation shared by both autocomplete menus. */
function handleComboKeydown(
	event: KeyboardEvent,
	combo: HTMLElement | null,
	input: HTMLInputElement | null,
	menu: HTMLElement | null,
): void {
	if (!menu || menu.hidden) return;
	const options = Array.from(menu.querySelectorAll<HTMLElement>('.templates-combo-option'));
	if (!options.length) return;

	let index = options.findIndex((option) => option.classList.contains('is-active'));

	if (event.key === 'ArrowDown') {
		event.preventDefault();
		index = index < 0 ? 0 : (index + 1) % options.length;
	} else if (event.key === 'ArrowUp') {
		event.preventDefault();
		index = index <= 0 ? options.length - 1 : index - 1;
	} else if (event.key === 'Enter') {
		event.preventDefault();
		options[Math.max(0, index)]?.click();
		return;
	} else if (event.key === 'Escape') {
		event.preventDefault();
		closeTemplateCombo(combo, input, menu);
		return;
	} else {
		return;
	}

	options.forEach((option, optionIndex) =>
		option.classList.toggle('is-active', optionIndex === index),
	);
	options[index]?.scrollIntoView({ block: 'nearest' });
}

/**
 * Select the destinations linked to the chosen base trip. The trip summaries
 * used by the select do not carry destination refs, so the full trip document
 * is read once per selection.
 */
async function loadCreatorDestinations(tripId: string): Promise<void> {
	const chips = getID('templates-destination-chips');
	if (!chips) return;

	if (!tripId) {
		CREATOR_DESTINATION_IDS = new Set();
		setCreatorDestinationStatus('');
		refreshCreatorDestinations();
		return;
	}

	setCreatorDestinationStatus(translate('account.templates.loading_trip_destinations'));

	let linked: string[] = [];
	try {
		const trip = await getTripRaw(tripId);
		linked = getTripDestinationIds(trip).filter((id) => Boolean(getDestinationTitle(id)));
	} catch (error) {
		console.warn('Could not load the source trip destinations:', error);
		linked = [];
	}

	// A slower request must never overwrite the destinations of a trip picked
	// later.
	if (CREATOR_TRIP_ID !== tripId) return;

	// Keep a manual selection when the base trip links no usable destination.
	if (linked.length) CREATOR_DESTINATION_IDS = new Set(linked);

	setCreatorDestinationStatus(
		linked.length ? '' : translate('account.templates.trip_has_no_destinations'),
	);
	refreshCreatorDestinations();
}

/** Checked destination ids, in the alphabetical order of the account list. */
function getSelectedDestinationIds(): string[] {
	return DESTINATIONS.map((destination) => destination.id).filter((id) =>
		CREATOR_DESTINATION_IDS.has(id),
	);
}

function setCreatorDestinationStatus(message: string): void {
	const status = getID('templates-creator-destination-status');
	if (!status) return;
	status.textContent = message;
	status.style.display = message ? 'block' : 'none';
}

async function loadCreatorAccommodations(tripId: string): Promise<void> {
	const select = getID('templates-creator-accommodation') as HTMLSelectElement | null;
	if (!select) return;

	CREATOR_ACCOMMODATIONS = [];
	select.innerHTML = `<option value="">${escapeHTML(translate('account.templates.select_accommodation'))}</option>`;

	if (!tripId) return;

	let accommodations: Record<string, any>[] = [];
	try {
		const trip = await getTripRaw(tripId);
		const rows = await getTripAccommodations(tripId);
		accommodations = rows.length ? rows : trip?.accommodations || [];
	} catch (error) {
		console.warn('Could not load the source trip accommodations:', error);
		accommodations = [];
	}

	const currentTripId = CREATOR_TRIP_ID;
	if (currentTripId !== tripId) return;

	CREATOR_ACCOMMODATIONS = accommodations;

	if (!CREATOR_ACCOMMODATIONS.length) {
		select.innerHTML = `<option value="">${escapeHTML(translate('account.templates.no_accommodations'))}</option>`;
		return;
	}

	select.innerHTML = [
		`<option value="">${escapeHTML(translate('account.templates.select_accommodation'))}</option>`,
		...CREATOR_ACCOMMODATIONS.map(
			(accommodation) =>
				`<option value="${escapeHTML(accommodation.id)}">${escapeHTML(
					accommodation.name || translate('trip.accommodation.accommodation'),
				)}</option>`,
		),
	].join('');
}

async function applyTemplateCreator(): Promise<void> {
	const name = (getID('templates-creator-name') as HTMLInputElement)?.value.trim() || '';
	const typedTrip =
		(getID('templates-creator-trip-input') as HTMLInputElement)?.value.trim() || '';
	let tripId = CREATOR_TRIP_ID;
	if (!tripId && typedTrip) {
		// Accept an exact typed title as a selection when the user did not pick
		// an option from the autocomplete list.
		const exact = getSourceTripsForType(CREATOR_TYPE).find(
			(trip) => normalizeSearch(trip.title) === normalizeSearch(typedTrip),
		);
		if (exact) tripId = exact.id;
	}
	const destinationIds = getSelectedDestinationIds();
	const accommodationId =
		(getID('templates-creator-accommodation') as HTMLSelectElement)?.value || '';

	if (!name) return showCreatorError(translate('account.templates.error_name'));
	if (!tripId) return showCreatorError(translate('account.templates.error_trip'));
	if (!destinationIds.length) return showCreatorError(translate('account.templates.error_destination'));
	if (CREATOR_TYPE === 'accommodation' && !accommodationId) {
		return showCreatorError(translate('account.templates.error_accommodation'));
	}

	const template =
		CREATOR_TYPE === 'accommodation'
			? await buildAccommodationTemplate(name, tripId, destinationIds, accommodationId)
			: await buildTripSkeletonTemplate(name, tripId, destinationIds);

	if (!template) return showCreatorError(translate('account.templates.error_source'));

	DRAFT_TEMPLATES = [...DRAFT_TEMPLATES, template];
	renderTemplatesManager();
}

async function buildTripSkeletonTemplate(
	name: string,
	tripId: string,
	destinationIds: string[],
): Promise<TripSkeletonTemplate | null> {
	try {
		const trip = await getTripRaw(tripId);
		if (!trip) return null;

		return {
			id: createTripTemplateId('trip'),
			type: 'trip',
			name,
			destinationIds,
			sourceTripId: tripId,
			createdAt: new Date().toISOString(),
			colors: {
				active: trip.colors?.active === true,
				light: String(trip.colors?.light || ''),
				dark: String(trip.colors?.dark || ''),
			},
			image: {
				active: trip.image?.active === true,
				background: String(trip.image?.background || ''),
				light: String(trip.image?.light || ''),
				dark: String(trip.image?.dark || ''),
			},
			visibility: {
				light: trip.visibility?.light !== false,
				dark: trip.visibility?.dark !== false,
			},
		};
	} catch (error) {
		console.warn('Could not build the trip template:', error);
		return null;
	}
}

async function buildAccommodationTemplate(
	name: string,
	tripId: string,
	destinationIds: string[],
	accommodationId: string,
): Promise<AccommodationTemplate | null> {
	const accommodation = CREATOR_ACCOMMODATIONS.find((item) => item.id === accommodationId);
	if (!accommodation) return null;

	const images: TripTemplatePhoto[] = (Array.isArray(accommodation.images) ? accommodation.images : [])
		.map((image) => ({
			description: String(image?.description || ''),
			link: String(image?.link || ''),
		}))
		.filter((image) => image.link);

	return {
		id: createTripTemplateId('accommodation'),
		type: 'accommodation',
		name,
		destinationIds,
		sourceTripId: tripId,
		sourceAccommodationId: accommodationId,
		createdAt: new Date().toISOString(),
		accommodation: {
			name: String(accommodation.name || ''),
			address: String(accommodation.address || ''),
			description: String(accommodation.description || ''),
			times: {
				checkIn: getStoredTime(accommodation.dates?.checkIn),
				checkOut: getStoredTime(accommodation.dates?.checkOut),
			},
			images,
		},
	};
}

/** `HH:MM` of a stored DateObject (empty when the date is missing). */
function getStoredTime(date: Record<string, any> | undefined): string {
	// convertFromDateObject() falls back to "now" when the date is missing, so
	// validate the shape first — a template must never invent a time.
	if (!date || typeof date.year !== 'number' || typeof date.month !== 'number') return '';
	const value = convertFromDateObject(date);
	return value ? getTimeStringFromDate(value) : '';
}

function showCreatorError(message: string): void {
	const container = getID('templates-creator-error');
	const text = getID('templates-creator-error-text');
	if (text) text.textContent = message;
	if (container) container.style.display = 'block';
}

function hideCreatorError(): void {
	const container = getID('templates-creator-error');
	if (container) container.style.display = 'none';
}

// ── Data helpers ──

async function loadDestinationOptions(): Promise<DestinationOption[]> {
	const destinations = await getUserDestinations();
	return (destinations || [])
		.map((destination) => ({
			id: String(destination.id || ''),
			title: String(destination.title || ''),
			image: String(destination.image?.light || destination.image?.dark || ''),
		}))
		.filter((destination) => destination.id)
		.sort((a, b) => a.title.localeCompare(b.title));
}

/** Trips newest-first, read once per manager session. */
async function loadSourceTrips(): Promise<Record<string, any>[]> {
	const trips = await getUserTrips();
	return (trips || [])
		.filter((trip) => Boolean(trip?.id))
		.sort((a, b) => getTripStartTime(b) - getTripStartTime(a));
}

function getTripStartTime(trip: Record<string, any>): number {
	const start = trip?.start;
	if (!start || typeof start.year !== 'number') return 0;
	return new Date(start.year, (start.month || 1) - 1, start.day || 1).getTime();
}

/** Destination ids linked to a trip summary or full trip document. */
function getTripDestinationIds(trip: Record<string, any>): string[] {
	const raw = trip?.destinationRefs ?? trip?.destinations ?? [];
	// Trip docs normally store an array, but legacy/imported docs can carry a
	// single ref object (e.g. Lollapalooza 2026) or an id-keyed map.
	const refs = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object' && (raw.id || raw.destinationId)
			? [raw]
			: raw && typeof raw === 'object'
				? Object.values(raw)
				: [];
	const ids: string[] = [];
	for (const ref of refs) {
		const id = typeof ref === 'string' ? ref : ref?.id || ref?.destinationId;
		if (id && !ids.includes(id)) ids.push(id);
	}
	return ids;
}

function getDestinationTitle(destinationId: string): string {
	if (!destinationId) return '';
	const destination = DESTINATIONS.find((item) => item.id === destinationId);
	return destination?.title || '';
}
