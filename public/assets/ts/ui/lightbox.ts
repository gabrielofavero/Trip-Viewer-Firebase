// ======= Shared GLightbox Wrapper =======
// Extracted from trip-detail/support/embed.ts so the view gallery and the
// destination card media (P3) register GLightbox galleries from one place.
//
// `className` is bound through GLightbox's `selector` option — every element
// carrying that class opens the lightbox (grouped via `data-gallery`).
// `callbacks` (optional) lets callers react to the lightbox open/close
// lifecycle (e.g. pause an auto-playing carousel behind the overlay).
// GLightbox is a vendor global — do NOT import it.

export function loadImageLightbox(
	className: string,
	callbacks: { onOpen?: () => void; onClose?: () => void } = {},
): void {
	GLightbox({
		selector: `.${className}`,
		autofocusVideos: false,
		touchNavigation: true,
		touchFollowAxis: true,
		width: 'auto',
		height: 'auto',
		onOpen: callbacks.onOpen,
		onClose: callbacks.onClose,
	});
}
