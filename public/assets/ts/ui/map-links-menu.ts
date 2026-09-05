// ======= Map Links Menu (multi-region map picker, F204) =======
// When a place has ONE map link PER REGION (mapsPerRegion + regionMaps), the
// map action opens a small popover listing each region so the visitor picks
// which link to open. This is a self-contained component: it installs one
// document-level delegated click handler (idempotent) so it works on every
// surface that renders destination actions — the destination.html dialog,
// the view.html item popups, and the inner-itinerary boxes — without each
// page having to register a data-action.
//
// Markup contract (built by the consumer, e.g. pages/destination/card-actions):
//   <span class="map-links">
//     <button class="... map-links-trigger" type="button" aria-haspopup="true">…</button>
//     <div class="map-links-menu" hidden>
//       <button type="button" class="map-links-option" data-url="…">Region</button>
//       …
//     </div>
//   </span>

export interface MapLinkOption {
	/** Region label (e.g. "Ipanema"). */
	region: string;
	/** Google Maps URL to open. */
	url: string;
}

function escapeHtml(value: string): string {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** The popover body (list of region → map link options). */
export function getMapLinksMenuHTML(options: MapLinkOption[]): string {
	if (options.length === 0) return '';
	const rows = options
		.map(
			(option) => `
        <button type="button" class="map-links-option" role="menuitem" data-url="${escapeHtml(option.url)}">
          <i class="iconify map-links-option-icon" data-icon="mingcute:location-line"></i>
          <span class="map-links-option-region">${escapeHtml(option.region)}</span>
          <i class="iconify map-links-option-open" data-icon="tabler:external-link"></i>
        </button>`,
		)
		.join('');
	return `
    <div class="map-links-menu" role="menu" hidden>
      ${rows}
    </div>`;
}

let _initialized = false;

/**
 * Install the delegated open/close handlers. Safe to call more than once
 * (each page that imports the component may call it on load).
 */
export function initMapLinksMenus(): void {
	if (_initialized) return;
	_initialized = true;

	document.addEventListener('click', (event: MouseEvent) => {
		const target = event.target as HTMLElement | null;
		if (!target) return;

		const trigger = target.closest<HTMLElement>('.map-links-trigger');
		if (trigger) {
			event.preventDefault();
			event.stopPropagation();
			const wrapper = trigger.closest<HTMLElement>('.map-links');
			const menu = wrapper?.querySelector<HTMLElement>('.map-links-menu');
			if (!menu) return;
			const opening = menu.hidden;
			closeAllMapLinksMenus();
			if (opening) {
				menu.hidden = false;
				menu.classList.add('open');
				wrapper?.classList.add('map-links-open');
			}
			return;
		}

		const option = target.closest<HTMLElement>('.map-links-option');
		if (option) {
			event.preventDefault();
			event.stopPropagation();
			const url = option.getAttribute('data-url');
			if (url) window.open(url, '_blank', 'noopener');
			closeAllMapLinksMenus();
			return;
		}

		// Clicking anywhere outside a `.map-links` wrapper closes open menus.
		if (!target.closest<HTMLElement>('.map-links')) {
			closeAllMapLinksMenus();
		}
	});

	document.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Escape') closeAllMapLinksMenus();
	});
}

function closeAllMapLinksMenus(): void {
	for (const wrapper of Array.from(document.querySelectorAll<HTMLElement>('.map-links'))) {
		const menu = wrapper.querySelector<HTMLElement>('.map-links-menu');
		if (menu) {
			menu.hidden = true;
			menu.classList.remove('open');
		}
		wrapper.classList.remove('map-links-open');
	}
}
