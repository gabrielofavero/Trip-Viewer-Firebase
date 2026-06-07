import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { displayError } from '../../utils/messages.js';
import { loadVisibilityIndex } from './support/visibility.js';
import { loadListenersIndex } from './support/event-listeners.js';
import { loadUserIndex } from './support/data.js';

export async function loadIndexPage() {
	loadVisibilityIndex();
	loadListenersIndex();
	loadUserIndex();
}
