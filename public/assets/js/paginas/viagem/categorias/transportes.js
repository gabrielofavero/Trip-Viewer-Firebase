var TRANSPORTE_ICONES = [];
var TRANSPORTE_ATIVO;
var TRANSPORTES_ATIVOS = [];
var TRANSPORTES_ATIVOS_TITULOS = [];

function _loadTransporte() {
	const swiperData = _getSwiperData();

	_buildTransporteSwiper(swiperData);
	_resetSwiperVisibility();

	_observeFlightBoxes();
}

function _getSwiperData() {
	const swiperData = {};

	const visualizacao = FIRESTORE_DATA.transportes.visualizacao || "simple-view";
	const key = visualizacao === "people-view" ? "pessoa" : "idaVolta";
	const complement = key === "pessoa" ? "custom-" : "";

	TRANSPORTES_ATIVOS = [
		...new Set(
			FIRESTORE_DATA.transportes.dados.map(
				(item) => `${complement}${_codifyText(item[key])}`,
			),
		),
	];
	TRANSPORTES_ATIVOS_TITULOS = [
		...new Set(FIRESTORE_DATA.transportes.dados.map((item) => item[key])),
	];
	TRANSPORTE_ATIVO =
		visualizacao === "people-view" ? TRANSPORTES_ATIVOS[0] : "ida";

	for (const transporteAtivo of TRANSPORTES_ATIVOS) {
		swiperData[transporteAtivo] = [];
	}

	for (let i = 0; i < FIRESTORE_DATA.transportes.dados.length; i++) {
		const identifier = `${complement}${_codifyText(FIRESTORE_DATA.transportes.dados[i][key])}`;
		const htmlContent = _getTransporteHTML(i + 1, identifier);
		swiperData[identifier].push(htmlContent);
	}

	return swiperData;
}

function _getTransporteHTML(j, identifier) {
	return `<div class="swiper-slide" id="transporte-slide-${j}">
            <div class="testimonial-item">
                ${_getFlightBoxHTML(j, identifier)}
              </div>
            </div>`;
}

function _getFlightBoxHTML(j, identifier, innerProgramacao = false) {
	const empresa = _getEmpresaObj(j);
	return `<div class="flight-box${innerProgramacao ? " inner-programacao-item" : ""}" id="transporte-${identifier}-box-${j}">
            <div class="flight-diagram">
              <div class="flight-title">
                ${_getImagemHTML(j, empresa)}
                ${_getReservaHTML(j, empresa)}
              </div>
              <div class="flight-text">
                <div class="left-text">
                  ${_getPartidaChegadaHTML(j, "partida")}
                </div>
                <div class="center-text">
                  <i class="flight-line" ${_adjustFlightLine(j)}">_________</i>
                  <i class="iconify flight-icon" data-icon="${_getTransporteIcon(j)}"></i>
                  ${_getDuracaoHTML(j)}
                </div>
                <div class="right-text">
                  ${_getPartidaChegadaHTML(j, "chegada")}
                </div>
              </div>
            </div>
          </div>`;
}

function _getEmpresaObj(j) {
	const transporte = FIRESTORE_DATA.transportes.dados[j - 1];
	const tipo = transporte.transporte;
	const titulo = transporte.empresa;

	const tituloConfig = CONFIG?.transportes?.empresas?.[tipo]?.[titulo];
	const siteConfig = CONFIG?.transportes?.sites?.[tipo]?.[titulo];
	const imagemConfig = CONFIG?.transportes?.imagens?.[tipo]?.[titulo];

	return {
		titulo: tituloConfig || titulo,
		imagens: imagemConfig || {},
		site: siteConfig || "",
		isCustom: !tituloConfig,
	};
}

function _getImagemHTML(j, empresa) {
	const transporte = FIRESTORE_DATA.transportes.dados[j - 1];
	if (!empresa.isCustom) {
		return `<a href="${empresa.site}">
              <img class="flight-img" id="flight-img-claro-${j}" src="${empresa.imagens.claro}"
                style="display: ${_isOnDarkMode() ? "none" : "block"};">
              <img class="flight-img" id="flight-img-escuro-${j}" src="${empresa.imagens.escuro}"
                style="display: ${_isOnDarkMode() ? "block" : "none"};">
            </a>`;
	} else if (empresa.titulo) {
		return `<div class="flight-title-text">${empresa.titulo}</div>`;
	} else {
		return `<div class="flight-title-text">${transporte.pontos.partida} → ${transporte.pontos.chegada}</div>`;
	}
}

function _getReservaHTML(j, empresa) {
	const transporte = FIRESTORE_DATA.transportes.dados[j - 1];
	let reserva = transporte.reserva;
	let link = empresa.site || "";

	if (FIRESTORE_DATA.pin === "sensitive-only") {
		return _getSensitiveReservationHTML("transportes", transporte.id);
	}

	if (transporte.link) {
		link = transporte.link;
	}

	if (!reserva) return "";
	reserva = reserva[0] === "#" ? reserva.slice(1) : reserva;
	const reservation = link
		? `<a class="flight-code" href="${link}" target="_blank">#${reserva}</a>`
		: `<div class="flight-code">#${reserva}</div>`;
	const icon = `<i class="iconify copy-icon" data-icon="mdi:content-copy" onclick="_copyToClipboard('${reserva}')"></i>`;
	return `${reservation} ${icon}`;
}

function _getPartidaChegadaHTML(j, tipo) {
	const transporte = FIRESTORE_DATA.transportes.dados[j - 1];
	const data = _convertFromDateObject(transporte.datas[tipo]);
	const local = transporte.pontos[tipo];
	const flightTimeSuffix = _getLanguagePackName() == "en" ? "-en" : "";

	let result = `<div class="flight-date">${_getDateString(data, "dd/mm")}</div>
                <div class="flight-time${flightTimeSuffix}">${_getTimeStringFromDate(data)}</div>`;

	if (local) result += `<div class="flight-location">${local}</div>`;
	return result;
}

function _getTransporteIcon(j) {
	const tipo = FIRESTORE_DATA.transportes.dados[j - 1].transporte;
	const icone =
		CONFIG.transportes.icones[tipo] || CONFIG.transportes.icones.outro;
	TRANSPORTE_ICONES.push(icone);
	return icone;
}

function _getDuracaoHTML(j) {
	const duracao = FIRESTORE_DATA.transportes.dados[j - 1].duracao;
	if (!duracao) return "";
	else
		return `<div class="flight-duration">${_jsTimeToVisualTime(duracao)}</div>`;
}

function _adjustFlightLine(j) {
	const duracao = FIRESTORE_DATA.transportes.dados[j - 1].duracao;
	if (!duracao) return "style='transform: translateY(-33.75%);'";
	else return "";
}

function _buildTransporteSwiper(swiperData) {
	const visualizacao = FIRESTORE_DATA.transportes.visualizacao;
	const keys = [];

	_loadSwiperPreActions(visualizacao, keys);

	for (const key of keys) {
		const content = getID(`transporte-${key}-content`);
		if (swiperData[key]?.length > 0 || visualizacao === "simple-view") {
			const data =
				visualizacao === "simple-view"
					? [
							...(swiperData["ida"] || []),
							...(swiperData["durante"] || []),
							...(swiperData["volta"] || []),
						]
					: swiperData[key];
			const swiperButtonStyle = data.length > 1 ? "" : `style="display: none"`;

			if (visualizacao != "people-view") {
				getID(`transporte-${key}`).style.display = "block";
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
			_initSwiper(`transporte-${key}`);

			if (FIRESTORE_DATA.transportes.visualizacao == "leg-view") {
				getID(`transporte-${key}`).style.visibility = "hidden";
			}
		}
	}

	function _loadSwiperPreActions(visualizacao, keys) {
		switch (visualizacao) {
			case "simple-view":
				keys.push("ida");
				break;
			case "leg-view":
				keys.push("ida", "durante", "volta");
				_loadAbasTransportes();
				break;
			case "people-view":
				keys.push(...TRANSPORTES_ATIVOS);
				_loadCustomSelectTransportes();
				_loadCustomTransportesDivs();
				break;
		}
		return keys;
	}
}

function _loadTransporteImagens() {
	let j = 1;
	while (getID(`transporte-slide-${j}`)) {
		const claro = getID(`flight-img-claro-${j}`);
		const escuro = getID(`flight-img-escuro-${j}`);

		if (claro && escuro) {
			claro.style.display = _isOnDarkMode() ? "none" : "block";
			escuro.style.display = _isOnDarkMode() ? "block" : "none";
		}

		j++;
	}
}

function _loadIconeGeralTransporte() {
	const unique = [...new Set(TRANSPORTE_ICONES)];
	if (unique.length == 1) {
		getID("transporte-nav").setAttribute("data-icon", unique[0]);
	}
}

function _copyToClipboard(text) {
	navigator.clipboard.writeText(text);
	_openToast(translate("messages.text_copied"));
}

function _loadCustomSelectTransportes() {
	if (TRANSPORTES_ATIVOS.length <= 1) return;
	getID("transporte-select").style.display = "";
	const options = [];
	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		options.push({
			value: TRANSPORTES_ATIVOS[i],
			label: TRANSPORTES_ATIVOS_TITULOS[i],
		});
	}

	const customSelect = {
		id: "transporte-select",
		options: options,
		activeOption: TRANSPORTE_ATIVO,
		action: _customTransporteSelectAction,
	};

	_loadCustomSelect(customSelect);
}

function _loadCustomTransportesDivs() {
	const container = getID("transporte-custom-container");
	container.innerHTML = "";

	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		const transporte = TRANSPORTES_ATIVOS[i];
		const display = i === 0 ? "block" : "none";
		container.innerHTML += `<div class='transporte-box' id="transporte-${transporte}" style="display: ${display}">
                              <div id="transporte-${transporte}-content"></div>
                            </div>`;
	}
}

function _loadAbasTransportes() {
	_loadAbasTransportesHTML();

	getID("tabs-container-transportes").style.display = "";

	for (let i = 0; i < TRANSPORTES_ATIVOS.length; i++) {
		const div = getID(`transporte-${TRANSPORTES_ATIVOS[i]}`);
		div.style.display = i === 0 ? "block" : "none";
		div.style.marginTop = "2em";
	}

	_setTransporteAbasListeners();
}

function _loadAbasTransportesHTML() {
	const tab = getID("tab-transporte");
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

	const childs = _getChildIDs("tab-transporte");
	for (let i = 0; i < childs.length; i++) {
		_setCSSRule(
			`.tabs-container input[id="${childs[i]}"]:checked~.glider`,
			"transform",
			`translateX(${i * 100}%)`,
		);
	}
}

function _setTransporteAbasListeners() {
	TRANSPORTES_ATIVOS.forEach((transporte) => {
		const radio = `radio-${transporte}`;
		getID(radio).addEventListener("click", function () {
			const transporte = radio.replace("radio-", "");
			if (TRANSPORTE_ATIVO === transporte) return;

			const transporteAnterior = TRANSPORTE_ATIVO;
			TRANSPORTE_ATIVO = transporte;

			const anterior = `transporte-${transporteAnterior}`;
			const atual = `transporte-${TRANSPORTE_ATIVO}`;

			getID(atual).style.visibility = "";
			getID(anterior).style.visibility = "";

			_fade([anterior], [atual]);
		});
	});
}

function _observeFlightBoxes() {
	const flightBoxes = document.querySelectorAll(".flight-box");
	if (flightBoxes.length === 0) return;

	let timeoutId;
	const observer = new MutationObserver(() => {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			flightBoxes.forEach((box) => {
				if (box.offsetHeight < 5) {
					_adjustCardsHeights("transporte");
				}
			});
		}, 200);
	});

	flightBoxes.forEach((box) => {
		observer.observe(box, { attributes: true, childList: true, subtree: true });
	});
}

function _adjustTransporteBoxContainerHeight() {
	const elements = document.querySelectorAll(".flight-box");
	const heights = Array.from(elements, (el) => el.offsetHeight);
	heights.push(250);
	const container = getID("transporte-box-container");
	container.style.height = `${Math.max(...heights)}px`;
}

function _resetSwiperVisibility() {
	const visualizacao = FIRESTORE_DATA.transportes.visualizacao || "simple-view";

	switch (visualizacao) {
		case "leg-view":
			_adjustTransporteBoxContainerHeight();
			getID("transporte-ida").style.visibility = "";
			break;
		case "people-view":
			_adjustTransporteBoxContainerHeight();
	}
}

function _customTransporteSelectAction(value) {
	_fade([`transporte-${TRANSPORTE_ATIVO}`], [`transporte-${value}`]);
	TRANSPORTE_ATIVO = value;
}
