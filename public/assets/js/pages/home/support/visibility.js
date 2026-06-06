import { loadUserVisibility, switchVisibility } from '../../../theme/visibility.js';
import { loadLogoColors } from '../../../theme/colors.js';
import { getID } from '../../../utils/dom.js';

export function loadVisibilityIndex() {
	loadUserVisibility();
	loadLogoColors();

	getID("night-mode").onclick = function () {
		switchVisibility();
	};
}
