import { cloneObject, getID } from './dom.js';
import { stopLoadingScreen, stopLoadingTimer } from './loading.js';
import { translate } from '../i18n/translation.js';
import { disableScroll, getVisibility } from '../theme/visibility.js';
import { getHTMLpage } from '../app/main.js';

export let MESSAGE_MODAL_OPEN = false;
// Use var (not const) to avoid TDZ errors from circular module dependencies
export var MESSAGE_PROPERTIES: Record<string, any> = {
	title: '',
	content: '',
	critical: false,
	blur: true,
	// Marks the dialog as an input/intervention dialog: on mobile it fills the
	// whole screen (no border radius) so it feels like a separate page.
	fullscreen: false,
	erro: {},
	icons: [],
	buttons: [
		{
			type: 'ok',
			action: '',
		},
	],
	containers: {
		principal: 'message-container',
		buttons: 'button-box',
	},
};

/**
 * Class added to fullscreen-capable dialogs (see `properties.fullscreen`).
 * Styling lives in components/modal.css (`.fullscreen-dialog`).
 */
export const FULLSCREEN_CLASS = 'fullscreen-dialog';

/*--------------------------------------------------------------
# Standardized dialog open/close animations
# Shared by message modals, toasts, and page dialogs (dialog-card,
# modal-card, index tab-content...). The matching CSS lives in
# components/modal.css and components/toast.css. Kept here so any
# page can reuse the same open/close gesture.
--------------------------------------------------------------*/
export const DIALOG_LEAVE_CLASS = 'dialog-leave';
export const TOAST_ENTER_CLASS = 'toast-enter';
export const TOAST_LEAVE_CLASS = 'toast-leave';
export const PANEL_LEAVE_CLASS = 'panel-leave';
// Must stay in sync with the CSS animation durations below.
const DIALOG_ANIM_DURATION = 220; // ms (.dialog-leave / overlay fade)
const TOAST_ANIM_DURATION = 220; // ms (.toast-leave)
const PANEL_ANIM_DURATION = 220; // ms (.panel-leave)

/**
 * Show `element` with the standardized dialog open animation. The element's
 * CSS animation plays as soon as it becomes visible; this just clears any
 * leftover closing state and forces a reflow so the animation restarts.
 *
 * @param display Optional `display` value to set (e.g. 'flex') before animating.
 */
export function animateDialogOpen(element: HTMLElement | null, display?: string) {
	if (!element) return;
	if (display) {
		element.style.display = display;
	} else if ((element as any)._prevDisplay !== undefined) {
		// Restore the display the element had before a previous close hid it
		// (captured in `_animateOut`). Without this, persistent cards/dialogs
		// reopen with an invisible box — only the backdrop shows.
		element.style.display = (element as any)._prevDisplay;
	}
	delete (element as any)._prevDisplay;
	element.classList.remove(DIALOG_LEAVE_CLASS);
	void element.offsetWidth;
}

/**
 * Hide `element` with the standardized dialog close animation, then call
 * `onComplete`. Timing follows the CSS `animationend` event (with a small
 * safety timeout so the element always ends up hidden).
 */
export function animateDialogClose(element: HTMLElement | null, onComplete?: () => void) {
	if (!element) {
		onComplete?.();
		return;
	}
	if (element.classList.contains(DIALOG_LEAVE_CLASS) || element.style.display === 'none') {
		onComplete?.();
		return;
	}
	// Restart the leave animation from the start.
	element.classList.remove(DIALOG_LEAVE_CLASS);
	void element.offsetWidth;
	_animateOut(element, DIALOG_LEAVE_CLASS, DIALOG_ANIM_DURATION, onComplete);
}

let _panelSwitching = false;
/**
 * Switch from `oldContent` to `newContent` with a standardized leaving
 * animation on the outgoing panel (used by the index tab-content). Rapid
 * calls while an animation is running are ignored so panels never get stuck.
 * Returns whether the switch was started.
 */
export function switchPanel(
	oldContent: HTMLElement | null,
	newContent: HTMLElement | null,
	onDone?: () => void,
): boolean {
	if (_panelSwitching) return false;
	if (!newContent) {
		onDone?.();
		return false;
	}
	if (!oldContent || oldContent === newContent) {
		newContent.classList.add('active');
		onDone?.();
		return true;
	}
	_panelSwitching = true;
	oldContent.classList.add(PANEL_LEAVE_CLASS);
	const finish = () => {
		_panelSwitching = false;
		oldContent.classList.remove('active', PANEL_LEAVE_CLASS);
		newContent.classList.add('active');
		onDone?.();
	};
	oldContent.addEventListener(
		'animationend',
		(e) => {
			if (e.target !== oldContent) return;
			finish();
		},
		{ once: true },
	);
	setTimeout(finish, PANEL_ANIM_DURATION + 60);
	return true;
}

/**
 * Add a `leaveClass` to `element`, wait for it to finish (CSS `animationend`
 * from the element itself, or a safety timeout), then remove the class, hide
 * the element and call `onComplete`. Any previously pending close on the same
 * element is cancelled first (e.g. reopening a toast mid-close).
 */
function _animateOut(
	element: HTMLElement,
	leaveClass: string,
	duration: number,
	onComplete?: () => void,
) {
	cancelAnimateOut(element);
	// Remember how the element is currently displayed (inline style, or '' when
	// it comes from CSS) so `animateDialogOpen()` can restore it when the same
	// element is reopened after being hidden here.
	(element as any)._prevDisplay = element.style.display;
	element.classList.add(leaveClass);
	let cancelled = false;
	(element as any)._animOutCancel = () => {
		cancelled = true;
	};
	const finish = () => {
		if (cancelled) return;
		(element as any)._animOutCancel = null;
		element.classList.remove(leaveClass);
		element.style.display = 'none';
		onComplete?.();
	};
	element.addEventListener(
		'animationend',
		(e) => {
			if (e.target !== element) return;
			finish();
		},
		{ once: true },
	);
	setTimeout(finish, duration + 80);
}

/** Cancel a pending `_animateOut` on `element` (e.g. reopening it mid-close). */
function cancelAnimateOut(element: HTMLElement | null) {
	if (element && (element as any)._animOutCancel) {
		(element as any)._animOutCancel();
		(element as any)._animOutCancel = null;
	}
}

// Generic Message
export function displayMessage(title, content) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	if (title) properties.title = title;
	if (content) properties.content = content;
	displayFullMessage(properties);
}

// Prompt (Yes / No)
export function displayPrompt({
	title: title,
	content: content,
	yesAction,
	noAction = 'closeMessage()',
	critical = false,
}: {
	title?: string;
	content?: string;
	yesAction?: string | (() => void);
	noAction?: string | (() => void);
	critical?: boolean;
} = {}) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = title;
	properties.content = content;
	properties.critical = critical;
	properties.buttons = [
		{
			type: 'no',
			action: noAction,
		},
		{
			type: 'yes',
			action: yesAction,
		},
	];
	displayFullMessage(properties);
}

export function displayFullMessage(properties = cloneObject(MESSAGE_PROPERTIES)) {
	const preloader = getID('preloader');
	const isErrorMessage = Object.keys(properties.erro).length > 0;

	if (typeof stopLoadingTimer === 'function') {
		stopLoadingTimer();
	}

	if (!preloader) {
		console.warn('Canot show message. Preloader not found');
		return;
	}

	MESSAGE_MODAL_OPEN = true;
	document.addEventListener('keydown', handleMessageKeydown);
	disableScroll();

	// Container
	const container = document.createElement('div');
	container.className = properties.containers.principal;

	// Input/intervention dialogs become full-screen on mobile (feels like a
	// separate page) — handled by the `.fullscreen-dialog` styles.
	if (properties.fullscreen) {
		container.classList.add(FULLSCREEN_CLASS);
	}

	// Text Container
	const textDiv = document.createElement('div');
	textDiv.className = 'message-text-container';

	// Criticidade — always show the icon box (includes X close button)
	const buttonsBox = getIconsBox(properties.icons);
	textDiv.appendChild(buttonsBox);

	// Title
	const titleDiv = document.createElement('div');
	titleDiv.className = 'message-title';
	titleDiv.id = 'message-title';
	titleDiv.innerHTML = properties.title;
	textDiv.appendChild(titleDiv);

	// Description
	const descriptionDiv = document.createElement('div');
	descriptionDiv.className = 'message-description';
	descriptionDiv.id = 'message-description';
	descriptionDiv.innerHTML = properties.content;
	textDiv.appendChild(descriptionDiv);

	// Mensagem de Erro
	if (isErrorMessage) {
		const errorElement = getErrorElement(properties.erro);
		textDiv.appendChild(errorElement);
	}

	// Buttons
	if (properties.buttons && properties.buttons.length > 0) {
		const buttonBox = document.createElement('div');
		buttonBox.className = properties.containers?.buttons || 'button-box';

		buttonBox.style.marginTop = '25px';

		for (const buttonType of properties.buttons) {
			const button = getButton(buttonType);
			buttonBox.appendChild(button);
		}

		textDiv.appendChild(buttonBox);
	}

	// Adiciona ao Container
	container.appendChild(textDiv);
	preloader.innerHTML = '';
	preloader.style.background = 'rgba(0, 0, 0, 0.6)';

	// Blur
	if (properties.blur) {
		preloader.style.backdropFilter = 'blur(10px)';
		(preloader.style as any).webkitBackdropFilter = 'blur(10px)';
	}

	// Adiciona ao Preloader
	preloader.appendChild(container);

	// Exibe o Preloader com fade-in
	if (preloader.style.display != 'block') {
		preloader.style.opacity = '0';
		preloader.style.display = 'block';
		requestAnimationFrame(() => {
			preloader.style.opacity = '1';
		});
	} else {
		preloader.style.opacity = '1';
	}
}

// Mensagem de Erro
export function displayError(error, tryAgain = false) {
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.title = translate('messages.errors.load_title');
	properties.critical = true;
	properties.content = getErrorMessage(error);
	properties.localizacao = false; // Disabled. No point in showing to the user.

	const buttons = tryAgain ? [{ type: 'try-again' }] : [];
	if (!window.location.href.includes('index.html')) {
		buttons.push({ type: 'home' });
	}
	properties.buttons = buttons;
	displayFullMessage(properties);
}

export function getErrorMessage(error) {
	const isError = error && error instanceof Error;
	const contact = `<a href=\"mailto:gabriel.o.favero@live.com\">${translate('messages.errors.contact_admin')}</a> ${translate('messages.errors.to_report')}`;

	if (!error || (isError && !error.message)) {
		return `${translate('messages.errors.unknown')}. ${contact}`;
	} else if (isError) {
		let msg = error.message;
		if (msg[msg.length - 1] === '.') {
			msg = msg.substring(0, msg.length - 1);
		}
		return `${msg}. ${contact}`;
	} else {
		return error;
	}
}

// Unauthorized Message
export function displayForbidden(content, redirectTo = 'view.html') {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('messages.access_denied.title');
	properties.content = content || translate('messages.access_denied.message');
	properties.critical = true;
	properties.buttons = [
		{
			type: 'goBack',
			action: redirectTo,
		},
	];
	displayFullMessage(properties);
}

// Fechar Mensagem
export function closeMessage() {
	if (MESSAGE_MODAL_OPEN) {
		const preloader = getID('preloader');
		const dialog = preloader ? (preloader.firstElementChild as HTMLElement | null) : null;

		MESSAGE_MODAL_OPEN = false;
		document.removeEventListener('keydown', handleMessageKeydown);

		const finishClose = () => {
			if ((preloader as any)?._closeMsgTimeout) {
				clearTimeout((preloader as any)._closeMsgTimeout);
				delete (preloader as any)._closeMsgTimeout;
			}
			if (preloader) {
				preloader.innerHTML = '';
				preloader.style.background = '';
				preloader.style.display = 'none';
				preloader.style.opacity = '';
			}
			if (typeof stopLoadingScreen === 'function') stopLoadingScreen();
		};

		if (preloader && dialog) {
			// Fade the overlay out while the dialog plays its leave animation.
			preloader.style.opacity = '0';
			animateDialogClose(dialog, finishClose);
			// Safety net (also the legacy cancel point used by startLoadingScreen).
			(preloader as any)._closeMsgTimeout = setTimeout(finishClose, DIALOG_ANIM_DURATION + 120);
		} else {
			finishClose();
		}
	} else {
		console.warn('Cannot close an unopened message modal.');
	}
}

// Support Functions
export function getContainersInput() {
	return {
		principal: 'input-container',
		buttons: 'button-box-right',
	};
}

export function getIconsBox(icons) {
	const iconContainer = document.createElement('div');
	iconContainer.className = 'icon-container';
	iconContainer.style.textAlign = 'right';

	if (icons && icons[0] && icons[0].type === 'goBack') {
		const backIcon = document.createElement('i');
		backIcon.id = 'back-icon';
		backIcon.className = 'bx bx-arrow-back';
		backIcon.style.visibility = 'hidden';
		backIcon.style.cursor = 'pointer';

		// Resolve the action via the message action registry (no window globals)
		_setButtonAction(backIcon, icons[0].action, undefined);

		iconContainer.appendChild(backIcon);
	}

	const cancelIcon = document.createElement('i');
	cancelIcon.id = 'cancel-icon';
	cancelIcon.className = 'iconify';
	cancelIcon.setAttribute('data-icon', 'material-symbols-light:close');
	cancelIcon.style.cursor = 'pointer';

	iconContainer.appendChild(cancelIcon);

	// Use event delegation on the container so the close button works
	// even if Iconify replaces the <i> element with an <svg> at runtime.
	iconContainer.addEventListener('click', (e) => {
		const icon = (e.target as Element).closest("[data-icon='material-symbols-light:close']");
		if (icon) closeMessage();
	});

	return iconContainer;
}

export function getErrorElement(err) {
	let location = '';
	if (err?.showLocation) {
		const stackTrace = err.error ? err.error.stack : new Error().stack;
		const stackSplit = stackTrace.split('\n');
		location = stackSplit[2] ? stackSplit[2] : stackSplit[stackSplit.length - 1];
		location = location.split('/')[location.split('/').length - 1];
		location = location.trim().replace('at ', '');
	}

	let errorMessage = '';

	if (location && err.error && err.error instanceof Error) {
		errorMessage = translate('messages.errors.with_location', {
			message: err.error.message,
			location,
		});
	} else if (err.error && err.error instanceof Error) {
		errorMessage = translate('messages.errors.without_location', {
			message: err.error.message,
		});
	}

	const errorElement = document.createElement('p');
	errorElement.innerText = errorMessage;
	errorElement.className = 'error-message';

	if (!errorMessage) {
		errorElement.style.display = 'none';
	}

	return errorElement;
}

// Buttons
export function getButton(button) {
	switch (button.type) {
		case 'tryAgain':
			return getTryAgainButton();
		case 'home':
			return getHomeButton();
		case 'goBack':
			return getBackButton(button.action);
		case 'close':
			return getCloseButton();
		case 'cancel':
			return getCloseButton('labels.cancel', button.action);
		case 'confirm':
			return getConfirmButton(button.action, button.label || 'labels.confirm');
		case 'delete':
			return getDeleteButton(button.action);
		case 'deleteBasic':
			return getDeleteButtonBasic(button.action);
		case 'yes':
			return getConfirmButton(button.action, 'labels.yes');
		case 'no':
			return getCloseButton('labels.no', button.action);
		case 'edit':
			return getEditButton(button.action);
		case 'view':
			return getViewButton(button.action);
		case 'download':
			return getDownloadButton(button.action);
		default:
			return getCloseButton('labels.understood');
	}
}

export function getHomeButton() {
	const homeButton = ['edit-trip', 'edit-destination', 'edit-listing'].includes(getHTMLpage())
		? '../index.html'
		: 'index.html';
	const button = document.createElement('button');
	button.className = 'btn btn-secondary btn-format';
	button.type = 'submit';
	button.setAttribute('onclick', `window.location.href = "${homeButton}";`);

	const icon = document.createElement('i');
	icon.id = 'transportation-nav';
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'bx:home');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.home')}`;

	return button;
}

export function getEditButton(action?: { type: string; docId: string }) {
	const button = document.createElement('button');
	button.className = 'btn btn-basic btn-format';
	button.type = 'button';
	button.addEventListener('click', () => {
		if (action?.type && action?.docId) {
			const param = { trips: 't', destinations: 'd', listings: 'l' }[action.type];
			const page = { trips: 'trip', destinations: 'destination', listings: 'listing' }[action.type];
			if (param && page) {
				window.location.href = `${page}?${param}=${action.docId}`;
				return;
			}
		}
		closeMessage();
	});
	button.id = 'message-edit';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'material-symbols:edit');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.edit')}`;

	return button;
}

export function getViewButton(action: { type: string; docId: string }) {
	const { type, docId } = action;
	let url: string;

	switch (type) {
		case 'trips':
			url = `../view.html?t=${docId}&visibility=${getVisibility()}`;
			break;
		case 'destinations':
			url = `../destination.html?d=${docId}&visibility=${getVisibility()}`;
			break;
		case 'listings':
			url = `../view.html?l=${docId}&visibility=${getVisibility()}`;
			break;
		default:
			url = '../index.html';
	}

	const button = document.createElement('button');
	button.className = 'btn btn-theme btn-format';
	button.type = 'button';
	button.setAttribute('onclick', `window.open('${url}', '_blank');`);
	button.id = 'message-view';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'material-symbols:visibility');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.view')}`;

	return button;
}

export function getDownloadButton(onclick) {
	const button = document.createElement('button');
	button.className = 'btn btn-theme btn-format';
	button.type = 'button';
	_setButtonAction(button, onclick, undefined);
	button.id = 'message-download';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'material-symbols:download');

	button.appendChild(icon);
	button.innerHTML += ' Download JSON';

	return button;
}

/**
 * Display a save-success message with Edit, Home, and View buttons.
 * Designed as a drop-in replacement for the legacy modal-content on edit pages.
 *
 * @param options.type - Document type ('trips', 'destinations', 'listings')
 * @param options.docId - The Firestore document ID
 * @param options.content - Success message (optional, defaults to translated save success)
 */
export function displaySaveSuccess({
	type,
	docId,
	content,
}: {
	type: string;
	docId: string;
	content?: string;
}) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = '';
	properties.content = content || translate('messages.documents.save.success');
	properties.buttons = [
		{ type: 'edit', action: { type, docId } },
		{ type: 'home' },
		{ type: 'view', action: { type, docId } },
	];
	displayFullMessage(properties);
}

export function getBackButton(redirectTo = 'index.html') {
	const button = document.createElement('button');
	button.className = 'btn btn-secondary btn-format';
	button.type = 'submit';
	button.setAttribute('onclick', `window.location.href = "${redirectTo}";`);
	button.id = 'message-back';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'bx:home');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.home')}`;

	return button;
}

export function getTryAgainButton() {
	const button = document.createElement('button');
	button.className = 'btn btn-secondary btn-format';
	button.type = 'submit';
	button.setAttribute('onclick', 'window.location.reload(true);');
	button.id = 'message-try-again';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'pajamas:retry');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.try_again')}`;

	return button;
}

export function getCloseButton(label?, onclick?) {
	label = label ? label : translate('labels.understood');
	const button = document.createElement('button');
	button.className = 'btn btn-secondary btn-format';
	button.type = 'button';
	_setButtonAction(button, onclick, closeMessage);
	button.id = 'message-close';

	button.innerHTML = translate(label);
	return button;
}

export function getConfirmButton(onclick = closeMessage, label = 'labels.confirm') {
	const button = document.createElement('button');
	button.className = 'btn btn-theme btn-format';
	button.type = 'button';
	_setButtonAction(button, onclick, closeMessage);
	button.id = 'message-confirm';

	button.innerHTML = translate(label);
	return button;
}

export function getDeleteButton(onclick, buttonClass = 'btn-secondary') {
	const button = document.createElement('button');
	button.className = `btn ${buttonClass} btn-format`;
	button.type = 'button';
	_setButtonAction(button, onclick, closeMessage);
	button.id = 'message-delete';

	const icon = document.createElement('i');
	icon.className = 'iconify';
	icon.setAttribute('data-icon', 'mingcute:delete-2-fill');

	button.appendChild(icon);
	button.innerHTML += ` ${translate('labels.delete')}`;

	return button;
}

export function getDeleteButtonBasic(onclick) {
	return getDeleteButton(onclick, 'btn-basic');
}

/**
 * Registry of named action callbacks so that string-based acao
 * (e.g. "backupAccountData(true)") can be resolved without window.* globals.
 * Uses var (not const) to avoid TDZ errors from circular module dependencies.
 */
var _actionRegistry = Object.create(null);

/**
 * Register one or more named callbacks for string-based button actions.
 * Usage: registerActions({ backupAccountData, openRestoreFilePicker })
 */
export function registerActions(map) {
	if (!_actionRegistry) _actionRegistry = Object.create(null);
	Object.assign(_actionRegistry, map);
}

// Built-in message actions — registered here so they're always available
registerActions({ closeMessage });

/**
 * Attach a click handler to a button.
 * Accepts a function reference, or a legacy string which is resolved
 * against the _actionRegistry.
 */
function _setButtonAction(button, action, defaultFn) {
	if (typeof action === 'function') {
		button.addEventListener('click', action);
	} else if (typeof action === 'string' && action) {
		button.addEventListener('click', () => {
			const match = action.match(/^([\w.]+)\((.*)\)$/);
			if (match) {
				const fn = _actionRegistry[match[1]];
				if (typeof fn === 'function') {
					const rawArgs = match[2] ? match[2].split(',').map((s) => s.trim()) : [];
					const args = rawArgs.map((a) => {
						if (a === 'true') return true;
						if (a === 'false') return false;
						if (a === 'null') return null;
						if (a === 'undefined') return undefined;
						const num = Number(a);
						if (!isNaN(num) && a !== '') return num;
						// Strip surrounding quotes
						return a.replace(/^['"]|['"]$/g, '');
					});
					fn(...args);
					return;
				}
			}
			console.error('Unregistered button action:', action);
			// Fallback: try global eval for pages not yet migrated
			try {
				const fallback = new Function(action);
				fallback();
			} catch (e) {
				console.error('Button action fallback failed:', e);
			}
		});
	} else if (defaultFn) {
		button.addEventListener('click', defaultFn);
	}
}

export function openToast(text) {
	const toast = getID('toast');
	if (!toast) return;
	getID('toast-text').innerHTML = text;
	// Cancel any pending close animation, then play the standardized open one.
	cancelAnimateOut(toast);
	toast.classList.remove(TOAST_LEAVE_CLASS);
	void toast.offsetWidth;
	toast.classList.add(TOAST_ENTER_CLASS);
	toast.style.display = 'flex';
	setTimeout(() => {
		closeToast();
	}, 10000);
}

export function closeToast() {
	const toast = getID('toast');
	if (!toast || toast.style.display === 'none') return;
	if (toast.classList.contains(TOAST_LEAVE_CLASS)) return;
	toast.classList.remove(TOAST_ENTER_CLASS);
	_animateOut(toast, TOAST_LEAVE_CLASS, TOAST_ANIM_DURATION);
}

export function handleMessageKeydown(e) {
	if (!MESSAGE_MODAL_OPEN) return;

	if (e.key === 'Enter') {
		const confirm = getID('message-confirm');
		if (confirm) {
			e.preventDefault();
			confirm.click();
		}
	}

	if (e.key === 'Escape') {
		const close = getID('message-close');
		if (close) {
			e.preventDefault();
			close.click();
			return;
		}

		// fallback: close icon (only if not critical)
		const container = document.querySelector(
			'.message-container, .itinerary-container, .destinations-container, .input-container',
		);
		if (container && !container.classList.contains('critical-message')) {
			e.preventDefault();
			closeMessage();
		}
	}
}
