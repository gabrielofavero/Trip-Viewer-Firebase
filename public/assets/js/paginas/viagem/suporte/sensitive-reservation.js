const SENSITIVE_RESERVATION_BOXES = {
	transportes: {},
	hospedagens: {},
};
const ACTIVE_SENSITIVE_RESERVATION = {
	type: null,
	id: null,
};
const MASKED = "***";
const MEASURE = document.createElement("span");

function _loadSensitiveReservations() {
	const boxes = document.querySelectorAll(".sensitive-box");
	MEASURE.style.position = "absolute";
	MEASURE.style.visibility = "hidden";
	MEASURE.style.whiteSpace = "nowrap";
	document.body.appendChild(MEASURE);

	boxes.forEach((box) => {
		const wrapper = box.querySelector(".code-wrapper");
		const textEl = box.querySelector(".code-text");
		const type = box.dataset.type;
		const id = box.dataset.id;

		SENSITIVE_RESERVATION_BOXES[type][id] = box;
		wrapper.style.width = _getSensitiveReservationWidth(textEl, MASKED) + "px";
		box.querySelector(".toggle-eye").onclick = () =>
			_loadSensitiveReservation(type, id);
	});
}

function _getSensitiveReservationWidth(el, txt) {
	MEASURE.style.font = getComputedStyle(el).font;
	MEASURE.textContent = txt;
	return MEASURE.getBoundingClientRect().width;
}

function _getSensitiveReservationHTML(type, id) {
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

function _loadSensitiveReservation(type, id) {
	ACTIVE_SENSITIVE_RESERVATION.type = type;
	ACTIVE_SENSITIVE_RESERVATION.id = id;
	if (!PIN) {
		const confirmAction = `_protectedDataConfirmAction(_updateSensitiveReservations)`;
		const cancelAction = `_closeMessage()`;
		_requestPin({ confirmAction, cancelAction });
	} else {
		_loadSensitiveReservationAction(type, id);
	}
}

function _updateSensitiveReservations(firestoreData) {
	for (const key in SENSITIVE_RESERVATION_BOXES) {
		if (!Object.keys(firestoreData).includes(key)) {
			continue;
		}
		for (const id in SENSITIVE_RESERVATION_BOXES[key]) {
			const box = SENSITIVE_RESERVATION_BOXES[key][id];
			const reserva = firestoreData[key][id].reserva || "N/A";
			box.dataset.reservation =
				reserva.charAt(0) === "#" ? reserva : `#${reserva}`;
			box.dataset.link = firestoreData[key][id].link || "";

			if (!box.dataset.link) {
				const wrapper = box.querySelector(".code-wrapper");
				wrapper.innerHTML = `<span class="code-text masked">${MASKED}</span>`;
			}
		}
	}

	const adjustLoadables = false;
	_stopLoadingScreen({ adjustLoadables });
	const { type, id } = ACTIVE_SENSITIVE_RESERVATION;
	if (type && id) {
		_loadSensitiveReservationAction(type, id);
	}
}

function _loadSensitiveReservationAction(type, id) {
	const box = SENSITIVE_RESERVATION_BOXES[type][id];
	const show = box.dataset.visible !== "true";
	const label = box.dataset.reservation;
	const link = box.dataset.link;
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
		_getSensitiveReservationWidth(textEl, show ? label : MASKED) + "px";

	box.querySelector(".eye-closed").style.display = show ? "none" : "";
	box.querySelector(".eye-open").style.display = show ? "" : "none";

	if (!link && show) {
		wrapper.style.cursor = "copy";
		wrapper.onclick = () => {
			_copyToClipboard(label);
		};
	} else {
		wrapper.style.cursor = "";
		wrapper.onclick = null;
	}
}

async function _protectedDataConfirmAction(afterAction = _setFirestoreData) {
	PIN = getID("pin-code")?.innerText || "";
	_closeMessage();
	const adjustLoadables = false;
	_startLoadingScreen({ adjustLoadables });
	const invalido = true;

	if (!PIN) {
		_requestDocumentPin({ invalido });
		return;
	}

	const path = `${TYPE}/protected/${PIN}/${_getURLParam(TYPE[0])}`;
	const firestoreData = await _get(path);

	if (!_haveErrorFromGetRequest() && !firestoreData) {
		_requestDocumentPin({ invalido });
		return;
	}

	if (_haveErrorFromGetRequest()) {
		_displayError(_getErrorFromGetRequestMessage(), true);
		const adjustLoadables = false;
		_stopLoadingScreen({ adjustLoadables });
		return;
	}

	if (FIRESTORE_DATA.modulos.gastos) {
		_sendToExpenses("pin", PIN);
	}

	afterAction(firestoreData);
}

function _requestDocumentPin({
	invalido = false,
	confirmAction = `_protectedDataConfirmAction()`,
} = {}) {
	const precontent = translate("messages.protected.pin");
	_stopLoadingScreen();
	_requestPin({ confirmAction, precontent, invalido });
}

async function _updateProtectedDataFromExternalPin(pin) {
	const path = `${TYPE}/protected/${pin}/${_getURLParam(TYPE[0])}`;
	const firestoreData = await _get(path);

	if (!firestoreData || _haveErrorFromGetRequest()) {
		return;
	}

	PIN = pin;
	_updateSensitiveReservations(firestoreData);
}
