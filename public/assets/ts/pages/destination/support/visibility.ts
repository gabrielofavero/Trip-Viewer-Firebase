import { loadVisibility } from '../../../theme/visibility.js';
import { getDescriptionValue } from '../../../models/destination.model.js';
import { adjustEditVisibility } from '../edit-destination.js';

export async function loadDestinationVisibility() {
	loadVisibility();
	await adjustEditVisibility();
}

export function getPriceVisibility(item) {
	return item.price ? 'block' : 'none';
}

export function getDescriptionVisibility(item) {
	return getDescriptionValue(item) ? 'block' : 'none';
}
