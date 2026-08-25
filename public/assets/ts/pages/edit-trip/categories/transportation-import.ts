// ======= Transportation importer =======
// In the traveler-grouped view, a traveler can copy a completed transport leg
// from another traveler. The copied fields become independent form values.

import { markStagedChanges } from '../../../ui/fields.js';
import { translate } from '../../../i18n/translation.js';
import { getChildIDs, getID, getJ } from '../../../utils/dom.js';
import {
	closeMessage,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../../../utils/messages.js';
import { getTransportationPicker } from '../new-trip.js';
import { loadTransportationVisibility, updateTransportationTitle } from './transportation.js';

let TARGET_INDEX = 0;
let SELECTED_SOURCE_INDEX = 0;

/** Show import buttons only when a different traveler has a completed leg. */
export function refreshTransportationImportButtons() {
	const peopleView = (getID('people-view') as HTMLInputElement | null)?.checked === true;
	for (const childId of getChildIDs('transportation-box')) {
		const index = getJ(childId);
		const button = getID(`transportation-import-button-${index}`);
		if (!button) continue;
		button.style.display = peopleView && getImportSources(index).length > 0 ? '' : 'none';
	}
}

/** Import from another traveler's completed leg, directly when unambiguous. */
export function openTransportationImport(index: number) {
	const sources = getImportSources(index);
	if (sources.length === 1) {
		copyTransportation(index, sources[0]);
		openToast(translate('trip.transportation.import.copied'));
		return;
	}
	if (!sources.length) return;

	TARGET_INDEX = index;
	SELECTED_SOURCE_INDEX = 0;
	const properties = { ...MESSAGE_PROPERTIES };
	properties.title = translate('trip.transportation.import.title');
	properties.containers = getContainersInput();
	properties.fullscreen = true;
	properties.content = `
		<p class="wallpaper-import-subgroup-title">${translate('trip.transportation.import.choose')}</p>
		<div class="wallpaper-import-scroll" id="transportation-import-list">
			<div class="wallpaper-import-group-grid">${sources.map(getSourceCard).join('')}</div>
		</div>`;
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: confirmTransportationImport, label: 'labels.confirm' },
	];
	displayFullMessage(properties);
	(getID('message-confirm') as HTMLButtonElement).disabled = true;
	getID('transportation-import-list').addEventListener('click', selectSource);
}

function getImportSources(targetIndex: number): number[] {
	const targetPerson = getID(`transportation-person-select-${targetIndex}`)?.value || '';
	if (!targetPerson) return [];

	return getChildIDs('transportation-box')
		.map(getJ)
		.filter((index) => {
			const sourcePerson = getID(`transportation-person-select-${index}`)?.value || '';
			return (
				index !== targetIndex &&
				sourcePerson !== '' &&
				sourcePerson !== targetPerson &&
				isTransportationFilled(index)
			);
		});
}

function isTransportationFilled(index: number) {
	return [
		getID(`departure-point-${index}`)?.value,
		getID(`arrival-point-${index}`)?.value,
		getID(`company-${index}`)?.value,
		getID(`reservation-transportation-${index}`)?.value,
		getID(`transportation-link-${index}`)?.value,
	].some((value) => String(value || '').trim() !== '');
}

function getSourceCard(index: number) {
	const personSelect = getID(`transportation-person-select-${index}`) as HTMLSelectElement;
	const traveler = personSelect.selectedOptions[0]?.text || personSelect.value;
	const origin =
		getID(`departure-point-${index}`)?.value || translate('trip.transportation.departure');
	const destination =
		getID(`arrival-point-${index}`)?.value || translate('trip.transportation.arrival');
	return `
		<button type="button" class="wallpaper-import-card" data-source-index="${index}">
			<div class="wallpaper-import-thumb"><i class="iconify image-picker-icon" data-icon="mdi:airplane"></i></div>
			<div class="wallpaper-import-name">${traveler}: ${origin} → ${destination}</div>
		</button>`;
}

function selectSource(event: Event) {
	const card = (event.target as Element).closest<HTMLElement>('[data-source-index]');
	const sourceIndex = Number(card?.getAttribute('data-source-index'));
	if (!sourceIndex) return;

	SELECTED_SOURCE_INDEX = sourceIndex;
	getID('transportation-import-list')
		.querySelectorAll('.wallpaper-import-card')
		.forEach((item) => item.classList.toggle('selected', item === card));
	(getID('message-confirm') as HTMLButtonElement).disabled = false;
}

function confirmTransportationImport() {
	if (!TARGET_INDEX || !SELECTED_SOURCE_INDEX) return;
	copyTransportation(TARGET_INDEX, SELECTED_SOURCE_INDEX);
	closeMessage();
}

/** Copy all transport details while retaining the target leg ID and traveler. */
function copyTransportation(target: number, source: number) {
	for (const direction of ['departure', 'during', 'return']) {
		getID(`${direction}-${target}`).checked = getID(`${direction}-${source}`).checked;
	}
	getID(`departure-point-${target}`).value = getID(`departure-point-${source}`).value;
	getID(`arrival-point-${target}`).value = getID(`arrival-point-${source}`).value;
	getID(`transportation-departure-date-${target}`).value = getID(
		`transportation-departure-date-${source}`,
	).value;
	getID(`transportation-arrival-date-${target}`).value = getID(
		`transportation-arrival-date-${source}`,
	).value;
	getTransportationPicker(target)?.setRange(
		getID(`transportation-departure-date-${source}`).value,
		getID(`transportation-arrival-date-${source}`).value,
	);
	getID(`departure-time-${target}`).value = getID(`departure-time-${source}`).value;
	getID(`arrival-time-${target}`).value = getID(`arrival-time-${source}`).value;
	getID(`transportation-type-${target}`).value = getID(`transportation-type-${source}`).value;
	loadTransportationVisibility(target);
	copyCompany(target, source);
	getID(`transportation-duration-other-${target}`).value = getID(
		`transportation-duration-other-${source}`,
	).value;
	getID(`reservation-transportation-${target}`).value = getID(
		`reservation-transportation-${source}`,
	).value;
	getID(`transportation-link-${target}`).value = getID(`transportation-link-${source}`).value;
	updateTransportationTitle(target);
	markStagedChanges();
	refreshTransportationImportButtons();
}

function copyCompany(target: number, source: number) {
	const sourceSelect = getID(`company-select-${source}`) as HTMLSelectElement;
	const targetSelect = getID(`company-select-${target}`) as HTMLSelectElement;
	getID(`company-${target}`).value = getID(`company-${source}`).value;
	if (Array.from(targetSelect.options).some((option) => option.value === sourceSelect.value)) {
		targetSelect.value = sourceSelect.value;
	}
}
