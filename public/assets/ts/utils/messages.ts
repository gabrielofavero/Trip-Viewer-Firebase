import { cloneObject, getID } from './dom.js';
import { stopLoadingScreen, stopLoadingTimer } from './loading.js';
import { translate } from '../i18n/translation.js';
import { disableScroll, getVisibility } from '../theme/visibility.js';
import { getHTMLpage } from '../app/main.js';
import { fadeIn, fadeOut } from '../theme/animations.js';
import { DOCUMENT_ID } from '../data/state.js';

export let MESSAGE_MODAL_OPEN = false;
// Use var (not const) to avoid TDZ errors from circular module dependencies
export var MESSAGE_PROPERTIES: Record<string, any> = {
	title: '',
	content: '',
	critical: false,
	blur: true,
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
			type: 'back',
			action: redirectTo,
		},
	];
	displayFullMessage(properties);
}

// Fechar Mensagem
export function closeMessage() {
	if (MESSAGE_MODAL_OPEN) {
		const preloader = getID('preloader');
		if (preloader) {
			preloader.style.opacity = '0';
			setTimeout(() => {
				preloader.innerHTML = '';
				preloader.style.background = '';
				preloader.style.display = 'none';
				preloader.style.opacity = '';
			}, 200);
		}
		MESSAGE_MODAL_OPEN = false;
		document.removeEventListener('keydown', handleMessageKeydown);
		if (typeof stopLoadingScreen === 'function') stopLoadingScreen();
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
		backIcon.setAttribute('onclick', icons[0].action);
		backIcon.style.visibility = 'hidden';
		backIcon.style.cursor = 'pointer';

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
			return getConfirmButton(button.action);
		case 'delete':
			return getDeleteButton(button.action);
		case 'deleteBasic':
			return getDeleteButtonBasic(button.action);
		case 'yes':
			return getConfirmButton(button.action, 'labels.yes');
		case 'no':
			return getCloseButton('labels.no', button.action);
		case 'edit':
			return getEditButton();
		case 'view':
			return getViewButton(button.action);
		default:
			return getCloseButton('labels.understood');
	}
}

export function getHomeButton() {
	const homeButton = ['edit-trip', 'edit-destination', 'edit-listing'].includes(getHTMLpage())
		? '../index.html'
		: 'index.html';
	const button = document.createElement('button');
	button.className = 'btn btn-theme btn-format';
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

export function getEditButton() {
	const button = document.createElement('button');
	button.className = 'btn btn-basic btn-format';
	button.type = 'button';
	button.addEventListener('click', closeMessage);
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
		{ type: 'edit' },
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
	getID('toast-text').innerHTML = text;
	fadeIn(['toast']);
	setTimeout(() => {
		closeToast();
	}, 10000);
}

export function closeToast() {
	if (getID('toast').style.display != 'none') {
		fadeOut(['toast']);
	}
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
