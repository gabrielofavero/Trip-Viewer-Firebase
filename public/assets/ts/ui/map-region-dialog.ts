// ======= Map links per region — editor dialog (F204) =======
// Shared modal used by the standalone edit-destination page AND the quick
// editor on destination.html. It shows one URL input per region of a place so
// the owner can set a different Google Maps link for each region. Returns the
// { region → url } map (empty strings kept so the editor can tell "no link"
// from "link"), or null when cancelled.

import { closeMessage, displayFullMessage, MESSAGE_PROPERTIES } from '../utils/messages.js';
import { cloneObject, getID } from '../utils/dom.js';
import { translate } from '../i18n/translation.js';

export interface RegionMapValues {
	[region: string]: string;
}

function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Open the "map links per region" editor.
 *
 * @param regions The place's current regions (order is preserved).
 * @param values  Current region → url values to prefill.
 * @returns The updated { region → url } object (may hold empty strings), or
 *          null if the owner cancelled.
 */
export function openMapRegionDialog({
	regions,
	values,
}: {
	regions: string[];
	values: RegionMapValues;
}): Promise<RegionMapValues | null> {
	return new Promise((resolve) => {
		if (!Array.isArray(regions) || regions.length === 0) {
			resolve(null);
			return;
		}

		let resolved = false;
		const done = (value: RegionMapValues | null) => {
			if (resolved) return;
			resolved = true;
			resolve(value);
		};

		const properties = cloneObject(MESSAGE_PROPERTIES);
		properties.title = translate('destination.mapStrategy.perRegionTitle');
		// Input dialog → full screen on mobile (feels like a separate page).
		properties.fullscreen = true;
		properties.containers = {
			principal: 'message-container map-region-dialog-container',
			buttons: 'button-box',
		};
		// The X close button cancels too.
		properties.icons = [
			{
				type: 'close',
				action: () => {
					done(null);
					closeMessage();
				},
			},
		];

		const rows = regions
			.map((region, index) => {
				const current = values?.[region] ?? '';
				return `
          <div class="map-region-row">
            <span class="map-region-row-label">${escapeHtml(region)}</span>
            <input
              id="map-region-url-${index}"
              class="map-region-row-input"
              type="url"
              placeholder="${escapeHtml(translate('destination.mapStrategy.urlPlaceholder'))}"
              value="${escapeHtml(current)}"
            />
          </div>`;
			})
			.join('');

		properties.content = `
          <p class="map-region-dialog-caption">${escapeHtml(translate('destination.mapStrategy.perRegionCaption'))}</p>
          <div class="map-region-dialog">${rows}</div>`;

		properties.buttons = [
			{
				type: 'cancel',
				action: () => {
					done(null);
					closeMessage();
				},
			},
			{
				type: 'confirm',
				label: 'labels.save',
				action: () => {
					const next: RegionMapValues = {};
					regions.forEach((region, index) => {
						next[region] = (getID<HTMLInputElement>(`map-region-url-${index}`)?.value ?? '').trim();
					});
					done(next);
					closeMessage();
				},
			},
		];

		displayFullMessage(properties);
	});
}
