// ======= Expenses Converted =======
// Currency conversion and aggregation logic
// Functions moved to models/expense.js — imported here for backward compat

import {
	_loadGastosConvertidos,
	_processGastosConvertidos,
	_processGastosConvertidosViajantes,
	_calculateGastosConvertidos,
	_getConversaoText,
} from '../../models/expense.js';

var GASTOS_CONVERTIDOS = {};

// BACKWARD COMPAT: attach to window during migration
window._loadGastosConvertidos = _loadGastosConvertidos;
window._processGastosConvertidos = _processGastosConvertidos;
window._processGastosConvertidosViajantes = _processGastosConvertidosViajantes;
window._calculateGastosConvertidos = _calculateGastosConvertidos;
window._getConversaoText = _getConversaoText;
