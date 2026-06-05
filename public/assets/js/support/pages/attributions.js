function openAtribuicoes() {
	const page = window.location.href
		.split("/")
		.pop()
		.split("?")[0]
		.replace(".html", "");
	const atribuicoes = [];

	atribuicoes.push(getLogo());

	switch (page) {
		case "index":
			atribuicoes.push(getBackground());
			if (FIRESTORE_DATA?.modulos.gastos) {
				loadExpensesCredits();
			}
			break;
		case "trip":
		case "destination":
		case "listing":
			atribuicoes.push(getBackground());
			atribuicoes.push(getForms());
			break;
		case "view":
			atribuicoes.push(getBackground());
			atribuicoes.push(getCalendar());
			break;
		case "expenses":
			loadExpensesCredits();
			break;
	}

	const propriedades = cloneObject(MESSAGE_PROPERTIES);
	propriedades.titulo = translate("labels.credits");
	propriedades.conteudo = atribuicoes.join("<br>");
	propriedades.botoes = [];

	displayFullMessage(propriedades);

	function loadExpensesCredits() {
		atribuicoes.push(getPinStyle());
		atribuicoes.push(getTabs());
		atribuicoes.push(getDashboard());
		atribuicoes.push(getExchangeRateAPI());
	}

	function getLogo() {
		return `<strong>${translate("labels.logo")}: </strong> <a href="https://br.freepik.com/vetores-gratis/marketing-de-midia-social-conjunto-de-icones_5825519.htm#query=briefcase&position=9&from_view=search&track=sph" target="_blank">studiogstock</a> (${translate("labels.adapted")})`;
	}

	function getBackground() {
		return `<strong>${translate("labels.image.background")}: </strong> <a href="https://br.freepik.com/fotos-gratis/femininos-turistas-na-mao-tem-um-mapa-de-viagem-feliz_3953407.htm#query=viagem&position=14&from_view=search&track=sph" target="_blank">jcomp</a> (Freepik)`;
	}

	function getForms() {
		return `<strong>${translate("labels.forms")}: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (${translate("labels.adapted")})`;
	}

	function getCalendar() {
		return `<strong>${translate("labels.calendar")}: </strong> <a href="https://www.cssscript.com/minimal-calendar-ui-generator/" target="_blank">niinpatel</a> (${translate("labels.adapted")})`;
	}

	function getAccordion() {
		return `<strong>${translate("labels.accordion")}: </strong> <a href="https://github.com/nielsVoogt/nice-forms.css" target="_blank">Niels Voogt</a> (${translate("labels.adapted")})`;
	}

	function getTabs() {
		return `<strong>${translate("labels.tabs")}: </strong> <a href="https://codepen.io/havardob/pen/ExVaELV" target="_blank">Håvard Brynjulfsen</a> (${translate("labels.adapted")})`;
	}

	function getDashboard() {
		return `<strong>${translate("labels.dashboard")}: </strong> <a href="https://codepen.io/dudebro69/pen/jOvEaVe" target="_blank">dudebro</a> (${translate("labels.adapted")})`;
	}

	function getExchangeRateAPI() {
		return `<strong>${translate("trip.expenses.exchange_rate_api")}: </strong> <a href="https://docs.awesomeapi.com.br/api-de-moedas" target="_blank">Ranielly Ferreira</a> (${translate("labels.adapted")})`;
	}

	function getPinStyle() {
		return `<strong>${translate("trip.basic_information.pin.title")}: </strong> <a href="https://codepen.io/the_anshulkumar/pen/RKzYKj" target="_blank">Anshul Kumar</a> (${translate("labels.adapted")})`;
	}
}
