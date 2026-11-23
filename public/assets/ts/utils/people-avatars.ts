// ======= People Avatars =======
//
// Small, dependency-free HTML builders for person avatars. Kept separate from
// ui/people-wheel.ts so utils/dom.ts can render itinerary avatars without
// pulling the wheel (and its DOM utilities) into a circular import.
//
// People without a photo render the shared default-avatar.svg image (via CSS)
// instead of initials.

export interface PersonLike {
	id?: string;
	name?: string;
	photo?: string;
}

export function escapePeopleHTML(value: any): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeStyleURL(value: any): string {
	return String(value ?? '')
		.replace(/["'\\\n\r]/g, '')
		.trim();
}

/**
 * The bundled default avatar is rendered by the `:not(.has-photo)` CSS (themed
 * gradient + white person icon). Treating its URL as "no photo" keeps the same
 * circle identical in the cards, the wheel and the highlights.
 */
function isDefaultAvatarPhoto(photo: string): boolean {
	return !photo || /(^|\/)default-avatar\.svg(?:\?.*)?$/.test(photo);
}

/**
 * Circular avatar for a person. People without a (real) photo fall back to the
 * default avatar image styled by `.people-avatar:not(.has-photo)`.
 */
export function getPersonAvatarHTML(person: PersonLike, extraClass = 'people-avatar'): string {
	const photo = escapeStyleURL(person?.photo);
	const hasPhoto = !isDefaultAvatarPhoto(photo);
	const style = hasPhoto ? ` style="background-image: url('${photo}')"` : '';

	return `<span class="${extraClass}${hasPhoto ? ' has-photo' : ''}"${style}></span>`;
}

/**
 * Overlapping avatars for people that actually have a photo. Returns '' when
 * nobody qualifies, which keeps text-only layouts untouched.
 *
 * At most `maxVisible` circles are rendered; when the stack has more people
 * than that, the remainder collapses into a single "…" circle so the row
 * never blows up the layout.
 */
export function getPeopleAvatarStackHTML(
	people: PersonLike[],
	extraClass = '',
	maxVisible = 4,
): string {
	const withPhoto = (people || []).filter((person) => person?.photo);
	if (withPhoto.length === 0) return '';

	const limit = Math.max(1, Math.floor(maxVisible) || 1);
	const visible = withPhoto.slice(0, limit);
	const hiddenCount = withPhoto.length - visible.length;

	const className = `people-avatar-stack${extraClass ? ` ${extraClass}` : ''}`;
	const avatars = visible.map((person) => getPersonAvatarHTML(person)).join('');
	const more =
		hiddenCount > 0
			? `<span class="people-avatar people-avatar-overflow" aria-hidden="true">…</span>`
			: '';
	return `<span class="${className}">${avatars}${more}</span>`;
}
