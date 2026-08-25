import { getDestinations } from '../../app/config.js';
import {
	firstCharToUpperCase,
	getChildIDs,
	getID,
	getJ,
	getOrCreateCategoryID,
} from '../../utils/dom.js';
import { getUID } from '../../data/firebase/auth.js';
import { displayError, displayMessage } from '../../utils/messages.js';
import { translate } from '../../i18n/translation.js';
import { getDescription } from './categories/description.js';
import { getDestinationImages } from './categories/image.js';
import { getRegionPills } from '../../ui/region-select.js';
import {
	FIRESTORE_DESTINATIONS_DATA,
	FIRESTORE_DESTINATIONS_NEW_DATA,
	setFirestoreDestinationsNewData,
} from '../../data/state.js';

export async function buildDestinationObject() {
	setFirestoreDestinationsNewData({
		snacks: buildDestinationCategoryObject('snacks'),
		shopping: buildDestinationCategoryObject('shopping'),
		restaurants: buildDestinationCategoryObject('restaurants'),
		nightlife: buildDestinationCategoryObject('nightlife'),
		tourism: buildDestinationCategoryObject('tourism'),
		title: getID('title').value,
		currency:
			getID('currency').value == 'other' ? getID('other-currency').value : getID('currency').value,
		myMaps: getID('map-link').value,
		image: getImageObject(),
		modules: {
			snacks: getID(`snacks-enabled`).checked,
			shopping: getID(`shopping-enabled`).checked,
			map: getID('map-enabled').checked,
			restaurants: getID(`restaurants-enabled`).checked,
			nightlife: getID(`nightlife-enabled`).checked,
			tourism: getID(`tourism-enabled`).checked,
		},
		sharing: {
			active: true,
			owner: FIRESTORE_DESTINATIONS_DATA?.sharing?.owner || (await getUID()),
		},
		version: {
			lastUpdated: new Date().toISOString(),
		},
	});
}

function getImageObject() {
	return {
		active: getID('images-enabled').checked,
		background: getID('link-background').value || '',
	};
}

function buildDestinationCategoryObject(category) {
	const childIDs = getChildIDs(`${category}-box`);

	let result = {};

	for (let i = 0; i < childIDs.length; i++) {
		const item: Record<string, any> = {};
		const j = getJ(childIDs[i]);

		const id = getOrCreateCategoryID(category, j);
		item.isNew = getID(`${category}-isNew-${j}`).checked;
		item.createdAt = getID(`${category}-createdAt-${j}`).value;
		item.name = getID(`${category}-name-${j}`).value;
		item.emoji = getID(`${category}-emoji-${j}`).value;
		item.description = getDescription(category, j);
		item.website = getID(`${category}-website-${j}`).value;
		item.instagram = getID(`${category}-instagram-${j}`).value;
		item.regions = getRegionPills(`${category}-regions-${j}`);
		item.map = getID(`${category}-map-${j}`).value;
		item.media = getID(`${category}-media-${j}`).value;
		item.rating = getID(`${category}-rating-${j}`).value;
		item.images = getDestinationImages(category, j);

		const priceSelect = getID(`${category}-price-${j}`);
		item.price =
			priceSelect.innerHTML && priceSelect.value != 'other'
				? priceSelect.value
				: getID(`${category}-other-price-${j}`).value;

		// Preserve the normalized Places API data (migration 17 / Places dialog
		// apply) — the form has no field for `placeAPI`, so without this a Save
		// would wipe it. Existing entries keep the loaded (possibly just-applied)
		// placeAPI; brand-new entries pick up the one staged by the Places dialog
		// via refreshPendingData (see places/places-apply-flow.ts).
		const placeAPI =
			FIRESTORE_DESTINATIONS_DATA?.[category]?.[id]?.placeAPI ??
			FIRESTORE_DESTINATIONS_NEW_DATA?.[category]?.[id]?.placeAPI;
		if (placeAPI) {
			item.placeAPI = placeAPI;
		}

		result[id] = item;
	}

	return result;
}

export async function updateTikTokLinks() {
	let toUpdate = false;
	const urls = {};

	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		const entries = Object.entries(FIRESTORE_DESTINATIONS_NEW_DATA[category]);
		const mediaEntries = entries.map(([id, item]: [string, any]) => ({
			id,
			media: item.media,
		}));

		if (
			!toUpdate &&
			mediaEntries.length > 0 &&
			mediaEntries.some((m) => m.media && isMobileLink(m.media))
		) {
			toUpdate = true;
		}

		urls[category] = mediaEntries;
	}

	if (!toUpdate) return;

	const data = {};
	const unableToConvert = {};

	const CONCURRENCY = 5;
	async function runPool(tasks) {
		const results = [];
		const pool = [];

		for (const task of tasks) {
			const p = task().then((r) => results.push(r));
			pool.push(p);

			if (pool.length >= CONCURRENCY) {
				await Promise.race(pool);
				for (let i = pool.length - 1; i >= 0; i--) {
					if (pool[i].status === 'fulfilled' || pool[i].status === 'rejected') {
						pool.splice(i, 1);
					}
				}
			}
		}

		await Promise.allSettled(pool);
		return results;
	}

	try {
		for (const category of Object.keys(urls)) {
			const newURLs = {};
			const tasks = [];

			for (const { id, media } of urls[category]) {
				tasks.push(async () => {
					let newURL = media;

					if (media && isMobileLink(media)) {
						try {
							const res = await fetch(`https://www.tiktok.com/oembed?url=${media}`, {
								method: 'GET',
							});

							const innerData = await res.json();

							if (innerData.author_unique_id && innerData.embed_product_id) {
								newURL = `https://www.tiktok.com/@${innerData.author_unique_id}/video/${innerData.embed_product_id}`;
							} else {
								throw new Error('TikTok embed not found');
							}
						} catch (err) {
							unableToConvert[category] = unableToConvert[category] || [];
							unableToConvert[category].push(id);
						}
					}

					newURLs[id] = newURL;
				});
			}
			await runPool(tasks);

			data[category] = newURLs;
		}

		if (Object.keys(unableToConvert).length > 0) {
			displayTikTokError(unableToConvert);
			return;
		}

		const destinationsConfig = getDestinations();
		for (const category of destinationsConfig.categories.tours) {
			for (const [id, item] of Object.entries(FIRESTORE_DESTINATIONS_NEW_DATA[category]) as [
				string,
				any,
			][]) {
				if (data[category][id]) {
					item.media = data[category][id];
				}
			}
		}
	} catch (error) {
		displayError(error, false, false);
		console.error(error);
	}

	function isMobileLink(link) {
		return link.startsWith('https://vm.tiktok.com/') || link.startsWith('https://vt.tiktok.com/');
	}

	function displayTikTokError(unableToConvert) {
		const title = `${translate('destination.errors.tiktok.conversion')} <i class="iconify" data-icon="mdi:instagram"></i>`;
		let content = `${translate('destination.errors.tiktok.conversion_message')}<br><br>`;
		for (const category in unableToConvert) {
			const categoryTitle = firstCharToUpperCase(category);
			content += `<strong>${categoryTitle}:</strong><br>`;
			for (const index of unableToConvert[category]) {
				const item = FIRESTORE_DESTINATIONS_NEW_DATA[category][index]?.name || `Item ${index + 1}`;
				content += `${item}<br>`;
			}
		}
		displayMessage(title, content);
	}
}
