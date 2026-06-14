import { getVisibility } from '../../../theme/visibility.js';

export function editTrip(code) {
	window.open(`edit/trip?t=${code}&visibility=${getVisibility()}`, "_blank");
}
export function viewTrip(code) {
	window.open(`view.html?t=${code}&visibility=${getVisibility()}`, "_blank");
}

export function newTrip() {
	window.open(`edit/trip?visibility=${getVisibility()}`, "_blank");
}

export function newDestination() {
	window.open(`edit/destination?visibility=${getVisibility()}`, "_blank");
}

export function editDestination(code) {
	window.open(
		`edit/destination?d=${code}&visibility=${getVisibility()}`,
		"_blank",
	);
}

export function viewDestination(code) {
	window.open(`destination?d=${code}&visibility=${getVisibility()}`, "_blank");
}

export function editListing(code) {
	window.open(
		`edit/listing?l=${code}&visibility=${getVisibility()}`,
		"_blank",
	);
}

export function viewListing(code) {
	window.open(`view?l=${code}&visibility=${getVisibility()}`, "_blank");
}

export function newListing() {
	window.open(`edit/listing?visibility=${getVisibility()}`, "_blank");
}

export function goToCurrentTrip() {
	if (window.CURRENT_TRIPS?.length == 1) {
		viewTrip(window.CURRENT_TRIPS[0].id);
	}
}
