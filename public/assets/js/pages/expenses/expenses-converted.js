// ======= Expenses Converted =======
// Currency conversion and aggregation logic
// Functions moved to models/expense.js — imported here for backward compat

import {
	loadConvertedExpenses,
	processConvertedExpenses,
	processConvertedTravelerExpenses,
	calculateConvertedExpenses,
	getConversionText,
} from '../../models/expense.js';

var GASTOS_CONVERTIDOS = {};


