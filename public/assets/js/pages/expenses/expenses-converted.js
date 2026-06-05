// ======= Expenses Converted =======
// Currency conversion and aggregation logic
// Functions moved to models/expense.model.js — imported here for backward compat

import {
	loadConvertedExpenses,
	processConvertedExpenses,
	processConvertedTravelerExpenses,
	calculateConvertedExpenses,
	getConversionText,
} from '../../models/expense.model.js';

var GASTOS_CONVERTIDOS = {};


