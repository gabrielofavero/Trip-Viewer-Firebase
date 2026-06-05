// ======= Expense Model =======
// Pure data transformation functions for expenses (currency conversion, aggregation, chart data)
// Extracted from: expenses-converted.js, support/currency.js, support/data.js

// ======= Currency Filtering & Sorting =======

export function _filterMoedas(arr) {
	return arr.filter(
		(moeda, index, self) => self.indexOf(moeda) === index && moeda,
	);
}

export function _sortMoedas(arr) {
	return arr.sort((a, b) => {
		if (a === MOEDA_PADRAO) {
			return -1;
		} else if (b === MOEDA_PADRAO) {
			return 1;
		} else {
			return 0;
		}
	});
}

// ======= Currency Conversion =======

export function _convertMoeda(from, to, valor) {
	if (from === to) {
		return valor;
	}

	if (MOEDA_CONVERSAO[from + to]) {
		return valor * MOEDA_CONVERSAO[from + to];
	}

	if (MOEDA_CONVERSAO[to + from]) {
		return valor / MOEDA_CONVERSAO[to + from];
	} else {
		console.error(`Conversion error: from ${valor} ${from} to ? ${to}`);
		_displayError(translate("messages.errors.unknown"));
	}
}

export function _canConvert(moedas) {
	if (moedas.length == 1) {
		return true;
	}

	const keys = Object.keys(MOEDA_CONVERSAO);
	if (keys.length === 0) {
		return false;
	}

	for (const moeda of moedas) {
		if (!keys.some((key) => key.includes(moeda))) {
			return false;
		}
	}
	return true;
}

export function _getMoedaSymbol(moeda) {
	if (CONFIG.moedas.simbolos[moeda]) {
		return CONFIG.moedas.simbolos[moeda];
	} else {
		return moeda;
	}
}

export function _formatMoeda(moedaFloat, includeSymbol = false) {
	const result = new Intl.NumberFormat("pt-BR", {
		style: "decimal",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(moedaFloat);

	return includeSymbol ? `${_getMoedaSymbol(MOEDA_ATUAL)} ${result}` : result;
}

// ======= Currency Loading =======

export function _loadMoedasObject() {
	if (GASTOS.gastosPrevios.length > 0 || GASTOS.gastosDurante.length > 0) {
		let moedasPrevias = [];
		let moedasDurante = [];

		if (GASTOS.gastosPrevios.length > 0) {
			moedasPrevias = _filterMoedas(
				GASTOS.gastosPrevios.map((gasto) => gasto.moeda),
			);
			MOEDAS.gastosPrevios = moedasPrevias;
		}

		if (GASTOS.gastosDurante.length > 0) {
			moedasDurante = _filterMoedas(
				GASTOS.gastosDurante.map((gasto) => gasto.moeda),
			);
			MOEDAS.gastosDurante = moedasDurante;
		}

		MOEDAS.resumo = [...new Set([...moedasPrevias, ...moedasDurante])];

		MOEDAS.resumo = _sortMoedas(MOEDAS.resumo);
		MOEDAS.gastosPrevios = _sortMoedas(MOEDAS.gastosPrevios);
		MOEDAS.gastosDurante = _sortMoedas(MOEDAS.gastosDurante);
	}
}

// ======= Expense Conversion =======

export function _loadGastosConvertidos() {
	_processGastosConvertidos("gastosDurante");
	_processGastosConvertidos("gastosPrevios");
	_processGastosConvertidosViajantes();
}

export function _processGastosConvertidos(tipoGasto) {
	for (const moeda of MOEDAS.resumo) {
		if (!GASTOS_CONVERTIDOS[moeda]) {
			GASTOS_CONVERTIDOS[moeda] = {};
		}
		GASTOS_CONVERTIDOS[moeda][tipoGasto] = _calculateGastosConvertidos(
			tipoGasto,
			moeda,
		);
	}
}

export function _processGastosConvertidosViajantes() {
	const tipos = {
		gastosPrevios: "trip.expenses.pre_trip",
		gastosDurante: "trip.expenses.during_trip",
	};

	for (const moeda of MOEDAS.resumo) {
		const viajanteMap = new Map();
		const resumoMap = new Map();
		let resumoTotal = 0;

		for (const tipo in tipos) {
			const grupo = GASTOS_CONVERTIDOS?.[moeda]?.[tipo];
			if (!grupo?.itens) continue;

			for (const gasto of grupo.itens) {
				if (!gasto?.itens?.length) continue;

				for (const item of gasto.itens) {
					const pessoa = item.pessoa
						? GASTOS.pessoas[item.pessoa]
						: "labels.non_specified";

					const valor = Number(item.valor) || 0;
					const nome = tipos[tipo];

					let entry = viajanteMap.get(pessoa);
					if (!entry) {
						entry = { nome: pessoa, total: 0, itens: [] };
						entry._byTipo = new Map();
						viajanteMap.set(pessoa, entry);
					}

					let tipoItem = entry._byTipo.get(nome);
					if (!tipoItem) {
						tipoItem = { nome, pessoa, valor: 0 };
						entry._byTipo.set(nome, tipoItem);
						entry.itens.push(tipoItem);
					}

					tipoItem.valor += valor;
					entry.total += valor;

					resumoTotal += valor;

					let resumoEntry = resumoMap.get(pessoa);
					if (!resumoEntry) {
						resumoEntry = { nome: pessoa, valor: 0 };
						resumoMap.set(pessoa, resumoEntry);
					}

					resumoEntry.valor += valor;
				}
			}
		}

		function compareWithNonSpecifiedLast(a, b) {
			const nonSpecified = "labels.non_specified";

			const aIsNS = a.nome === nonSpecified;
			const bIsNS = b.nome === nonSpecified;

			if (aIsNS && !bIsNS) return 1; // a goes last
			if (!aIsNS && bIsNS) return -1; // b goes last

			return a.nome.localeCompare(b.nome, undefined, { sensitivity: "base" });
		}

		const itens = Array.from(viajanteMap.values())
			.map((v) => {
				delete v._byTipo;
				return v;
			})
			.sort(compareWithNonSpecifiedLast);

		const resumo = {
			total: resumoTotal,
			itens: Array.from(resumoMap.values()).sort(compareWithNonSpecifiedLast),
		};

		GASTOS_CONVERTIDOS[moeda].gastosViajantes = { resumo, itens };
	}
}

export function _calculateGastosConvertidos(tipo, moeda) {
	function _updateResumo(resumo, tipoGasto, valor) {
		const resumoNomes = resumo.itens.map((item) => item.nome);
		const resumoIndex = resumoNomes.indexOf(tipoGasto);
		if (resumoIndex >= 0) {
			resumo.itens[resumoIndex].valor += valor;
		} else {
			resumo.itens.push({
				nome: tipoGasto,
				valor,
			});
		}
	}

	function _updateItens(itens, gasto, valor) {
		const nome = gasto.nome;
		const tipo = gasto.tipo;
		const pessoa = gasto.pessoa;

		const itemNomes = itens.map((item) => item.nome);
		const itemIndex = itemNomes.indexOf(tipo);
		if (itemIndex >= 0) {
			itens[itemIndex].total += valor;
			itens[itemIndex].itens.push({ nome, pessoa, valor });
		} else {
			itens.push({
				nome: tipo,
				total: valor,
				itens: [
					{
						nome,
						pessoa,
						valor,
					},
				],
			});
		}
	}

	const gastos = GASTOS[tipo];
	const resumo = {
		total: 0,
		itens: [],
	};
	const itens = [];

	for (const gasto of gastos) {
		let valor = gasto.valor;
		let include = true;

		if (gasto.moeda != moeda) {
			if (_canConvert([gasto.moeda, moeda])) {
				valor = _convertMoeda(gasto.moeda, moeda, gasto.valor);
			} else {
				include = false;
			}
		}

		if (include) {
			resumo.total += valor;
			valor = parseFloat(valor.toFixed(2));

			_updateResumo(resumo, gasto.tipo, valor);
			_updateItens(itens, gasto, valor);
		}
	}

	resumo.total = parseFloat(resumo.total.toFixed(2));
	return { resumo, itens };
}

export function _getConversaoText() {
	if (MOEDAS.resumo.length == 1) {
		return _getEmptyChar();
	}
	const conversoes = [`1 ${MOEDA_PADRAO}`];
	for (const moeda of MOEDAS.resumo) {
		if (moeda == MOEDA_PADRAO) {
			continue;
		}
		conversoes.push(
			`${_convertMoeda(moeda, MOEDA_PADRAO, 1).toFixed(2)} ${moeda}`,
		);
	}
	return conversoes.join(" = ");
}

// ======= Chart Data (Pure) =======

export function _getChartData(labels, valores, coresRGB) {
	return {
		labels: labels,
		datasets: [
			{
				label: "",
				data: valores,
				backgroundColor: _getArrayRGBA(coresRGB, 0.5),
				borderColor: _getArrayRGBA(coresRGB, 1),
				borderWidth: 1,
			},
		],
	};
}

export function _getChartConfig(tipo, dados) {
	let legenda = {
		display: false,
	};

	if (tipo === "doughnut" || tipo === "pie") {
		legenda.display = true;
		legenda.position = "right";
		legenda.labels = {
			color: _isOnDarkMode() ? "rgba(227, 236, 248, 1)" : "rgba(75, 85, 99, 1)",
		};
	}

	let result = {
		type: tipo,
		data: dados,
		options: {
			plugins: {
				legend: legenda,
			},
		},
	};

	if (tipo === "bar") {
		const scales = {
			x: {
				grid: {
					display: false,
				},
			},
			y: {
				grid: {
					display: false,
				},
			},
		};
		result.options.scales = scales;
	}

	return result;
}

export function _getChartColorsRGB(size) {
	const result = [];
	const coresHex = CONFIG.cores.opcoes.map((cor) => cor.hex);
	const coresRGB = coresHex.map((cor) => _hexToRgb(cor));

	for (let i = 0; i < size; i++) {
		const index = i % coresRGB.length;
		result.push(coresRGB[index]);
	}

	return result;
}

export function _getArrayRGBA(coresRGB, a) {
	const result = [];

	for (const rgb of coresRGB) {
		result.push(_rgbToText(rgb[0], rgb[1], rgb[2], a));
	}

	return result;
}
