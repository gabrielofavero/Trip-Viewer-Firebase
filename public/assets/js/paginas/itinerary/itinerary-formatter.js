var ITINERARY;
const ITINERARY_HTML = {};
var DESTINOS = {};

async function _getItineraryContent(type) {
	_startLoadingScreen();
	const notPages = type != "pages";
	if (notPages && ITINERARY_HTML[type]) {
		return ITINERARY_HTML[type];
	}

	if (!ITINERARY) {
		ITINERARY = await _getItineraryData();
	}

	const content = [];
	const title = _getTitle(type);

	if (title) {
		content.push(title);
	}

	for (const itinerary of ITINERARY) {
		_loadItineararyTitle(itinerary.title, type);
		for (const timeOfDay of ["madrugada", "manha", "tarde", "noite"]) {
			const timeOfDayData = itinerary[timeOfDay];
			if (timeOfDayData.length === 0) continue;
			_loadTimeOfDay(timeOfDay);
			for (const innerItinerary of timeOfDayData) {
				_loadInnerItinerary(innerItinerary, type);
			}
		}
	}

	const result = content.join("\n");

	if (notPages) {
		ITINERARY_HTML[type] = result;
	}

	_stopLoadingScreen();
	return result;

	// Helpers
	function _getTitle(type) {
		switch (type) {
			case "page":
				return "";
			case "notes":
				return `<h1>${FIRESTORE_DATA.titulo}</h1>`;
			default:
				return `*${FIRESTORE_DATA.titulo.toUpperCase()}*`;
		}
	}

	function _loadItineararyTitle(value, type) {
		switch (type) {
			case "page":
			case "notes":
				content.push(`<h2>${value}</h2>`);
				break;
			default:
				return content.push(`\n*${value}*`);
		}
	}

	function _loadTimeOfDay(timeOfDayKey) {
		const timeOfDay = _getTurno(timeOfDayKey);
		switch (type) {
			case "page":
			case "notes":
				content.push(`<h3>${timeOfDay}</h3>`);
				break;
			default:
				return content.push(`\n_${timeOfDay}*`);
		}
	}

	function _loadInnerItinerary(innerItinerary, type) {
		switch (type) {
			case "page":
			case "notes":
				_loadHTMLInnerItinerary(innerItinerary, type);
				break;
			default:
				_loadDefaultInnerItinerary(innerItinerary);
		}

		function _loadHTMLInnerItinerary(innerItinerary, type) {
			const texts = innerItinerary.subItem.texts;
			if (texts.length === 0) {
				content.push(`<li>${_getTextContent(innerItinerary, type)}</li>`);
				return;
			}
			content.push(`<li>${_getTextContent(innerItinerary, type)}<ul>`);
			for (const text of texts) {
				content.push(`<li>${_getTextContent(text, type)}</li>`);
			}
			content.push("</ul></li>");
		}

		function _loadDefaultInnerItinerary(innerItinerary) {
			content.push(`- ${_getTextContent(innerItinerary)}`);
			for (const text of innerItinerary.subItem.texts) {
				content.push(`> ${_getTextContent(text)}`);
			}
		}

		// Helpers
		function _getTextContent(textObj, type = "text") {
			switch (type) {
				case "page":
				case "notes":
					return textObj.title
						? `<b>${textObj.title}:</b> ${textObj.content}`
						: textObj.content;
				default:
					return textObj.title
						? `*${textObj.title}:* ${textObj.content}`
						: textObj.content;
			}
		}
	}
}

async function _getItineraryData() {
	ITINERARY = [];
	for (const programacao of FIRESTORE_DATA.programacoes) {
		const title = _getItineraryTitle(programacao);
		const madrugada = await _getInnerItineraries(programacao.madrugada);
		const manha = await _getInnerItineraries(programacao.manha);
		const tarde = await _getInnerItineraries(programacao.tarde);
		const noite = await _getInnerItineraries(programacao.noite);

		ITINERARY.push({ title, madrugada, manha, tarde, noite });
	}

	return ITINERARY;

	function _getItineraryTitle(programacao) {
		const date = _convertFromDateObject(programacao.data);
		const dateTitle = _getDateTitle(date, "weekday_day_month");

		const destinos =
			programacao.destinosIDs.length > 0
				? programacao.destinosIDs.map((d) => d.titulo)
				: [];
		const title = _getProgramacaoTitulo(programacao.titulo, destinos);

		return title ? `${title}: ${dateTitle}` : dateTitle;
	}

	async function _getInnerItineraries(data) {
		if (data.length === 0) {
			return [];
		}
		const innerItineraries = [];
		for (const rawData of data) {
			const title = _getInnerProgramacaoTitle(
				rawData,
				FIRESTORE_DATA.pessoas || [],
			);
			const subItem = await _getSubItem(rawData.item);
			innerItineraries.push({
				...title,
				subItem,
			});
		}
		return innerItineraries;

		async function _getSubItem(item) {
			let destinos;
			if (item.tipo == "destinos") {
				destinos = await _getDestination(item.local);
			}
			const card = _getInnerProgramacao(item, destinos);
			const texts = await _getInnerProgramacaoAssociatedTexts(item);
			return { card, texts };
		}

		async function _getInnerProgramacaoAssociatedTexts(item) {
			const texts = [];

			switch (item.tipo) {
				case "transporte":
					_loadTransporte();
					break;
				case "hospedagens":
					_loadHospedagem();
					break;
				case "destinos":
					await _loadDestino();
			}

			return texts;

			function _loadTransporte() {
				const transporte = FIRESTORE_DATA.transportes.dados.find(
					(obj) => obj.id === item.id,
				);
				if (!transporte) return;
				const transporteProtegido =
					FIRESTORE_PROTECTED_DATA?.transportes?.[item.id];

				const partida = transporte?.datas?.partida;
				const chegada = transporte?.datas?.chegada;
				const horario =
					partida && chegada
						? `${partida.hour}:${partida.minute} - ${chegada.hour}:${chegada.minute}`
						: "";
				const empresa =
					CONFIG.transportes.empresas?.[transporte.transporte]?.[
						transporte?.empresa
					] || transporte?.empresa;
				_loadTextObj("trip.transportation.time_window", horario);
				_loadTextObj(
					"labels.reservation.title",
					transporte?.reserva || transporteProtegido?.reserva,
				);
				_loadTextObj("labels.company", empresa);
			}

			function _loadHospedagem() {
				const hospedagem = FIRESTORE_DATA.hospedagens.find(
					(obj) => obj.id === item.id,
				);
				if (!hospedagem) return;
				const hospedagemProtegida =
					FIRESTORE_PROTECTED_DATA?.hospedagens?.[item.id];

				const checkin = hospedagem?.datas.checkin
					? `${hospedagem.datas.checkin.hour}:${hospedagem.datas.checkin.minute}`
					: "";
				const checkout = hospedagem?.datas.checkout
					? `${hospedagem.datas.checkout.hour}:${hospedagem.datas.checkout.minute}`
					: "";
				_loadTextObj("trip.accommodation.accommodation", hospedagem.nome);
				_loadTextObj("trip.accommodation.checkin", checkin);
				_loadTextObj("trip.accommodation.checkout", checkout);
				_loadTextObj(
					"labels.reservation.title",
					hospedagem?.reserva || hospedagemProtegida?.reserva,
				);
			}

			async function _loadDestino() {
				const destinos = await _getDestination(item.local);
				const destino = destinos?.[item?.categoria]?.[item.id];
				if (!destino) return;

				const titulo = destino.emoji
					? `${destino.nome} ${destino.emoji}`
					: destino.nome;
				const nota = _getNotaTranslation(destino.nota);
				const valor = _getValorValue(
					destino,
					CONFIG.moedas.escala[destinos.moeda],
					CONFIG.moedas.simbolos[destinos.moeda],
				);
				_loadTextObj("destination.document", titulo);
				_loadTextObj("labels.priority", nota);
				_loadTextObj("labels.cost", valor);
			}

			function _loadTextObj(titleKey, content) {
				if (!content) return;
				const title = translate(titleKey);
				texts.push({ title, content });
			}
		}
	}
}

async function _getDestination(id) {
	if (!Object.keys(DESTINOS).includes(id)) {
		DESTINOS[id] = await _get(`destinos/${id}`);
	}
	return DESTINOS[id];
}
