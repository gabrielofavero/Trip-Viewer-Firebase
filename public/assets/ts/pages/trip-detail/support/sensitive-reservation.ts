import { startLoadingScreen, stopLoadingScreen } from '../../../utils/loading.js';
import { getState } from '../../../data/state.js';
import { getErrorFromGetRequestMessage, getID } from '../../../utils/dom.js';
import { closeMessage, displayError } from '../../../utils/messages.js';
import { get, haveErrorFromGetRequest } from '../../../data/firebase/database.js';
import { translate } from '../../../i18n/translation.js';
import { requestPin } from '../../../utils/pin.js';
import { copyToClipboard } from "../categories/transportation-module.js";
import { sendToExpenses } from "../support/embed.js";
import { getURLParam } from "../../../utils/dom.js";

// Determine document type from URL params (avoids circular dependency with view.js)
function getType(): string {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get("l") ? "listings" : urlParams.get("d") ? "destinations" : "trips";
}

const SENSITIVE_RESERVATION_BOXES = {
	transportation: {},
	accommodations: {},
};
const ACTIVE_SENSITIVE_RESERVATION = {
	type: null,
	id: null,
};
export let PIN: string | null = null;

const MASKED = "***";
const MEASURE = document.createElement("span");

export function loadSensitiveReservations(): void {
	const boxes = document.querySelectorAll<HTMLElement>(".sensitive-box");
	MEASURE.style.position = "absolute";
	MEASURE.style.visibility = "hidden";
	MEASURE.style.whiteSpace = "nowrap";
	document.body.appendChild(MEASURE);

	boxes.forEach((box: HTMLElement) => {
		const wrapper = box.querySelector<HTMLElement>(".code-wrapper")!;
		const textEl = box.querySelector<HTMLElement>(".code-text")!;
		const type = box.dataset.type!;
		const id = box.dataset.id!;

		SENSITIVE_RESERVATION_BOXES[type][id] = box;
		wrapper.style.width = getSensitiveReservationWidth(textEl, MASKED) + "px";
		(box.querySelector<HTMLElement>(".toggle-eye")!).onclick = () =>
			loadSensitiveReservation(type, id);
	});
}

function getSensitiveReservationWidth(el: HTMLElement, txt: string): number {
	MEASURE.style.font = getComputedStyle(el).font;
	MEASURE.textContent = txt;
	return MEASURE.getBoundingClientRect().width;
}

export function getSensitiveReservationHTML(type: string, id: string): string {
	return `
    <div class="sensitive-box" data-visible="false" data-type="${type}" data-id="${id}" data-reservation="" data-link="">
        <span class="code-wrapper"><a class="code-text masked" href="#" target="_blank">***</a></span>
        <button class="toggle-eye">
        <svg class="eye-icon eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 3l18 18" />
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        </svg>
        <svg class="eye-icon eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
            style="display:none">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
        </button>
    </div>`;
}

function loadSensitiveReservation(type: string, id: string): void {
	ACTIVE_SENSITIVE_RESERVATION.type = type;
	ACTIVE_SENSITIVE_RESERVATION.id = id;
	if (!PIN) {
		const confirmAction = `protectedDataConfirmAction(_updateSensitiveReservations)`;
		const cancelAction = `closeMessage()`;
		requestPin({ confirmAction, cancelAction, precontent: undefined as any, invalid: false });
	} else {
		loadSensitiveReservationAction(type, id);
	}
}

function updateSensitiveReservations(firestoreData: Record<string, any>): void {
	for (const key in SENSITIVE_RESERVATION_BOXES) {
		if (!Object.keys(firestoreData).includes(key)) {
			continue;
		}
		for (const id in SENSITIVE_RESERVATION_BOXES[key]) {
			const box = SENSITIVE_RESERVATION_BOXES[key][id];
			const entry = firestoreData[key]?.[id];
			if (!entry) {
				console.warn(
					`[Sensitive] No entry in firestoreData.${key}["${id}"]. ` +
					`Available ids in ${key}:`,
					firestoreData[key] ? Object.keys(firestoreData[key]) : "(key missing)",
				);
				continue;
			}
			const reservation = entry.reservation || translate("labels.non_specified");
			box.dataset.reservation =
				reservation.charAt(0) === "#" ? reservation : `#${reservation}`;
			box.dataset.link = entry.link || "";

			if (!box.dataset.link) {
				const wrapper = box.querySelector(".code-wrapper");
				wrapper.innerHTML = `<span class="code-text masked">${MASKED}</span>`;
			}
		}
	}

	const adjustLoadables = false;
	stopLoadingScreen({ adjustLoadables });
	const { type, id } = ACTIVE_SENSITIVE_RESERVATION;
	console.log('[Sensitive] updateSensitiveReservations done. boxes:', Object.keys(SENSITIVE_RESERVATION_BOXES.transportation).length + Object.keys(SENSITIVE_RESERVATION_BOXES.accommodations).length, '| active type:', type, '| active id:', id);
	if (type && id) {
		loadSensitiveReservationAction(type, id);
	}
}

function loadSensitiveReservationAction(type: string, id: string): void {
	const box = SENSITIVE_RESERVATION_BOXES[type][id];
	const show = box.dataset.visible !== "true";
	const label = box.dataset.reservation;
	const link = box.dataset.link;
	console.log('[Sensitive] loadSensitiveReservationAction | type:', type, '| id:', id, '| show:', show, '| label:', label, '| link:', link, '| box exists:', !!box);
	const wrapper = box.querySelector(".code-wrapper");
	const textEl = box.querySelector(".code-text");
	const linkActive = show && link;

	box.dataset.visible = show;

	textEl.textContent = show ? label : MASKED;
	textEl.classList.toggle("masked", !show);
	textEl.classList.toggle("link-active", linkActive);

	if (linkActive) {
		textEl.href = link;
	}

	wrapper.style.width =
		getSensitiveReservationWidth(textEl, show ? label : MASKED) + "px";

	box.querySelector(".eye-closed").style.display = show ? "none" : "";
	box.querySelector(".eye-open").style.display = show ? "" : "none";

	if (!link && show) {
		wrapper.style.cursor = "copy";
		wrapper.onclick = () => {
			copyToClipboard(label.replace(/^#/, ""));
		};
	} else {
		wrapper.style.cursor = "";
		wrapper.onclick = null;
	}
}

// Maps legacy string-based action names to actual functions.
// The string-action system (messages.ts) passes arguments as strings,
// so "protectedDataConfirmAction(_updateSensitiveReservations)" results in
// afterAction being the literal string "_updateSensitiveReservations".
const AFTER_ACTION_MAP: Record<string, (data: any) => void> = {
	_updateSensitiveReservations: updateSensitiveReservations,
};

export async function protectedDataConfirmAction(afterAction?: string | ((data: any) => void)) {
	// Resolve string-based afterAction (from legacy string-action system)
	if (typeof afterAction === "string") {
		const resolved = AFTER_ACTION_MAP[afterAction];
		if (resolved) {
			afterAction = resolved;
		} else {
			console.error('[Sensitive] Unknown afterAction string:', afterAction);
			afterAction = undefined;
		}
	}

	PIN = getID("pin-code")?.innerText || "";
	closeMessage();
	const adjustLoadables = false;
	startLoadingScreen({ adjustLoadables });
	const invalido = true;

	if (!PIN) {
		requestDocumentPin({ invalido });
		return;
	}

	const type = getType();
	const path = `${type}/protected/${PIN}/${getURLParam(type[0])}`;
	console.log('[Sensitive] get() path:', path, '| PIN:', PIN);
	const firestoreData = await get(path);
	console.log('[Sensitive] get() result:', firestoreData, '| haveError:', haveErrorFromGetRequest());

	if (!haveErrorFromGetRequest() && !firestoreData) {
		requestDocumentPin({ invalido });
		return;
	}

	if (haveErrorFromGetRequest()) {
		displayError(getErrorFromGetRequestMessage(), true);
		const adjustLoadables = false;
		stopLoadingScreen({ adjustLoadables });
		return;
	}

	if (getState().modules.expenses) {
		sendToExpenses("pin", PIN);
	}

	if (typeof afterAction === "function") {
		afterAction(firestoreData);
	}
}

export function requestDocumentPin({
	invalido = false,
	confirmAction = `protectedDataConfirmAction()`,
}: { invalido?: boolean; confirmAction?: string } = {}): void {
	const precontent = translate("messages.protected.pin");
	stopLoadingScreen();
	requestPin({ confirmAction, cancelAction: `closeMessage()`, precontent, invalid: invalido });
}

export async function updateProtectedDataFromExternalPin(pin: string): Promise<void> {
	const type = getType();
	const path = `${type}/protected/${pin}/${getURLParam(type[0])}`;
	const firestoreData = await get(path);

	if (!firestoreData || haveErrorFromGetRequest()) {
		return;
	}

	PIN = pin;
	updateSensitiveReservations(firestoreData);
}
