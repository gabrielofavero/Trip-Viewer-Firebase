// ======= Itinerary Formatter =======
// Itinerary data transformation and multi-format output
// Core functions moved to models/itinerary.model.js — imported here for backward compat

import {
	getItineraryContent,
	getItineraryData,
} from '../../models/itinerary.model.js';

var ITINERARY;
const ITINERARY_HTML = {};
var DESTINOS = {};

async function getDestination(id) {
	if (!Object.keys(DESTINOS).includes(id)) {
		DESTINOS[id] = await get(`destinos/${id}`);
	}
	return DESTINOS[id];
}
