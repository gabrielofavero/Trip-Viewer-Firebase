import { getState } from '../../../data/state.js';
import { TRAVELERS, setTravelersFn } from '../../../data/state.js';
import { getID } from '../../../utils/dom.js';
import { translate } from '../../../i18n/translation.js';
import { escapePeopleHTML, getPersonAvatarHTML } from '../../../utils/people-avatars.js';
import { END_DATE } from '../view.js';
import { START_DATE } from '../view.js';

export function loadSummary() {
	setTravelersFn(getState().travelers);
	const days = Math.ceil((END_DATE.date - START_DATE.date) / (1000 * 60 * 60 * 24)) + 1;
	const travelerList = getState().travelers || [];
	const travelers = travelerList.length || 1;

	// Keypoint 1
	getID('keypoint1').innerHTML = `<i class="bx bxs-plane-take-off"></i>
                                                <span>${START_DATE.text}</span>
                                                <p>${translate('trip.transportation.departure')}</p>`;

	// Keypoint 2
	getID('keypoint2').innerHTML = `<i class="bx bxs-plane-land"></i>
                                                <span>${END_DATE.text}</span>
                                                <p>${translate('trip.transportation.return')}</p>`;

	// Keypoint 3
	getID('keypoint3').innerHTML = `<i class="bx bxs-sun"></i>
                                                <span>${days}</span>
                                                <p>${translate('labels.days')}</p>`;

	// Keypoint 4 — the floating badge carries the travelers' photos (first two,
	// same size) instead of the generic icon; hovering or tapping the box shows
	// the names in a tooltip above the card.
	const withPhoto = travelerList.filter((traveler) => traveler?.photo).slice(0, 2);
	const badge = withPhoto.length
		? `<i class="keypoint-people-badge">${withPhoto
				.map((traveler) => getPersonAvatarHTML(traveler, 'people-avatar keypoint-people-avatar'))
				.join('')}</i>`
		: `<i class="bx bx-male"></i>`;
	const names = travelerList
		.map((traveler) => traveler?.name)
		.filter(Boolean)
		.join(', ');
	const peopleBox = getID('keypoint4');
	peopleBox.classList.toggle('has-people', !!names);
	peopleBox.classList.remove('expanded');
	peopleBox.innerHTML = `${badge}
                                                <span>${travelers}</span>
                                                <p>${translate('labels.people')}</p>
                                                ${names ? `<span class="keypoint-people-names">${escapePeopleHTML(names)}</span>` : ''}`;

	if (peopleBox.dataset.peopleToggle !== 'true') {
		peopleBox.dataset.peopleToggle = 'true';
		peopleBox.addEventListener('click', () => {
			if (peopleBox.classList.contains('has-people')) {
				peopleBox.classList.toggle('expanded');
			}
		});
	}
}
