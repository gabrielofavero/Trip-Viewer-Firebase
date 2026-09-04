/**
 * Shared builder for Google My Maps embeds.
 *
 * Turns a My Maps share/viewer link (e.g.
 * `https://www.google.com/maps/d/viewer?mid=...&usp=sharing`) into the
 * `<iframe class="map-iframe">` used to display the map, or null when the link
 * isn't a usable My Maps link (it must contain `mid=`).
 *
 * Single source of truth, reused by:
 *   - pages/destination/mount.ts         — the destination "Map" tab iframe
 *   - pages/edit-destination/map-preview — live preview under the link field
 */
export function buildMyMapsEmbed(link: string): HTMLIFrameElement | null {
	const trimmed = (link || '').trim();
	if (!trimmed || !trimmed.includes('mid=')) return null;
	const mid = trimmed.split('mid=')[1].split('&')[0];
	if (!mid) return null;

	const iframe = document.createElement('iframe');
	iframe.className = 'map-iframe';
	iframe.src = `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F`;
	iframe.title = 'My Maps';
	return iframe;
}
