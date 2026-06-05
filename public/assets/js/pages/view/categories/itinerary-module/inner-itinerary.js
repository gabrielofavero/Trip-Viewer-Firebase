import { getItinerary, getCurrencies } from '../../../../core/config.js';

var SCHEDULE_OPEN = false;
var CURRENT_SCHEDULE_DATE = {
	dia: 0,
	mes: 0,
	ano: 0,
};
var CURRENT_SCHEDULE = null;
var CURRENT_INNER_ITINERARY = [];

function loadModalContentCalendar() {
	let titulo = CURRENT_SCHEDULE.titulo;
	const data = getDateTitle(
		convertFromDateObject(CURRENT_SCHEDULE.data),
		"weekday_day_month",
	);

	getID("programacao-titulo").querySelector(".titulo").innerText =
		getScheduleTitle(titulo, CURRENT_SCHEDULE.destinosIDs);
	getID("programacao-data").innerText = data;

	CURRENT_INNER_ITINERARY = [];

	loadInnerItineraryHTML();

	// Helpers
	function loadInnerItineraryHTML() {
		const shouldShowCheckbox = shouldShowCheckbox();
		getID("innner-programacao-travelers-checkboxes").style.display =
			shouldShowCheckbox ? "" : "none";

		if (shouldShowCheckbox) {
			loadItineraryTravelersCheckboxes();
			loadItineraryTravelersCheckboxAction();
			return;
		}

		setModalCalendarInnerHTML(
			getID("programacao-itens-madrugada"),
			CURRENT_SCHEDULE.madrugada,
		);
		setModalCalendarInnerHTML(
			getID("programacao-itens-manha"),
			CURRENT_SCHEDULE.manha,
		);
		setModalCalendarInnerHTML(
			getID("programacao-itens-tarde"),
			CURRENT_SCHEDULE.tarde,
		);
		setModalCalendarInnerHTML(
			getID("programacao-itens-noite"),
			CURRENT_SCHEDULE.noite,
		);

		adaptModalCalendarInnerHTML();
	}

	function shouldShowCheckbox() {
		if (!CURRENT_SCHEDULE || !TRAVELERS?.length) return false;

		const periods = getItinerary().timeofday;
		const combinations = new Set();

		for (const period of periods) {
			const items = CURRENT_SCHEDULE[period] || [];

			for (const item of items) {
				const presentes = (item.pessoas || [])
					.filter((p) => p.isPresent)
					.map((p) => p.id)
					.sort();

				const key = presentes.join("|");

				combinations.add(key);
			}
		}

		if (combinations.size <= 1) {
			return false;
		}

		return true;
	}
}

function openModalCalendar(programacao, instant = false) {
	CURRENT_SCHEDULE = programacao;
	loadModalContentCalendar();

	if (instant) {
		const box = getID("programacao-box");
		box.style.transition = "none";
		box.style.display = "block";
		box.classList.add("show");
		box.style.opacity = "1";
		requestAnimationFrame(() => {
			box.style.transition = "";
		});
	} else {
		$("#programacao-box").show();
		setTimeout(() => {
			getID("programacao-box").classList.toggle("show");
		}, 100);
	}
}

function closeModalCalendar() {
	SCHEDULE_OPEN = false;
	CURRENT_SCHEDULE = null;
	CURRENT_SCHEDULE_DATE.dia = 0;
	CURRENT_SCHEDULE_DATE.mes = 0;
	CURRENT_SCHEDULE_DATE.ano = 0;

	unloadCalendarTripActive();
	getID("programacao-box").classList.toggle("show");
	setTimeout(() => {
		$("#programacao-box").hide();
	}, 300);
}

function reloadModalCalendar(programacao) {
	CURRENT_SCHEDULE = programacao;
	getID("programacao-modal").classList.toggle("show");
	setTimeout(() => {
		loadModalContentCalendar();
		getID("programacao-modal").classList.toggle("show");
	}, 300);
}

function displayInnerItineraryMessage(index) {
	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = CURRENT_INNER_ITINERARY[index].titulo;
	propriedades.conteudo = CURRENT_INNER_ITINERARY[index].content;
	propriedades.botoes = [];
	propriedades.containers.principal = CURRENT_INNER_ITINERARY[index].container;

	displayFullMessage(propriedades);

	switch (CURRENT_INNER_ITINERARY[index].tipo) {
		case "hospedagens":
			loadImageLightbox("programacao-galeria");
			break;
		case "destinos":
			if (CURRENT_INNER_ITINERARY[index].midia) {
				loadInnerItineraryMedia(CURRENT_INNER_ITINERARY[index].midia);
			}
	}
}

function loadInnerItineraryMedia(midia) {
	getID("midia-1").innerHTML = getLinkMediaButton(midia);
}

function loadCalendarItem(day, month, year, instant = false) {
	if (!day || !month || !year) {
		console.warn("No data string provided to load calendar item.");
		return;
	}

	unloadCalendarTripActive();

	const calendarTrip = getID(`calendarTrip-${day}-${month}-${year}`);

	if (
		day == CURRENT_SCHEDULE_DATE.dia &&
		month == CURRENT_SCHEDULE_DATE.mes &&
		year == CURRENT_SCHEDULE_DATE.ano
	) {
		closeModalCalendar();
		return;
	}

	calendarTrip.classList.add("active");
	CURRENT_SCHEDULE_DATE.dia = day;
	CURRENT_SCHEDULE_DATE.mes = month;
	CURRENT_SCHEDULE_DATE.ano = year;
	if (day != 0) {
		for (let i = 0; i < FIRESTORE_DATA.programacoes.length; i++) {
			var currentDate = convertFromDateObject(
				FIRESTORE_DATA.programacoes[i].data,
			);
			if (
				currentDate.getUTCDate() == day &&
				currentDate.getUTCMonth() == month - 1 &&
				currentDate.getUTCFullYear() == year
			) {
				if (!SCHEDULE_OPEN) {
					SCHEDULE_OPEN = true;
					openModalCalendar(FIRESTORE_DATA.programacoes[i], instant);
				} else {
					reloadModalCalendar(FIRESTORE_DATA.programacoes[i]);
				}
				break;
			}
		}
	}
}

function unloadCalendarTripActive() {
	for (const el of document.querySelectorAll(".calendarTrip")) {
		el.classList.remove("active");
	}
}

// Getters
function getInnerItineraryHTML(item) {
	const innerItinerary = getInnerItinerary(item);
	if (innerItinerary.content) {
		CURRENT_INNER_ITINERARY.push(innerItinerary);
		return `<i class="iconify external-link" data-icon="tabler:external-link" onclick="displayInnerItineraryMessage(${CURRENT_INNER_ITINERARY.length - 1})"></i>`;
	}
	return "";
}

function getInnerItinerary(item, destinos) {
	const innerItinerary = {
		tipo: item?.tipo,
		titulo: "",
		content: "",
		midia: "",
		container:
			item?.tipo === "destinos"
				? "destinos-container"
				: "programacao-container",
	};
	let index = -1;
	switch (item?.tipo) {
		case "transporte":
			if (FIRESTORE_DATA.modulos.transportes === true && item.id) {
				index = FIRESTORE_DATA.transportes.dados
					.map((programacao) => programacao.id)
					.indexOf(item.id);
				if (index >= 0) {
					const transporte = FIRESTORE_DATA.transportes.dados[index];
					innerItinerary.titulo = `${transporte.pontos.partida} → ${transporte.pontos.chegada}`;
					innerItinerary.content = getFlightBoxHTML(
						index + 1,
						"inner-programacao",
						true,
					);
				}
			}
			break;
		case "hospedagens":
			if (FIRESTORE_DATA.modulos.hospedagens === true && item.id) {
				index = FIRESTORE_DATA.hospedagens
					.map((hospedagem) => hospedagem.id)
					.indexOf(item.id);
				if (index >= 0) {
					innerItinerary.titulo = "";
					innerItinerary.content = getAccommodationsHTML(index, true);
				}
			}
			break;
		case "destinos":
			if (
				FIRESTORE_DATA.modulos.destinos === true &&
				item.local &&
				item.categoria &&
				item.id
			) {
				if (!destinos) {
					const destinosIDs = DESTINOS.map((destino) => destino.destinosID);
					index = destinosIDs.indexOf(item.local);
					destinos = DESTINOS?.[index]?.destinos;
				}

				if (!destinos) {
					return;
				}

				const destino = destinos[item.categoria];
				if (destino && Object.keys(destino).length) {
					const destinoItem = destino[item.id];
					if (destinoItem) {
						innerItinerary.titulo = getDestinationTitle(destinoItem);
						innerItinerary.content = getDestinationsBoxHTML({
							j: 1,
							id: item.id,
							item: destinoItem,
							innerItinerary: true,
							valores: getDestinationValues(destinos.moeda),
							moeda: destinos.moeda,
							editBtn: false,
						});
						innerItinerary.midia = destinoItem?.midia;
					}
				}
			}
	}

	return innerItinerary;

	function getDestinationValues(destinosMoeda) {
		const moeda = cloneObject(getCurrencies().escala[destinosMoeda]);
		const max = translate("destination.price.max", { value: moeda["$$$$"] });
		moeda["-"] = translate("destination.price.free");
		moeda["default"] = translate("destination.price.default");
		moeda["$$$$"] = max;
		return moeda;
	}
}

function getScheduleTitle(titulo, destinos, placeholder = true) {
	if (!titulo || typeof titulo === "string") {
		const placeholderValue = placeholder
			? translate("trip.itinerary.title")
			: "";
		return titulo || placeholderValue;
	}

	if (!titulo.valor) {
		return placeholder
			? translate("trip.itinerary.title")
			: "";
	}

	if (titulo.destinos) {
		return getAndDestinationTitle(titulo.valor, destinos, placeholder);
	}

	if (titulo.traduzir) {
		return translate(`trip.transportation.${titulo.valor}`);
	}

	return titulo.valor;
}

// Setters
function setModalCalendarInnerHTML(div, programacao) {
	div.innerHTML = "";
	for (let i = 0; i < programacao.length; i++) {
		if (programacao[i].programacao) {
			div.innerHTML += `<div>
                                <i class="bi bi-chevron-right color-icon"></i>
                                ${getInnerItineraryTitleHTML(programacao[i], "programacao-item")}
                                ${getInnerItineraryHTML(programacao[i].item)}
                              </div>`;
		}
	}
}

// Converters
function adaptModalCalendarInnerHTML() {
	const madrugada = getID("programacao-itens-madrugada");
	const manha = getID("programacao-itens-manha");
	const tarde = getID("programacao-itens-tarde");
	const noite = getID("programacao-itens-noite");

	getID("programacao-madrugada").style.display = madrugada.innerHTML
		? "block"
		: "none";
	getID("programacao-manha").style.display = manha.innerHTML ? "block" : "none";
	getID("programacao-tarde").style.display = tarde.innerHTML ? "block" : "none";
	getID("programacao-noite").style.display = noite.innerHTML ? "block" : "none";
	getID("sem-programacao").style.display =
		madrugada.innerHTML || manha.innerHTML || tarde.innerHTML || noite.innerHTML
			? "none"
			: "block";
}

// Custom Checkboxes
function loadItineraryTravelersCheckboxes() {
	const container = getID("innner-programacao-travelers-checkboxes");
	container.innerHTML = "";

	if (!TRAVELERS?.length) {
		return;
	}

	for (const traveler of TRAVELERS) {
		const id = `trav-${traveler.id}`;

		container.innerHTML += `
            <label class="checkbox-item">
                <input 
                    type="checkbox" 
                    id="${id}" 
                    value="${traveler.id}" 
                    checked
                >
                ${traveler.nome}
            </label>
        `;
	}

	// Listen for any checkbox toggle
	container.addEventListener("change", loadItineraryTravelersCheckboxAction);
}

function filterInnerProgramacoesByTravelers(list, selectedIds) {
	if (!selectedIds.length || selectedIds.length === TRAVELERS.length) {
		return list;
	}

	return list.filter((item) => {
		const presentes = item.pessoas.filter((p) => p.isPresent).map((p) => p.id);

		return selectedIds.some((id) => presentes.includes(id));
	});
}

function loadItineraryTravelersCheckboxAction() {
	const container = getID("innner-programacao-travelers-checkboxes");
	const selectedIds = [
		...container.querySelectorAll("input[type='checkbox']:checked"),
	].map((i) => i.value);

	const madrugada = filterInnerProgramacoesByTravelers(
		CURRENT_SCHEDULE.madrugada,
		selectedIds,
	);
	const manha = filterInnerProgramacoesByTravelers(
		CURRENT_SCHEDULE.manha,
		selectedIds,
	);
	const tarde = filterInnerProgramacoesByTravelers(
		CURRENT_SCHEDULE.tarde,
		selectedIds,
	);
	const noite = filterInnerProgramacoesByTravelers(
		CURRENT_SCHEDULE.noite,
		selectedIds,
	);

	setModalCalendarInnerHTML(getID("programacao-itens-madrugada"), madrugada);
	setModalCalendarInnerHTML(getID("programacao-itens-manha"), manha);
	setModalCalendarInnerHTML(getID("programacao-itens-tarde"), tarde);
	setModalCalendarInnerHTML(getID("programacao-itens-noite"), noite);

	adaptModalCalendarInnerHTML();
}
