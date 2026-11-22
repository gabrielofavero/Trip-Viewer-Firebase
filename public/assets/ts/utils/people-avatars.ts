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
 * Circular avatar for a person. People without a photo fall back to the
 * default avatar image styled by `.people-avatar:not(.has-photo)`.
 */
export function getPersonAvatarHTML(person: PersonLike, extraClass = 'people-avatar'): string {
	const photo = escapeStyleURL(person?.photo);
	const style = photo ? ` style="background-image: url('${photo}')"` : '';

	return `<span class="${extraClass}${photo ? ' has-photo' : ''}"${style}></span>`;
}

/**
 * Overlapping avatars for people that actually have a photo. Returns '' when
 * nobody qualifies, which keeps text-only layouts untouched.
 */
export function getPeopleAvatarStackHTML(people: PersonLike[], extraClass = ''): string {
	const withPhoto = (people || []).filter((person) => person?.photo);
	if (withPhoto.length === 0) return '';

	const className = `people-avatar-stack${extraClass ? ` ${extraClass}` : ''}`;
	const avatars = withPhoto.map((person) => getPersonAvatarHTML(person)).join('');
	return `<span class="${className}">${avatars}</span>`;
}
