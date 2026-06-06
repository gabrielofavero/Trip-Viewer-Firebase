import { getState } from '../../../data/state.js';

// ======= Countdown JS =======

var COUNTDOWN;

// ======= Loaders =======
COUNTDOWN = setInterval(function () {
	if (getState() && getState().inicio) {
		const now = new Date(Date.now());
		const inicio = convertFromDateObject(getState().inicio);
		var distance = inicio - now;

		if (now > inicio || distance < 0) {
			clearInterval(COUNTDOWN);
			getID("countdown").innerHTML = "";
			hideCountdown();
		} else {
			var years = Math.floor(distance / (1000 * 60 * 60 * 24 * 365));
			distance -= years * (1000 * 60 * 60 * 24 * 365);

			var months = Math.floor(distance / (1000 * 60 * 60 * 24 * 30));
			distance -= months * (1000 * 60 * 60 * 24 * 30);

			var days = Math.floor(distance / (1000 * 60 * 60 * 24));
			distance -= days * (1000 * 60 * 60 * 24);

			var hours = Math.floor(distance / (1000 * 60 * 60));
			distance -= hours * (1000 * 60 * 60);

			var minutes = Math.floor(distance / (1000 * 60));
			distance -= minutes * (1000 * 60);

			var seconds = Math.floor(distance / 1000);

			var countdownText = "";

			if (years > 0) {
				countdownText += years + `${translate("datetime.countdown.years")} `;
			}

			if (months > 0) {
				countdownText += months + `${translate("datetime.countdown.months")} `;
			}

			if (days > 0) {
				countdownText += days + `${translate("datetime.countdown.days")} `;
			}

			if (hours > 0) {
				countdownText += hours + `${translate("datetime.countdown.hours")} `;
			}

			if (minutes > 0) {
				countdownText +=
					minutes + `${translate("datetime.countdown.minutes")} `;
			}

			countdownText += seconds + `${translate("datetime.countdown.seconds")}`;

			getID("countdown").innerHTML = countdownText;

			if (!isCountdownVisible()) {
				showCountdown();
			}
		}
	}
}, 1000);

// ======= SETTERS =======
function hideCountdown() {
	getID("countdown").style.display = "none";
}

function showCountdown() {
	getID("countdown").style.display = "block";
}

// ======= CHECKERS =======
function isCountdownVisible() {
	return getID("countdown").style.display == "block";
}
