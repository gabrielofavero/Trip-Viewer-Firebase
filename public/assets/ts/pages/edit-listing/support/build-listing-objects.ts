/**
 * Build functions for listing objects.
 * These were referenced in edit-listing.ts but never implemented during the TS migration.
 * Extracted from: legacy inline scripts (lost during migration)
 */
import { getID } from '../../../utils/dom.js';

/** Build the sharing/compartilhamento object for a listing */
export function buildCompartilhamentoObject(): Record<string, any> {
	return {
		editors: [],
		owner: '', // Set by backend based on auth
		active: true,
	};
}

/** Build the destinations array from the selected destination checkboxes */
export function buildDestinosArray(): { id: string }[] {
	const result: { id: string }[] = [];
	const container = getID('has-destinations');
	if (!container) return result;

	const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
	for (const checkbox of checkboxes) {
		const destinationId = checkbox.getAttribute('data-id');
		if (destinationId) {
			result.push({ id: destinationId });
		}
	}
	return result;
}

/** Build the image object for a listing */
export function buildImagemObject(): Record<string, any> {
	return {
		background:
			getID('link-background')?.getAttribute('value') ||
			getID('link-background')?.getAttribute('data-value') ||
			'',
		dark:
			getID('link-logo-dark')?.getAttribute('value') ||
			getID('link-logo-dark')?.getAttribute('data-value') ||
			'',
		light:
			getID('link-logo-light')?.getAttribute('value') ||
			getID('link-logo-light')?.getAttribute('data-value') ||
			'',
		active: (getID('images-enabled') as HTMLInputElement)?.checked ?? true,
	};
}

/** Build the links object for a listing */
export function buildLinksObject(): Record<string, any> {
	const getVal = (id: string): string =>
		(getID(id) as HTMLInputElement)?.value ||
		(getID(id) as HTMLElement)?.getAttribute('data-value') ||
		'';

	return {
		pdf: getVal('link-pdf'),
		vaccine: getVal('link-vaccine'),
		maps: getVal('link-maps'),
		sheet: getVal('link-sheet'),
		drive: getVal('link-drive'),
		ppt: getVal('link-ppt'),
		active: (getID('links-enabled') as HTMLInputElement)?.checked ?? false,
		attachments: getVal('link-attachments'),
	};
}
