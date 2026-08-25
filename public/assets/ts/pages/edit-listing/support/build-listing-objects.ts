/**
 * Build functions for listing objects.
 * Extracted from: legacy inline scripts (lost during migration)
 */
import { getID } from '../../../utils/dom.js';
import { getState } from '../../../data/state.js';

/** Build the sharing/compartilhamento object for a listing */
export function buildSharingObject(): Record<string, any> {
	// Preserve existing sharing data (editors, owner) from current state;
	// for new listings, backend security rules will set owner = request.auth.uid.
	const existing = getState().sharing || {};
	return {
		editors: existing.editors || [],
		owner: existing.owner || '',
		active: true,
	};
}

/** Build the destinations array from the selected destination cards */
export function buildDestinationsArray(): { id: string }[] {
	const result: { id: string }[] = [];
	const container = getID('has-destinations');
	if (!container) return result;

	// Destination cards use .destination-card.selected, not checkboxes
	const cards = container.querySelectorAll('.destination-card.selected');
	for (const card of cards) {
		const destinationId = card.getAttribute('data-destination-id');
		if (destinationId) {
			result.push({ id: destinationId });
		}
	}
	return result;
}

/** Build the image object for a listing */
export function buildImageObject(): Record<string, any> {
	// Preserve existing image structure (e.g., nested background object, height)
	const existing = getState().image || {};

	// Get form values for image fields
	const bgValue =
		getID('link-background')?.getAttribute('value') ||
		getID('link-background')?.getAttribute('data-value') ||
		'';
	const darkValue =
		getID('link-logo-dark')?.getAttribute('value') ||
		getID('link-logo-dark')?.getAttribute('data-value') ||
		'';
	const lightValue =
		getID('link-logo-light')?.getAttribute('value') ||
		getID('link-logo-light')?.getAttribute('data-value') ||
		'';

	// Preserve existing background object if form value is empty/non-existent,
	// but use form value if it was changed (it comes back as a string URL).
	const background = bgValue || existing.background || '';

	return {
		// Preserve height from existing state (no form field for it)
		height: existing.height || '250px',
		active: (getID('images-enabled') as HTMLInputElement)?.checked ?? true,
		background,
		dark: darkValue || existing.dark || '',
		light: lightValue || existing.light || '',
	};
}

/** Build the links object for a listing */
export function buildLinksObject(): Record<string, any> {
	const getVal = (id: string): string =>
		(getID(id) as HTMLInputElement)?.value ||
		(getID(id) as HTMLElement)?.getAttribute('data-value') ||
		'';

	// Preserve existing links that don't have form fields
	const existing = getState().links || {};

	return {
		pdf: getVal('link-pdf') || existing.pdf || '',
		vaccine: getVal('link-vaccine') || existing.vaccine || '',
		maps: getVal('link-maps') || existing.maps || '',
		sheet: getVal('link-sheet') || existing.sheet || '',
		drive: getVal('link-drive') || existing.drive || '',
		ppt: getVal('link-ppt') || existing.ppt || '',
		active: (getID('links-enabled') as HTMLInputElement)?.checked ?? existing.active ?? false,
		attachments: getVal('link-attachments') || existing.attachments || '',
	};
}
