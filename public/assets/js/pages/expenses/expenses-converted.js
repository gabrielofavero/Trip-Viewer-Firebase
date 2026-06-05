var GASTOS_CONVERTIDOS = {};

function _loadGastosConvertidos() {
	_processGastosConvertidos("gastosDurante");
	_processGastosConvertidos("gastosPrevios");
	_processGastosConvertidosViajantes();
}

function _processGastosConvertidos(tipoGasto) {
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

function _processGastosConvertidosViajantes() {
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

function _calculateGastosConvertidos(tipo, moeda) {
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

function _getConversaoText() {
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
