var ITINERARY;
const ITINERARY_HTML = {};
var DESTINOS = {};

async function _getItineraryContent(type) {
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

	for (const timeOfDay of ["madrugada", "manha", "tarde", "noite"]) {
		content.push(_getTimeOfDay(timeOfDay, type));
		for (const innerItinerary of ITINERARY[timeOfDay]) {
			content.push(_getInnerItinerary(innerItinerary, type));
		}
	}

	const result = content.join(type == "text" ? "\n" : undefined);

	if (notPages) {
		ITINERARY_HTML[type] = result;
	}
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

	function _getTimeOfDay(value, type) {
		switch (type) {
			case "page":
			case "notes":
				return `<h2>${value}</h2>`;
			default:
				return `\n*${value}*`;
		}
	}

	function _getInnerItinerary(innerItinerary, type) {
		switch (type) {
			case "page":
				return _getPageInnerItinerary(innerItinerary);
			case "notes":
				return _getNotesInnerItinerary(innerItinerary);
			default:
				return _getDefaultInnerItinerary(innerItinerary);
		}

		function _getPageInnerItinerary(innerItinerary) {
			let content = `<li>${_getTextContent(innerItinerary, type)}</li>`;
			const card = innerItinerary.subItem.card;
			if (card) {
				content += `<div class = "${card.container}">${card.content}</div>`;
			}

			return content;
		}

		function _getNotesInnerItinerary(innerItinerary) {
			const type = "notes";
			if (innerItinerary.subItems.length === 0) {
				return `<li>${_getTextContent(innerItinerary, type)}</li>`;
			}
			let content = `<li>${_getTextContent(innerItinerary, type)}<ul>`;
			for (const subItem of _getSubItemTextContents(data, type)) {
				content += `<li>${subItem}</li>`;
			}
			content += "</ul></li>";
			return content;
		}

		function _getDefaultInnerItinerary(innerItinerary) {
			let content = `- ${_getTextContent(innerItinerary)}`;
			for (const subItem of innerItinerary.subItems) {
				content += `> ${_getSubItemTextContents(subItem)}`;
			}
		}

		// Helpers
		function _getTextContent(data, type = "text") {
			switch (type) {
				case "page":
				case "notes":
					return data.title
						? `<b>${innerItinerary.title}:<b> ${innerItinerary.content}`
						: innerItinerary.content;
				default:
					return data.title
						? `*${innerItinerary.title}:* ${innerItinerary.content}`
						: innerItinerary.content;
			}
		}

		function _getSubItemTextContents(data, type) {
			const result = [];
			for (const text of data.texts) {
				result.push(_getTextContent(text, type));
			}
			return result;
		}
	}
}

async function _getItineraryData() {
	ITINERARY = [];
	for (const programacao of FIRESTORE_DATA.programacoes) {
		const title = await _getTitle(programacao);
		const madrugada = await _getInnerItineraries(programacao.madrugada);
		const manha = await _getInnerItineraries(programacao.manha);
		const tarde = await _getInnerItineraries(programacao.tarde);
		const noite = await _getInnerItineraries(programacao.noite);
		ITINERARY.push({ title, madrugada, manha, tarde, noite });
	}

	async function _getTitle(programacao) {
		const date = _convertFromDateObject(programacao.data);
		const dateTitle = _getDateTitle(date);
		const destinosIDs = FIRESTORE_DATA.destinos.map(
			(destino) => destino.destinosID,
		);
		const progTitle = await _getProgTitle(programacao.titulo);
		return `${progTitle}, ${dateTitle}`;

		async function _getProgTitle(titulo) {
			if (typeof titulo === "string") {
				return titulo;
			}

			if (titulo.destinos && destinosIDs.includes(titulo.valor)) {
				const destino = await _getDestination(titulo.valor);
				return destino.titulo;
			}

			if (!titulo.valor) {
				return "";
			}

			return titulo.traduzir
				? translate(p.titulo.valor, {}, false)
				: titulo.titulo.valor;
		}
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
