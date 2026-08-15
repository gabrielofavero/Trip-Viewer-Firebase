// ======= Shared GLightbox Wrapper =======
// Extracted from trip-detail/support/embed.ts so the view gallery and the
// destination card media (P3) register GLightbox galleries from one place.
//
// `className` is bound through GLightbox's `selector` option — every element
// carrying that class opens the lightbox (grouped via `data-gallery`).
// GLightbox is a vendor global — do NOT import it.

export function loadImageLightbox(className: string): void {
	GLightbox({
		selector: `.${className}`,
		autofocusVideos: false,
		touchNavigation: true,
		touchFollowAxis: true,
		width: 'auto',
		height: 'auto',
	});
}
