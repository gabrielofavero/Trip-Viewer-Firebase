import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { displayError } from '../../utils/messages.js';
import { loadVisibilityIndex } from './support/visibility.js';
import { loadListenersIndex } from './support/event-listeners.js';
import { loadUserIndex } from './support/data.js';

export async function loadIndexPage() {
	loadVisibilityIndex();
	loadListenersIndex();
	loadUserIndex();

	// Dev mode: expose basic page info (data vars set later in data.ts)
	if (typeof dev !== 'undefined') {
		dev.page.name = 'index';
		dev.page.url = window.location.href;
	}
}
