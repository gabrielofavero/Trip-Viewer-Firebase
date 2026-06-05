// ======= Itinerary Formatter =======
// Itinerary data transformation and multi-format output
// Core functions moved to models/itinerary.js — imported here for backward compat

import {
	_getItineraryContent,
	_getItineraryData,
} from '../../models/itinerary.js';

var ITINERARY;
const ITINERARY_HTML = {};
var DESTINOS = {};

// BACKWARD COMPAT: attach to window during migration
window._getItineraryContent = _getItineraryContent;
window._getItineraryData = _getItineraryData;
window._getDestination = _getDestination;

async function _getDestination(id) {
	if (!Object.keys(DESTINOS).includes(id)) {
		DESTINOS[id] = await _get(`destinos/${id}`);
	}
	return DESTINOS[id];
}
