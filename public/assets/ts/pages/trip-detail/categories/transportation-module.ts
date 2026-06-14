import { getTransportations } from '../../../app/config.js';
import { getState } from '../../../data/state.js';
import { convertFromDateObject, getDateNoTime, getTodayDateObject } from '../../../utils/dates.js';
import { getLanguagePackName, translate } from '../../../i18n/translation.js';
import { getChildIDs, getID } from '../../../utils/dom.js';
import { isOnDarkMode } from '../../../theme/visibility.js';
import { openToast } from '../../../utils/messages.js';
import { loadCustomSelect } from '../../../ui/custom-select.js';
import { setCSSRule } from '../../../theme/stylesheets.js';
import { fade } from '../../../theme/animations.js';
import { getSensitiveReservationHTML } from "../support/sensitive-reservation.js";
import { initSwiper } from "../support/swiper.js";
import { ADJUST_HEIGHT_CARDS, adjustCardsHeights } from "../support/visibility.js";
import { getDateString, getTimeStringFromDate, jsTimeToVisualTime } from "../../../utils/dates.js";
import { codifyText } from "../../../utils/dom.js";
import { END_DATE } from "../view.js";
import { START_DATE } from "../view.js";

var TRANSPORTE_ICONES = [];
var ACTIVE_TRANSPORTATION;
var TRANSPORTES_ATIVOS = [];
var TRANSPORTES_ATIVOS_TITULOS = [];

/** Maps Portuguese data keys to English HTML element suffixes (from cleanup refactoring) */
function mapTransportationKey(key: string): string {
	const map: Record<string, string> = {
		ida: "outbound",
		durante: "internal",
		volta: "return",
	};
	return map[key] || key;
}

export function loadTransportation() {
	const swiperData = getSwiperData();

	buildTransportationSwiper(swiperData);
	resetSwiperVisibility();

	observeFlightBoxes();
	autoNavigateTransportation();
}

function getSwiperData() {
	const swiperData = {};

	const viewMode = getState().transportes.visualizacao || "simple-view";
	const key = viewMode === "people-view" ? "pessoa" : "idaVolta";
	const complement = key === "pessoa" ? "custom-" : "";

	TRANSPORTES_ATIVOS = [
		...new Set(
			getState().transportes.dados.map(
				(item) => `${complement}${codifyText(item[key])}`,
			),
		),
	];
	TRANSPORTES_ATIVOS_TITULOS = [
		...new Set(getState().transportes.dados.map((item) => item[key])),
	];
	ACTIVE_TRANSPORTATION =
		viewMode === "people-view" ? TRANSPORTES_ATIVOS[0] : "ida";

	for (const transporteAtivo of TRANSPORTES_ATIVOS) {
		swiperData[transporteAtivo] = [];
	}

	for (let i = 0; i < getState().transportes.dados.length; i++) {
		const identifier = `${complement}${codifyText(getState().transportes.dados[i][key])}`;
		const htmlContent = getTransportationHTML(i + 1, identifier);
		swiperData[identifier].push(htmlContent);
	}

	return swiperData;
}

function getTransportationHTML(j, identifier) {
	return `<div class="swiper-slide" id="transporte-slide-${j}">
            <div class="testimonial-item">
                ${getFlightBoxHTML(j, identifier)}
              </div>
            </div>`;
}

export function getFlightBoxHTML(j, identifier, innerItinerary = false) {
	const company = getEmpresaObj(j);
	return `<div class="flight-box${innerItinerary ? " inner-programacao-item" : ""}" id="transporte-${identifier}-box-${j}">
            <div class="flight-diagram">
              <div class="flight-title">
                ${getImagemHTML(j, company)}
                ${getReservaHTML(j, company)}
              </div>
              <div class="flight-text">
                <div class="left-text">
                  ${getPartidaChegadaHTML(j, "partida")}
                </div>
                <div class="center-text">
                  <i class="flight-line" ${adjustFlightLine(j)}">_________</i>
                  <i class="iconify flight-icon" data-icon="${getTransportationIcon(j)}"></i>
                  ${getDuracaoHTML(j)}
                </div>
                <div class="right-text">
                  ${getPartidaChegadaHTML(j, "chegada")}
                </div>
              </div>
            </div>
          </div>`;
}

function getEmpresaObj(j) {
	const transporte = getState().transportes.dados[j - 1];
	const tipo = transporte.transporte;
	const titulo = transporte.empresa;

	const transportation = getTransportations();
	const titleConfig = transportation?.companies?.[tipo]?.[titulo];
	const websiteConfig = transportation?.websites?.[tipo]?.[titulo];
	const imageConfig = transportation?.images?.[tipo]?.[titulo];

	return {
		title: titleConfig || titulo,
		images: imageConfig || {},
		website: websiteConfig || "",
		isCustom: !titleConfig,
	};
}

function getImagemHTML(j, company) {
	const transporte = getState().transportes.dados[j - 1];
	if (!company.isCustom) {
		return `<a href="${company.website}">
              <img class="flight-img" id="flight-img-claro-${j}" src="${company.images.light}"
                style="display: ${isOnDarkMode() ? "none" : "block"};">
              <img class="flight-img" id="flight-img-escuro-${j}" src="${company.images.dark}"
                style="display: ${isOnDarkMode() ? "block" : "none"};">
            </a>`;
	} else if (company.title) {
		return `<div class="flight-title-text">${company.title}</div>`;
	} else {
		return `<div class="flight-title-text">${transporte.pontos.partida} → ${transporte.pontos.chegada}</div>`;
	}
}

function getReservaHTML(j, company) {
	const transporte = getState().transportes.dados[j - 1];
	let reserva = transporte.reserva;
	let link = company.website || "";

	if (getState().pin === "sensitive-only") {
		return getSensitiveReservationHTML("transportes", transporte.id);
	}

	if (transporte.link) {
		link = transporte.link;
	}

	if (!reserva) return "";
	reserva = reserva[0] === "#" ? reserva.slice(1) : reserva;
	const reservation = link
		? `<a class="flight-code" href="${link}" target="_blank">#${reserva}</a>`
		: `<div class="flight-code">#${reserva}</div>`;
	const icon = `<i class="iconify copy-icon" data-icon="mdi:content-copy" data-action="copy-to-clipboard" data-text="${reserva}"></i>`;
	return `${reservation} ${icon}`;
}

function getPartidaChegadaHTML(j, tipo) {
	const transporte = getState().transportes.dados[j - 1];
	const data = convertFromDateObject(transporte.datas[tipo]);
	const local = transporte.pontos[tipo];
	const flightTimeSuffix = getLanguagePackName() == "en" ? "-en" : "";

	let result = `<div class="flight-date">${getDateString(data, "dd/mm")}</div>
                <div class="flight-time${flightTimeSuffix}">${getTimeStringFromDate(data)}</div>`;

	if (local) result += `<div class="flight-location">${local}</div>`;
	return result;
}

function getTransportationIcon(j) {
	const tipo = getState().transportes.dados[j - 1].transporte;
	const icone =
		getTransportations().icons[tipo] || getTransportations().icons.other;
	TRANSPORTE_ICONES.push(icone);
	return icone;
}

function getDuracaoHTML(j) {
	const duracao = getState().transportes.dados[j - 1].duracao;
	if (!duracao) return "";
	else
		return `<div class="flight-duration">${jsTimeToVisualTime(duracao)}</div>`;
}

function adjustFlightLine(j) {
	const duracao = getState().transportes.dados[j - 1].duracao;
	if (!duracao) return "style='transform: translateY(-33.75%);'";
	else return "";
}

function buildTransportationSwiper(swiperData) {
	const viewMode = getState().transportes.visualizacao;
	const keys = [];

	loadSwiperPreActions(viewMode, keys);

	for (const key of keys) {
		const content = getID(`transportation-${mapTransportationKey(key)}-content`);
		if (swiperData[key]?.length > 0 || viewMode === "simple-view") {
			const data =
				viewMode === "simple-view"
					? [
							...(swiperData["ida"] || []),
							...(swiperData["durante"] || []),
							...(swiperData["volta"] || []),
						]
					: swiperData[key];
			const swiperButtonStyle = data.length > 1 ? "" : `style="display: none"`;

			if (viewMode != "people-view") {
				getID(`transportation-${mapTransportationKey(key)}`).style.display = "block";
			}

			content.innerHTML = `<div id="transporte-${key}-swiper" class="testimonials-slider swiper aos-init aos-animate" data-aos="fade-up" data-aos-delay="100">
                        <div class="swiper-wrapper" id="transporte-${key}-wrapper">
                          ${data.join("")}
                        </div>
                        <div class="swiper-controls">
                          <div class="swiper-button-prev transporte-${key}-prev" ${swiperButtonStyle}></div>
                          <div class="swiper-pagination transporte-${key}-pagination"></div>
                          <div class="swiper-button-next transporte-${key}-next" ${swiperButtonStyle}></div>
                        </div>
                      </div>`;

			ADJUST_HEIGHT_CARDS.push(`transporte-${key}`);
			initSwiper(`transporte-${key}`);

			if (getState().transportes.visualizacao == "leg-view") {
				getID(`transportation-${mapTransportationKey(key)}`).style.visibility = "hidden";
			}
		}
	}

	function loadSwiperPreActions(viewMode, keys) {
		switch (viewMode) {
			case "simple-view":
				keys.push("ida");
				break;
			case "leg-view":
				keys.push("ida", "durante", "volta");
				loadTransportationTabs();
				break;
			case "people-view":
				keys.push(...TRANSPORTES_ATIVOS);
				loadCustomTransportationSelect();
				loadCustomTransportationDivs();
				break;
		}
		return keys;
	}
}

export function loadTransportationImages() {
	let j = 1;
	while (getID(`transporte-slide-${j}`)) {
		const claro = getID(`flight-img-claro-${j}`);
		const escuro = getID(`flight-img-escuro-${j}`);

		if (claro && escuro) {
			claro.style.display = isOnDarkMode() ? "none" : "block";
			escuro.style.display = isOnDarkMode() ? "block" : "none";
		}

		j++;
	}
}

function loadGeneralTransportationIcon() {
	const unique = [...new Set(TRANSPORTE_ICONES)];
	if (unique.length == 1) {
		getID("transporte-nav").setAttribute("data-icon", unique[0]);
	}
}

export function copyToClipboard(text) {
	navigator.clipboard.writeText(text);
	openToast(translate("messages.text_copied"));
}

function loadCustomTransportationSelect() {
	if (TRANSPORTES_ATIVOS.length <= 1) return;
	getID("transportation-select").style.display = "";
	const options = [];
	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		options.push({
			value: TRANSPORTES_ATIVOS[i],
			label: TRANSPORTES_ATIVOS_TITULOS[i],
		});
	}

	const customSelect = {
		id: "transportation-select",
		options: options,
		activeOption: ACTIVE_TRANSPORTATION,
		action: customTransportationSelectAction,
	};

	loadCustomSelect(customSelect);
}

function loadCustomTransportationDivs() {
	const container = getID("transportation-custom-container");
	container.innerHTML = "";

	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		const transporte = TRANSPORTES_ATIVOS[i];
		const display = i === 0 ? "block" : "none";
		container.innerHTML += `<div class='transporte-box' id="transportation-${transporte}" style="display: ${display}">
                              <div id="transportation-${transporte}-content"></div>
                            </div>`;
	}
}

function loadTransportationTabs() {
	loadTransportationTabsHTML();

	const tabsContainer = getID("tabs-container-transportation");
	if (tabsContainer) tabsContainer.style.display = "";

	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		const div = getID(`transportation-${mapTransportationKey(TRANSPORTES_ATIVOS[i])}`);
		if (!div) continue;
		div.style.display = i === 0 ? "block" : "none";
		div.style.marginTop = "2em";
	}

	setTransportationTabListeners();
}

function loadTransportationTabsHTML() {
	const tab = getID("tab-transportation");
	if (!tab) return;
	const itemMap = {
		ida: "departure",
		durante: "during",
		volta: "return",
	};

	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		const item = TRANSPORTES_ATIVOS[i];
		const checked = i === 0 ? "checked" : "";
		const translation = translate(`trip.transportation.${itemMap[item]}`);
		tab.innerHTML += `<input type="radio" id="radio-${item}" name="tabs-transporte" ${checked}>`;
		tab.innerHTML += `<label class="tab" for="radio-${item}">${translation}</label>`;
	}

	tab.innerHTML += '<span class="glider"></span>';

	const childs = getChildIDs("tab-transportation");
	for (let i = 0; i < childs.length; i++) {
		setCSSRule(
			`.tabs-container input[id="${childs[i]}"]:checked~.glider`,
			"transform",
			`translateX(${i * 100}%)`,
		);
	}
}

function setTransportationTabListeners() {
	TRANSPORTES_ATIVOS.forEach((transporte) => {
		const radio = `radio-${transporte}`;
		const radioEl = getID(radio);
		if (!radioEl) return;
		radioEl.addEventListener("click", function () {
			const transporte = radio.replace("radio-", "");
			if (ACTIVE_TRANSPORTATION === transporte) return;

			const transporteAnterior = ACTIVE_TRANSPORTATION;
			ACTIVE_TRANSPORTATION = transporte;

			const anterior = `transportation-${mapTransportationKey(transporteAnterior)}`;
			const atual = `transportation-${mapTransportationKey(ACTIVE_TRANSPORTATION)}`;

			const atualEl = getID(atual);
			const anteriorEl = getID(anterior);
			if (atualEl) atualEl.style.visibility = "";
			if (anteriorEl) anteriorEl.style.visibility = "";

			fade([anterior], [atual]);
		});
	});
}

function observeFlightBoxes() {
	const flightBoxes = document.querySelectorAll(".flight-box");
	if (flightBoxes.length === 0) return;

	let timeoutId;
	const observer = new MutationObserver(() => {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			flightBoxes.forEach((box) => {
			if ((box as HTMLElement).offsetHeight < 5) {
					adjustCardsHeights("transporte");
				}
			});
		}, 200);
	});

	flightBoxes.forEach((box) => {
		observer.observe(box, { attributes: true, childList: true, subtree: true });
	});
}

export function adjustTransportationBoxContainerHeight() {
	const elements = document.querySelectorAll(".flight-box");
	const heights = Array.from(elements, (el) => (el as HTMLElement).offsetHeight);
	heights.push(250);
	const container = getID("transportation-box-container");
	container.style.height = `${Math.max(...heights)}px`;
}

function resetSwiperVisibility() {
	const viewMode = getState().transportes.visualizacao || "simple-view";

	switch (viewMode) {
		case "leg-view":
			adjustTransportationBoxContainerHeight();
			getID("transportation-outbound").style.visibility = "";
			break;
		case "people-view":
			adjustTransportationBoxContainerHeight();
	}
}

function customTransportationSelectAction(value) {
	fade([`transportation-${ACTIVE_TRANSPORTATION}`], [`transportation-${value}`]);
	ACTIVE_TRANSPORTATION = value;
}

function autoNavigateTransportation() {
	const hoje = getDateNoTime(convertFromDateObject(getTodayDateObject()));
	const dados = getState().transportes.dados;
	if (!dados || dados.length === 0) return;

	let targetIndex;

	// Outside trip dates → show first element
	if (START_DATE?.date && END_DATE?.date) {
		if (
			hoje < getDateNoTime(START_DATE.date) ||
			hoje > getDateNoTime(END_DATE.date)
		) {
			targetIndex = 0;
		}
	}

	// Inside trip → find most relevant transport
	if (targetIndex === undefined) {
		const todayIndices = [];
		for (let i = 0; i < dados.length; i++) {
			const partida = getDateNoTime(
				convertFromDateObject(dados[i].datas.partida),
			);
			if (partida.getTime() === hoje.getTime()) {
				todayIndices.push(i);
			}
		}

		if (todayIndices.length > 0) {
			// Sort today's transports by partida time
			todayIndices.sort(
				(a, b) =>
					convertFromDateObject(dados[a].datas.partida).getTime() -
					convertFromDateObject(dados[b].datas.partida).getTime(),
			);

			const now = new Date();

			for (const idx of todayIndices) {
				const chegada = convertFromDateObject(dados[idx].datas.chegada);
				if (now <= chegada) {
					targetIndex = idx;
					break;
				}
			}

			// After the last transport's chegada → keep on the last one of today
			if (targetIndex === undefined) {
				targetIndex = todayIndices[todayIndices.length - 1];
			}
		} else {
			// No transport today → find closest future
			let closestDiff = Infinity;
			for (let i = 0; i < dados.length; i++) {
				const partida = getDateNoTime(
					convertFromDateObject(dados[i].datas.partida),
				);
				const diff = partida.getTime() - hoje.getTime();
				if (diff > 0 && diff < closestDiff) {
					closestDiff = diff;
					targetIndex = i;
				}
			}
		}
	}

	if (targetIndex === undefined || targetIndex < 0) return;

	const visualizacao = getState().transportes.visualizacao || "simple-view";

	if (visualizacao === "simple-view") {
		const swiperEl = getID("transporte-ida-swiper");
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(targetIndex, 600);
		}
	} else if (visualizacao === "leg-view") {
		const key = "idaVolta";
		const targetGroup = dados[targetIndex][key];

		const radio = getID(`radio-${targetGroup}`);
		if (radio) radio.click();

		let slideIndex = 0;
		for (let i = 0; i < targetIndex; i++) {
			if (dados[i][key] === targetGroup) slideIndex++;
		}

		const swiperEl = getID(`transporte-${targetGroup}-swiper`);
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(slideIndex, 600);
		}
	} else if (visualizacao === "people-view") {
		const key = "pessoa";
		const targetGroup = dados[targetIndex][key];
		const groupId = `custom-${codifyText(targetGroup)}`;

		customTransportationSelectAction(groupId);

		let slideIndex = 0;
		for (let i = 0; i < targetIndex; i++) {
			if (dados[i][key] === targetGroup) slideIndex++;
		}

		const swiperEl = getID(`transporte-${groupId}-swiper`);
		if (swiperEl?.swiper) {
			swiperEl.swiper.slideTo(slideIndex, 600);
		}
	}
}
