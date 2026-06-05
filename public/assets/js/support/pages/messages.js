let MESSAGE_MODAL_OPEN = false;
const MESSAGE_PROPERTIES = {
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

// Mensagem Genérica
export function displayMessage(titulo, conteudo) {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	if (titulo) properties.titulo = titulo;
	if (conteudo) properties.conteudo = conteudo;
	displayFullMessage(properties);
}

// Prompt (Sim / Não)
export function displayPrompt({
	titulo,
	conteudo,
	yesAction,
	noAction = "closeMessage()",
	critico = false,
} = {}) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = titulo;
	propriedades.conteudo = conteudo;
	propriedades.critico = critico;
	propriedades.botoes = [
		{
			tipo: "nao",
			acao: noAction,
		},
		{
			tipo: "sim",
			acao: yesAction,
		},
	];
	displayFullMessage(propriedades);
}

export function displayFullMessage(
	propriedades = cloneObject(MESSAGE_PROPERTIES),
) {
	const preloader = getID("preloader");
	const isErrorMessage = Object.keys(propriedades.erro).length > 0;

	if (typeof _stopLoadingTimer === "function") {
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
	container.className = propriedades.containers.principal;

	// Container de Texto
	const textDiv = document.createElement("div");
	textDiv.className = "message-text-container";

	// Criticidade
	if (!propriedades.critico) {
		const buttonsBox = getIconsBox(propriedades.icones);
		textDiv.appendChild(buttonsBox);
	}

	// Título
	const titleDiv = document.createElement("div");
	titleDiv.className = "message-title";
	titleDiv.id = "message-title";
	titleDiv.innerHTML = propriedades.titulo;
	textDiv.appendChild(titleDiv);

	// Descrição
	const descriptionDiv = document.createElement("div");
	descriptionDiv.className = "message-description";
	descriptionDiv.id = "message-description";
	descriptionDiv.innerHTML = propriedades.conteudo;
	textDiv.appendChild(descriptionDiv);

	// Mensagem de Erro
	if (isErrorMessage) {
		const errorElement = getErrorElement(propriedades.erro, textDiv);
		textDiv.appendChild(errorElement);
	}

	// Botões
	if (propriedades.botoes && propriedades.botoes.length > 0) {
		const buttonBox = document.createElement("div");
		buttonBox.className = propriedades.containers?.botoes || "button-box";

		buttonBox.style.marginTop = "25px";

		for (const buttonType of propriedades.botoes) {
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
	if (propriedades.blur) {
		preloader.style.backdropFilter = "blur(10px)";
		preloader.style.webkitBackdropFilter = "blur(10px)";
	}

	// Adiciona ao Preloader
	preloader.appendChild(container);

	// Exibe o Preloader
	if (preloader.style.display != "block") {
		preloader.style.display = "block";
	}
}

// Mensagem de Erro
export function displayError(erro, tryAgain = false) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);

	propriedades.titulo = translate("messages.errors.load_title");
	propriedades.critico = true;
	propriedades.conteudo = getErrorMessage(erro);
	propriedades.localizacao = false; // Desabilitado. Não faz sentido mostrar ao usuário.

	const botoes = tryAgain ? [{ tipo: "tente-novamente" }] : [];
	if (!window.location.href.includes("index.html")) {
		botoes.push({ tipo: "home" });
	}
	propriedades.botoes = botoes;
	displayFullMessage(propriedades);
}

export function getErrorMessage(erro) {
	const isError = erro && erro instanceof Error;
	const contact = `<a href=\"mailto:gabriel.o.favero@live.com\">${translate("messages.errors.contact_admin")}</a> ${translate("messages.errors.to_report")}`;

	if (!erro || (isError && !erro.message)) {
		return `${translate("messages.errors.unknown")}. ${contact}`;
	} else if (isError) {
		let msg = erro.message;
		if (msg[msg.length - 1] === ".") {
			msg = msg.substring(0, msg.length - 1);
		}
		return `${msg}. ${contact}`;
	} else {
		return erro;
	}
}

// Mensagem de Não Autorizado
export function displayForbidden(conteudo, redirectTo = "view.html") {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = translate("messages.access_denied.title");
	propriedades.conteudo =
		conteudo || translate("messages.access_denied.message");
	propriedades.critico = true;
	propriedades.botoes = [
		{
			tipo: "voltar",
			acao: redirectTo,
		},
	];
	displayFullMessage(propriedades);
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
		if (typeof _stopLoadingScreen === "function") stopLoadingScreen();
	} else {
		console.warn("Cannot close an unopened message modal.");
	}
}

// Funções de Suporte
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

export function getErrorElement(erro) {
	let location = "";
	if (erro?.showLocation) {
		const stackTrace = erro.error ? erro.error.stack : new Error().stack;
		const stackSplit = stackTrace.split("\n");
		location = stackSplit[2]
			? stackSplit[2]
			: stackSplit[stackSplit.length - 1];
		location = location.split("/")[location.split("/").length - 1];
		location = location.trim().replace("at ", "");
	}

	let errorMessage = "";

	if (location && erro.error && erro.error instanceof Error) {
		errorMessage = `Erro "${erro.error.message}" localizado em ${location}`;
	} else if (erro.error && erro.error instanceof Error) {
		errorMessage = `Erro "${erro.error.message}"`;
	}

	const errorElement = document.createElement("p");
	errorElement.innerText = errorMessage;
	errorElement.className = "error-message";

	if (!errorMessage) {
		errorElement.style.display = "none";
	}

	return errorElement;
}

// Botões
export function getButton(botao) {
	switch (botao.tipo) {
		case "tente-novamente":
			return getTryAgainButton();
		case "home":
			return getHomeButton();
		case "voltar":
			return getBackButton(botao.acao);
		case "fechar":
			return getCloseButton();
		case "cancelar":
			return getCloseButton("labels.cancel", botao.acao);
		case "confirmar":
			return getConfirmButton(botao.acao);
		case "apagar":
			return getDeleteButton(botao.acao);
		case "apagar-basico":
			return getDeleteButtonBasic(botao.acao);
		case "sim":
			return getConfirmButton(botao.acao, "labels.yes");
		case "nao":
			return getCloseButton("labels.no", botao.acao);
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

export function getCloseButton(label, onclick) {
	label = label ? label : translate("labels.understood");
	const button = document.createElement("button");
	button.className = "btn btn-secondary btn-format";
	button.type = "submit";
	button.setAttribute("onclick", onclick ? onclick : "closeMessage();");
	button.id = "message-close";

	button.innerHTML = translate(label);
	return button;
}

export function getConfirmButton(
	onclick = "closeMessage();",
	label = "labels.confirm",
) {
	const button = document.createElement("button");
	button.className = "btn btn-theme btn-format";
	button.type = "submit";
	button.setAttribute("onclick", onclick);
	button.id = "message-confirm";

	button.innerHTML = translate(label);
	return button;
}

export function getDeleteButton(onclick, buttonClass = "btn-secondary") {
	const button = document.createElement("button");
	button.className = `btn ${buttonClass} btn-format`;
	button.type = "submit";
	button.setAttribute("onclick", onclick);
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
