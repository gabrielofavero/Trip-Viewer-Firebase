import { getTransportations } from '../../../app/config.js';
import {
	codifyText,
	getCategoryLegJs,
	getID,
	getJ,
	getOrCreateCategoryID,
	removeRequired,
	setRequired,
} from '../../../utils/dom.js';
import { formattedDateToDateObject, getTimeBetweenDates } from '../../../utils/dates.js';
import { translate } from '../../../i18n/translation.js';
import { validateLink } from '../../../ui/fields.js';
import { closeAccordions } from '../../../ui/accordion.js';
import { initializeSortableForGroup } from '../../../ui/sortable.js';
import { TRAVELERS } from '../../../data/state.js';
import { getTravelerOptionsHTML } from './travelers.js';
import { addTransportation } from '../new-trip.js';

const TRANSPORTATION_DIRECTION_KEYS = ['departure', 'during', 'return'] as const;

export function getTransportationObject(protectedReservationCodes = false) {
	const result = {
		data: [],
		viewMode: getID('people-view').checked
			? 'people'
			: getID('leg-view').checked
				? 'leg'
				: 'simple',
	};
	for (const j of getCategoryLegJs('transportation')) {
		result.data.push({
			// Explicit order so the subcollection reader can restore the user's
			// arrangement (legs are stored as random-ID docs, so Firestore's
			// default doc-ID order would otherwise scramble them).
			order: result.data.length,
			dates: {
				arrival: formattedDateToDateObject(
					getID(`transportation-arrival-date-${j}`).value,
					getID(`arrival-time-${j}`).value,
				),
				departure: formattedDateToDateObject(
					getID(`transportation-departure-date-${j}`).value,
					getID(`departure-time-${j}`).value,
				),
			},
			duration: getID(`transportation-duration-other-${j}`).value,
			company: getCompanyValue(j),
			id: getOrCreateCategoryID('transportation', j),
			direction: getID(`departure-${j}`).checked
				? 'departure'
				: getID(`return-${j}`).checked
					? 'return'
					: 'during',
			link: protectedReservationCodes ? '' : getID(`transportation-link-${j}`).value,
			points: {
				destination: getID(`arrival-point-${j}`).value,
				origin: getID(`departure-point-${j}`).value,
			},
			reservation: protectedReservationCodes ? '' : getID(`reservation-transportation-${j}`).value,
			type: getID(`transportation-type-${j}`).value,
			person: getID(`transportation-person-select-${j}`).value,
		});
	}
	return result;
}

export function getProtectedTransportationObject() {
	const result = {};
	for (const j of getCategoryLegJs('transportation')) {
		const id = getID(`transportation-id-${j}`).value;
		const reservation = getID(`reservation-transportation-${j}`).value;
		const link = getID(`transportation-link-${j}`).value;
		result[id] = { reservation, link };
	}
	return result;
}

export function updateTransportationTitle(i) {
	const departurePoint = getID(`departure-point-${i}`).value;
	const arrivalPoint = getID(`arrival-point-${i}`).value;

	// In leg/people views the direction/traveler is shown by the group header,
	// so the accordion title only carries the route ("origin → destination").
	const text = [departurePoint, arrivalPoint].filter(Boolean).join(' → ');
	getID(`transportation-title-${i}`).innerText =
		text || `${translate('trip.transportation.title')} ${i}`;
}

/**
 * Populate a transportation leg "group by traveler" select from the trip's
 * travelers (values are traveler IDs, labels are names). Backward compatible:
 * when currentValue isn't a known traveler ID (legacy free-text/name values),
 * it is preserved as an extra option so nothing is lost on save.
 */
export function buildTransportationPersonSelect(selectID, currentValue = '') {
	const select = getID(selectID);
	if (!select) return;

	let options = `<option value="">${translate('labels.select')}</option>`;
	options += getTravelerOptionsHTML();

	const knownIds = TRAVELERS.map((t) => t.id);
	if (currentValue && !knownIds.includes(currentValue)) {
		options += `<option value="${currentValue}">${currentValue}</option>`;
	}

	select.innerHTML = options;
	if (currentValue) {
		select.value = currentValue;
	}
}

/** Rebuild every transportation leg person select, keeping current values. */
export function refreshTransportationPersonSelects() {
	for (const j of getCategoryLegJs('transportation')) {
		const select = getID(`transportation-person-select-${j}`);
		if (select) {
			buildTransportationPersonSelect(select.id, select.value);
			updateTransportationTitle(j);
		}
	}
	// Traveler rename → refresh the people-view group header labels.
	updateTransportationGroupTitles();
}

export function loadTransportationVisibility(j) {
	const companiesByType = getTransportations().companies;

	const companySelect = getID(`company-select-${j}`);
	const companyInput = getID(`company-${j}`);
	const type = getID(`transportation-type-${j}`).value;
	const previousValue = companySelect.value;

	const companies = companiesByType[type];

	if (!companies) {
		showOnlyCompanyInput(companySelect, companyInput);
		return;
	}

	populateCompanySelect(companySelect, companies);
	restorePreviousSelection(companySelect, previousValue);

	companySelect.style.display = 'block';
	companyInput.style.display = companySelect.value === 'other' ? 'block' : 'none';

	function populateCompanySelect(select, companies) {
		let options = `<option value="select">${translate('labels.select')}</option>`;

		for (const [value, label] of Object.entries(companies)) {
			options += `<option value="${value}">${label}</option>`;
		}

		options += `<option value="other">${translate('labels.other')}</option>`;
		select.innerHTML = options;
	}

	function restorePreviousSelection(select, value) {
		if (!value) return;

		const exists = Array.from(select.options).some(
			(option: HTMLOptionElement) => option.value === value,
		);

		if (exists) {
			select.value = value;
		}
	}

	function showOnlyCompanyInput(select, input) {
		select.style.display = 'none';
		input.style.display = 'block';
	}
}

export function applyTransportationTypeVisualization(i?) {
	if (i) {
		apply(i);
		return;
	}

	for (const j of getCategoryLegJs('transportation')) {
		apply(j);
	}

	// Rebuild the leg/people group wrappers to match the current view mode.
	renderTransportationGroups();

	function apply(j) {
		updateTransportationTitle(j);
		getID(`direction-box-${j}`).style.display = getID('leg-view').checked ? 'block' : 'none';
		getID(`people-box-${j}`).style.display = getID('people-view').checked ? 'block' : 'none';

		if (getID('people-view').checked) {
			setRequired(`transportation-person-select-${j}`);
		} else {
			removeRequired(`transportation-person-select-${j}`);
		}
	}
}

function loadAutoDuration(i) {
	const div = getID(`transportation-duration-other-${i}`);

	const startDate = getID(`transportation-departure-date-${i}`).value;
	const startTime = getID(`departure-time-${i}`).value;

	const endDate = getID(`transportation-arrival-date-${i}`).value;
	const endTime = getID(`arrival-time-${i}`).value;

	if (startDate != '' && startTime != '' && endDate != '' && endTime != '') {
		const start = new Date(`${startDate}T${startTime}`);
		const end = new Date(`${endDate}T${endTime}`);
		div.value = getTimeBetweenDates(start, end);
	}
}

// Set Trip
function getCompanyValue(j) {
	const companySelectDiv = getID(`company-select-${j}`);
	const companyInputDiv = getID(`company-${j}`);

	if (companySelectDiv && companyInputDiv) {
		if (companySelectDiv.value == 'other' || companySelectDiv.value == 'select') {
			return companyInputDiv.value;
		} else {
			return companySelectDiv.value;
		}
	}

	return '';
}

// Listeners
export function loadTransportationListeners(j) {
	// Dynamic Selects
	getID(`company-select-${j}`).addEventListener('change', () => loadTransportationVisibility(j));
	getID(`transportation-type-${j}`).addEventListener('change', () =>
		loadTransportationVisibility(j),
	);

	// Dynamic Title — refresh live as the user types the route points (input),
	// plus on blur/selection change to cover programmatic and edge cases.
	getID(`departure-point-${j}`).addEventListener('input', () => updateTransportationTitle(j));
	getID(`arrival-point-${j}`).addEventListener('input', () => updateTransportationTitle(j));
	getID(`departure-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`arrival-point-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`departure-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`during-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`return-${j}`).addEventListener('change', () => updateTransportationTitle(j));
	getID(`transportation-person-select-${j}`).addEventListener('change', () =>
		updateTransportationTitle(j),
	);

	// Automatic Route Duration Calculation
	getID(`transportation-departure-date-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`departure-time-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`transportation-arrival-date-${j}`).addEventListener('change', () => loadAutoDuration(j));
	getID(`arrival-time-${j}`).addEventListener('change', () => loadAutoDuration(j));

	// Link Validation
	getID(`transportation-link-${j}`).addEventListener('change', () =>
		validateLink(`transportation-link-${j}`),
	);
}

export function transportationAddListenerAction() {
	closeAccordions('transportation');
	addTransportation();
	// In leg/people views place the new leg inside its group wrapper.
	const js = getCategoryLegJs('transportation');
	const newJ = js.length ? Math.max(...js) : undefined;
	if (newJ !== undefined) {
		placeTransportationLegInGroup(newJ);
		$(`#collapse-transportation-${newJ}`).collapse('show');
	}
}

// ======= Grouping (leg / people view) =======

/** Current group key for a leg: direction in leg view, traveler id in people view. */
function getLegGroupKey(j: number): string {
	if (getID('leg-view')?.checked) {
		if (getID(`departure-${j}`)?.checked) return 'departure';
		if (getID(`return-${j}`)?.checked) return 'return';
		return 'during';
	}
	return getID(`transportation-person-select-${j}`)?.value || '';
}

function getGroupLabel(key: string): string {
	if (getID('leg-view')?.checked) {
		const labels: Record<string, string> = {
			departure: 'trip.transportation.departure',
			during: 'trip.transportation.during',
			return: 'trip.transportation.return',
		};
		return translate(labels[key] || 'trip.transportation.title');
	}
	if (key) {
		const traveler = TRAVELERS.find((t) => t.id === key);
		return traveler ? traveler.name : key;
	}
	return translate('labels.select');
}

/** Canonical group order for the people view: trip travelers, then extras. */
function getPeopleGroupOrder(): string[] {
	const order = TRAVELERS.map((t) => t.id);
	for (const j of getCategoryLegJs('transportation')) {
		const key = getLegGroupKey(j);
		if (key && !order.includes(key)) order.push(key);
	}
	return order;
}

/** Find a group's items container by its group key (traveler id / direction). */
function getGroupItemsContainer(key: string): HTMLElement | null {
	const box = getID('transportation-box');
	if (!box) return null;
	for (const group of Array.from(box.querySelectorAll<HTMLElement>('.transportation-group'))) {
		if (group.dataset.transportGroup === key) {
			return group.querySelector<HTMLElement>('.transportation-group-items');
		}
	}
	return null;
}

function buildTransportationGroup(key: string, legs: HTMLElement[]): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'transportation-group';
	wrapper.dataset.transportGroup = key;

	const title = document.createElement('div');
	title.className = 'transportation-group-title';
	title.textContent = getGroupLabel(key);
	wrapper.appendChild(title);

	const items = document.createElement('div');
	items.className = 'draggable-area transportation-group-items';
	items.dataset.group = 'transportation';
	items.dataset.transportGroup = key;
	items.id = `transportation-group-items-${codifyText(key) || 'unassigned'}`;
	for (const leg of legs) items.appendChild(leg);
	wrapper.appendChild(items);

	return wrapper;
}

/**
 * Render the leg/people group wrappers inside #transportation-box.
 * Legs are moved (never recreated), so their form values are preserved.
 */
export function renderTransportationGroups() {
	const box = getID('transportation-box');
	if (!box) return;

	const isLeg = !!getID('leg-view')?.checked;
	const isPeople = !!getID('people-view')?.checked;
	const grouped = isLeg || isPeople;

	destroyTransportationSortables(box);

	const legs = Array.from(box.querySelectorAll<HTMLElement>('.inner-box'));

	if (!grouped) {
		box.innerHTML = '';
		box.classList.add('draggable-area');
		box.dataset.group = 'transportation';
		for (const leg of legs) box.appendChild(leg);
		initTransportationSortable();
		return;
	}

	// Compute each leg's group while the legs are still attached to the
	// document — getLegGroupKey() reads inputs by id (getID), and the
	// box.innerHTML = '' below detaches them, which made every leg fall
	// through to the "during" group.
	const order = isLeg ? [...TRANSPORTATION_DIRECTION_KEYS] : getPeopleGroupOrder();

	const groupedLegs = new Map<string, HTMLElement[]>();
	for (const leg of legs) {
		const key = getLegGroupKey(getJ(leg.id));
		const groupLegs = groupedLegs.get(key) ?? [];
		groupLegs.push(leg);
		groupedLegs.set(key, groupLegs);
	}

	box.innerHTML = '';
	box.classList.remove('draggable-area');
	delete box.dataset.group;

	for (const key of order) {
		const groupLegs = groupedLegs.get(key);
		if (!groupLegs || groupLegs.length === 0) continue;
		box.appendChild(buildTransportationGroup(key, groupLegs));
	}
	// Unknown keys (e.g. legacy person names) are appended last.
	for (const [key, groupLegs] of groupedLegs) {
		if (!order.includes(key) && groupLegs.length > 0) {
			box.appendChild(buildTransportationGroup(key, groupLegs));
		}
	}

	initTransportationSortable();
}

/** Move a single leg into its group wrapper (used when adding a leg). */
function placeTransportationLegInGroup(j: number) {
	if (!getID('leg-view')?.checked && !getID('people-view')?.checked) return;
	const box = getID('transportation-box');
	const leg = getID(`transportation-inner-box-${j}`);
	if (!box || !leg) return;

	const key = getLegGroupKey(j);
	let items = getGroupItemsContainer(key);
	if (!items) {
		const wrapper = buildTransportationGroup(key, []);
		box.appendChild(wrapper);
		items = wrapper.querySelector<HTMLElement>('.transportation-group-items');
		// New container → make it sortable so the leg can be dragged there.
		initTransportationSortable();
	}
	if (items) items.appendChild(leg);
}

/** Remove group wrappers that no longer contain any leg. */
export function removeEmptyTransportationGroups() {
	const box = getID('transportation-box');
	if (!box) return;
	for (const group of Array.from(box.querySelectorAll<HTMLElement>('.transportation-group'))) {
		const items = group.querySelector<HTMLElement>('.transportation-group-items');
		if (!items || items.children.length === 0) group.remove();
	}
}

/** Refresh group header labels (e.g. after a traveler rename). */
function updateTransportationGroupTitles() {
	const box = getID('transportation-box');
	if (!box) return;
	for (const group of Array.from(box.querySelectorAll<HTMLElement>('.transportation-group'))) {
		const title = group.querySelector<HTMLElement>('.transportation-group-title');
		const key = group.dataset.transportGroup || '';
		if (title) title.textContent = getGroupLabel(key);
	}
}

/** Detach every Sortable instance inside the box (box + group containers). */
function destroyTransportationSortables(box: HTMLElement) {
	const targets = [box, ...Array.from(box.querySelectorAll<HTMLElement>('.draggable-area'))];
	for (const el of targets) {
		const withSortable = el as HTMLElement & { sortableInstance?: { destroy: () => void } };
		if (withSortable.sortableInstance) {
			withSortable.sortableInstance.destroy();
			delete withSortable.sortableInstance;
		}
	}
}

/**
 * Sortable for the transportation box. In simple view it targets the box
 * itself; in leg/people views it targets each group's items container, and all
 * containers share the "transportation" sort group so legs can be dragged
 * between groups.
 */
export function initTransportationSortable() {
	initializeSortableForGroup('transportation', { onEnd: afterDragTransportation });
}

function afterDragTransportation(evt) {
	const fromKey = evt.from?.dataset?.transportGroup;
	const toKey = evt.to?.dataset?.transportGroup;
	if (!fromKey || !toKey || fromKey === toKey) return;

	const j = getJ(evt.item?.id);
	if (!Number.isFinite(j)) return;

	// Cross-group drop → update the leg's direction (leg view) or traveler
	// (people view). Sortable has already moved the DOM node into the new group.
	if (getID('people-view')?.checked) {
		const select = getID(`transportation-person-select-${j}`);
		if (select && toKey) {
			// Rebuild options so legacy/unknown traveler values get an option
			// (buildTransportationPersonSelect preserves unknown values).
			buildTransportationPersonSelect(select.id, toKey);
		}
	} else if (getID('leg-view')?.checked) {
		const radio = getID(`${toKey}-${j}`);
		if (radio) radio.checked = true;
	}

	applyTransportationTypeVisualization(j);
}
