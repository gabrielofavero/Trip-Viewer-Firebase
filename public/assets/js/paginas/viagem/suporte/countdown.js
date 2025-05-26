// ======= Countdown JS =======

var COUNTDOWN;

// ======= Loaders =======
COUNTDOWN = setInterval(function () {
  if (FIRESTORE_DATA && FIRESTORE_DATA.inicio) {
    const now = new Date().getTime();
    const inicio = _convertFromDateObject(FIRESTORE_DATA.inicio);
    var distance = inicio - now;

    if (now > inicio || distance < 0) {
      clearInterval(COUNTDOWN);
      getID("countdown").innerHTML = "";
      _hideCountdown();
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
        countdownText += years + "a ";
      }

      if (months > 0) {
        countdownText += months + "m ";
      }

      if (days > 0) {
        countdownText += days + "d ";
      }

      if (hours > 0) {
        countdownText += hours + "h ";
      }

      if (minutes > 0) {
        countdownText += minutes + "m ";
      }

      countdownText += seconds + "s ";

      getID("countdown").innerHTML = countdownText;

      if (!_isCountdownVisible()) {
        _showCountdown();
      };
    }
  }
}, 1000);

// ======= SETTERS =======
function _hideCountdown() {
  getID("countdown").style.display = "none";
}

function _showCountdown() {
  getID("countdown").style.display = "block";
}

// ======= CHECKERS =======
function _isCountdownVisible() {
  return getID("countdown").style.display == "block";
}