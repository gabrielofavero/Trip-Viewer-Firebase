import { cloneObject, getID } from './dom.js';
import { stopLoadingScreen, stopLoadingTimer } from './loading.js';
import { translate } from '../i18n/translation.js';
import { disableScroll } from '../theme/visibility.js';
import { getHTMLpage } from '../app/main.js';
import { fadeIn, fadeOut } from '../theme/animations.js';

export let MESSAGE_MODAL_OPEN = false;
export const MESSAGE_PROPERTIES = {
	titulo: "",
	conteudo: "",
	critico: false,
	blur: true,
	erro: {},
	icones: [],
	botoes: [
		{
			tipo: "ok",
			acao: "",
		},
	],
	containers: {
		principal: "message-container",
		botoes: "button-box",
	},
};

// Generic Message
export function displayMessage(title, content) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	if (title) properties.titulo = title;
	if (content) properties.conteudo = content;
	displayFullMessage(properties);
}

// Prompt (Yes / No)
export function displayPrompt({
	titulo: title,
	conteudo: content,
	yesAction,
	noAction = "closeMessage()",
	critico = false,
}: {
	titulo?: string;
	conteudo?: string;
	yesAction?: string | (() => void);
	noAction?: string | (() => void);
	critico?: boolean;
} = {}) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = title;
	properties.conteudo = content;
	properties.critico = critico;
	properties.botoes = [
		{
			tipo: "nao",
			acao: noAction,
		},
		{
			tipo: "sim",
			acao: yesAction,
		},
	];
	displayFullMessage(properties);
}

export function displayFullMessage(
	properties = cloneObject(MESSAGE_PROPERTIES),
) {
	const preloader = getID("preloader");
	const isErrorMessage = Object.keys(properties.erro).length > 0;

	if (typeof stopLoadingTimer === "function") {
		stopLoadingTimer();
	}

	if (!preloader) {
		console.warn("Canot show message. Preloader not found");
		return;
	}

	MESSAGE_MODAL_OPEN = true;
	document.addEventListener("keydown", handleMessageKeydown);
	disableScroll();

	// Container
	const container = document.createElement("div");
	container.className = properties.containers.principal;

	// Container de Texto
	const textDiv = document.createElement("div");
	textDiv.className = "message-text-container";

	// Criticidade
	if (!properties.critico) {
		const buttonsBox = getIconsBox(properties.icones);
		textDiv.appendChild(buttonsBox);
	}

	// Title
	const titleDiv = document.createElement("div");
	titleDiv.className = "message-title";
	titleDiv.id = "message-title";
	titleDiv.innerHTML = properties.titulo;
	textDiv.appendChild(titleDiv);

	// Description
	const descriptionDiv = document.createElement("div");
	descriptionDiv.className = "message-description";
	descriptionDiv.id = "message-description";
	descriptionDiv.innerHTML = properties.conteudo;
	textDiv.appendChild(descriptionDiv);

	// Mensagem de Erro
	if (isErrorMessage) {
		const errorElement = getErrorElement(properties.erro);
		textDiv.appendChild(errorElement);
	}

	// Buttons
	if (properties.botoes && properties.botoes.length > 0) {
		const buttonBox = document.createElement("div");
		buttonBox.className = properties.containers?.botoes || "button-box";

		buttonBox.style.marginTop = "25px";

		for (const buttonType of properties.botoes) {
			const button = getButton(buttonType);
			buttonBox.appendChild(button);
		}

		textDiv.appendChild(buttonBox);
	}

	// Adiciona ao Container
	container.appendChild(textDiv);
	preloader.innerHTML = "";
	preloader.style.background = "rgba(0, 0, 0, 0.6)";

	// Blur
	if (properties.blur) {
		preloader.style.backdropFilter = "blur(10px)";
		(preloader.style as any).webkitBackdropFilter = "blur(10px)";
	}

	// Adiciona ao Preloader
	preloader.appendChild(container);

	// Exibe o Preloader
	if (preloader.style.display != "block") {
		preloader.style.display = "block";
	}
}

// Mensagem de Erro
export function displayError(error, tryAgain = false) {
	const properties = cloneObject(MESSAGE_PROPERTIES);

	properties.titulo = translate("messages.errors.load_title");
	properties.critico = true;
	properties.conteudo = getErrorMessage(error);
	properties.localizacao = false; // Disabled. No point in showing to the user.

	const buttons = tryAgain ? [{ tipo: "tente-novamente" }] : [];
	if (!window.location.href.includes("index.html")) {
		buttons.push({ tipo: "home" });
	}
	properties.botoes = buttons;
	displayFullMessage(properties);
}

export function getErrorMessage(error) {
	const isError = error && error instanceof Error;
	const contact = `<a href=\"mailto:gabriel.o.favero@live.com\">${translate("messages.errors.contact_admin")}</a> ${translate("messages.errors.to_report")}`;

	if (!error || (isError && !error.message)) {
		return `${translate("messages.errors.unknown")}. ${contact}`;
	} else if (isError) {
		let msg = error.message;
		if (msg[msg.length - 1] === ".") {
			msg = msg.substring(0, msg.length - 1);
		}
		return `${msg}. ${contact}`;
	} else {
		return error;
	}
}

// Unauthorized Message
export function displayForbidden(content, redirectTo = "view.html") {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = translate("messages.access_denied.title");
	properties.conteudo =
		content || translate("messages.access_denied.message");
	properties.critico = true;
	properties.botoes = [
		{
			tipo: "voltar",
			acao: redirectTo,
		},
	];
	displayFullMessage(properties);
}

// Fechar Mensagem
export function closeMessage() {
	if (MESSAGE_MODAL_OPEN) {
		const preloader = getID("preloader");
		if (preloader) {
			preloader.innerHTML = "";
			preloader.style.background = "";
		}
		MESSAGE_MODAL_OPEN = false;
		document.removeEventListener("keydown", handleMessageKeydown);
		if (typeof stopLoadingScreen === "function") stopLoadingScreen();
	} else {
		console.warn("Cannot close an unopened message modal.");
	}
}

// Support Functions
export function getContainersInput() {
	return {
		principal: "input-container",
		botoes: "button-box-right",
	};
}

export function getIconsBox(icones) {
	const iconContainer = document.createElement("div");
	iconContainer.className = "icon-container";
	iconContainer.style.textAlign = "right";

	if (icones && icones[0] && icones[0].tipo === "voltar") {
		const backIcon = document.createElement("i");
		backIcon.id = "back-icon";
		backIcon.className = "bx bx-arrow-back";
		backIcon.setAttribute("onclick", icones[0].acao);
		backIcon.style.visibility = "hidden";
		backIcon.style.cursor = "pointer";

		iconContainer.appendChild(backIcon);
	}

	const cancelIcon = document.createElement("i");
	cancelIcon.id = "cancel-icon";
	cancelIcon.className = "iconify";
	cancelIcon.setAttribute("data-icon", "material-symbols-light:close");
	cancelIcon.setAttribute("onclick", "closeMessage()");
	cancelIcon.style.cursor = "pointer";

	iconContainer.appendChild(cancelIcon);

	return iconContainer;
}

export function getErrorElement(err) {
	let location = "";
	if (err?.showLocation) {
		const stackTrace = err.error ? err.error.stack : new Error().stack;
		const stackSplit = stackTrace.split("\n");
		location = stackSplit[2]
			? stackSplit[2]
			: stackSplit[stackSplit.length - 1];
		location = location.split("/")[location.split("/").length - 1];
		location = location.trim().replace("at ", "");
	}

	let errorMessage = "";

	if (location && err.error && err.error instanceof Error) {
		errorMessage = `Erro "${err.error.message}" localizado em ${location}`;
	} else if (err.error && err.error instanceof Error) {
		errorMessage = `Erro "${err.error.message}"`;
	}

	const errorElement = document.createElement("p");
	errorElement.innerText = errorMessage;
	errorElement.className = "error-message";

	if (!errorMessage) {
		errorElement.style.display = "none";
	}

	return errorElement;
}

// Buttons
export function getButton(button) {
	switch (button.tipo) {
		case "tente-novamente":
			return getTryAgainButton();
		case "home":
			return getHomeButton();
		case "voltar":
			return getBackButton(button.acao);
		case "fechar":
			return getCloseButton();
		case "cancelar":
			return getCloseButton("labels.cancel", button.acao);
		case "confirmar":
			return getConfirmButton(button.acao);
		case "apagar":
			return getDeleteButton(button.acao);
		case "apagar-basico":
			return getDeleteButtonBasic(button.acao);
		case "sim":
			return getConfirmButton(button.acao, "labels.yes");
		case "nao":
			return getCloseButton("labels.no", button.acao);
		default:
			return getCloseButton("labels.understood");
	}
}

export function getHomeButton() {
	const homeButton = [
		"edit-trip",
		"edit-destination",
		"edit-listing",
	].includes(getHTMLpage())
		? "../index.html"
		: "index.html";
	const button = document.createElement("button");
	button.className = "btn btn-theme btn-format";
	button.type = "submit";
	button.setAttribute("onclick", `window.location.href = "${homeButton}";`);

	const icon = document.createElement("i");
	icon.id = "transporte-nav";
	icon.className = "iconify";
	icon.setAttribute("data-icon", "bx:home");

	button.appendChild(icon);
	button.innerHTML += ` ${translate("labels.home")}`;

	return button;
}

export function getBackButton(redirectTo = "index.html") {
	const button = document.createElement("button");
	button.className = "btn btn-secondary btn-format";
	button.type = "submit";
	button.setAttribute("onclick", `window.location.href = "${redirectTo}";`);
	button.id = "message-back";

	const icon = document.createElement("i");
	icon.className = "iconify";
	icon.setAttribute("data-icon", "bx:home");

	button.appendChild(icon);
	button.innerHTML += ` ${translate("labels.home")}`;

	return button;
}

export function getTryAgainButton() {
	const button = document.createElement("button");
	button.className = "btn btn-secondary btn-format";
	button.type = "submit";
	button.setAttribute("onclick", "window.location.reload(true);");
	button.id = "message-try-again";

	const icon = document.createElement("i");
	icon.className = "iconify";
	icon.setAttribute("data-icon", "pajamas:retry");

	button.appendChild(icon);
	button.innerHTML += ` ${translate("labels.try_again")}`;

	return button;
}

export function getCloseButton(label?, onclick?) {
	label = label ? label : translate("labels.understood");
	const button = document.createElement("button");
	button.className = "btn btn-secondary btn-format";
	button.type = "button";
	_setButtonAction(button, onclick, closeMessage);
	button.id = "message-close";

	button.innerHTML = translate(label);
	return button;
}

export function getConfirmButton(
	onclick = closeMessage,
	label = "labels.confirm",
) {
	const button = document.createElement("button");
	button.className = "btn btn-theme btn-format";
	button.type = "button";
	_setButtonAction(button, onclick, closeMessage);
	button.id = "message-confirm";

	button.innerHTML = translate(label);
	return button;
}

export function getDeleteButton(onclick, buttonClass = "btn-secondary") {
	const button = document.createElement("button");
	button.className = `btn ${buttonClass} btn-format`;
	button.type = "button";
	_setButtonAction(button, onclick, closeMessage);
	button.id = "message-delete";

	const icon = document.createElement("i");
	icon.className = "iconify";
	icon.setAttribute("data-icon", "mingcute:delete-2-fill");

	button.appendChild(icon);
	button.innerHTML += ` ${translate("labels.delete")}`;

	return button;
}

export function getDeleteButtonBasic(onclick) {
	return getDeleteButton(onclick, "btn-basic");
}

/**
 * Registry of named action callbacks so that string-based acao
 * (e.g. "backupAccountData(true)") can be resolved without window.* globals.
 */
const _actionRegistry = Object.create(null);

/**
 * Register one or more named callbacks for string-based button actions.
 * Usage: registerActions({ backupAccountData, openRestoreFilePicker })
 */
export function registerActions(map) {
	Object.assign(_actionRegistry, map);
}

/**
 * Attach a click handler to a button.
 * Accepts a function reference, or a legacy string which is resolved
 * against the _actionRegistry.
 */
function _setButtonAction(button, action, defaultFn) {
	if (typeof action === "function") {
		button.addEventListener("click", action);
	} else if (typeof action === "string" && action) {
		button.addEventListener("click", () => {
			const match = action.match(/^([\w.]+)\((.*)\)$/);
			if (match) {
				const fn = _actionRegistry[match[1]];
				if (typeof fn === "function") {
					const rawArgs = match[2] ? match[2].split(",").map(s => s.trim()) : [];
					const args = rawArgs.map(a => {
						if (a === "true") return true;
						if (a === "false") return false;
						if (a === "null") return null;
						if (a === "undefined") return undefined;
						const num = Number(a);
						if (!isNaN(num) && a !== "") return num;
						// Strip surrounding quotes
						return a.replace(/^['"]|['"]$/g, "");
					});
					fn(...args);
					return;
				}
			}
			console.error("Unregistered button action:", action);
			// Fallback: try global eval for pages not yet migrated
			try {
				const fallback = new Function(action);
				fallback();
			} catch (_) {
				// Silently ignore if even the fallback fails
			}
		});
	} else if (defaultFn) {
		button.addEventListener("click", defaultFn);
	}
}

export function openToast(text) {
	getID("toast-text").innerHTML = text;
	fadeIn(["toast"]);
	setTimeout(() => {
		closeToast();
	}, 10000);
}

export function closeToast() {
	if (getID("toast").style.display != "none") {
		fadeOut(["toast"]);
	}
}

export function handleMessageKeydown(e) {
	if (!MESSAGE_MODAL_OPEN) return;

	if (e.key === "Enter") {
		const confirm = getID("message-confirm");
		if (confirm) {
			e.preventDefault();
			confirm.click();
		}
	}

	if (e.key === "Escape") {
		const close = getID("message-close");
		if (close) {
			e.preventDefault();
			close.click();
			return;
		}

		// fallback: close icon (only if not critical)
		const container = document.querySelector(".message-container");
		if (container && !container.classList.contains("critical-message")) {
			e.preventDefault();
			closeMessage();
		}
	}
}
