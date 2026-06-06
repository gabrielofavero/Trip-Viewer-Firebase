import { startLoadingScreen, stopLoadingScreen } from '../../utils/loading.js';
import { displayError } from '../../utils/messages.js';

export async function loadIndexPage() {
	loadVisibilityIndex();
	loadListenersIndex();
	loadUserIndex();
}
