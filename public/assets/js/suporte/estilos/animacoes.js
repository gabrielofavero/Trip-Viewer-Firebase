function _animate(
	fadeIn,
	fadeOut,
	from = 0,
	to = 0,
	horizontal = true,
	isBlock = true,
) {
	const forward = horizontal ? "left" : "down";
	const backwards = horizontal ? "right" : "up";

	if (fadeIn && fadeOut) {
		if (from == to) {
			_fade(fadeOut, fadeIn, isBlock);
		} else if (from > to) {
			_swipe(fadeOut, fadeIn, backwards, isBlock);
		} else {
			_swipe(fadeOut, fadeIn, forward, isBlock);
		}
	} else if (fadeIn) {
		if (from == to) {
			_fadeIn(fadeIn, isBlock);
		} else if (from > to) {
			_swipeIn(fadeIn, backwards, isBlock);
		} else {
			_swipeIn(fadeIn, forward, isBlock);
		}
	}
}

function _animateRight(fadeIn, fadeOut, isBlock = true) {
	_animate(fadeIn, fadeOut, 0, 1, true, isBlock);
}

function _animateLeft(fadeIn, fadeOut, isBlock = true) {
	_animate(fadeIn, fadeOut, 1, 0, true, isBlock);
}

function _animateUp(fadeIn, fadeOut, isBlock = true) {
	_animate(fadeIn, fadeOut, 1, 0, false, isBlock);
}

function _animateDown(fadeIn, fadeOut, isBlock = true) {
	_animate(fadeIn, fadeOut, 0, 1, false, isBlock);
}

// Fade
function _fadeOut(elementIds, mili = 250) {
	elementIds.forEach(function (id) {
		var $element = $("#" + id);
		$element.animate(
			{
				opacity: 0,
			},
			mili,
			function () {
				$element.css("display", "none");
			},
		);
	});
}

function _fadeIn(elementIds, mili = 250, isBlock = true) {
	elementIds.forEach(function (id) {
		var $element = $("#" + id);
		$element
			.css({
				display: isBlock ? "block" : "",
				opacity: 0,
			})
			.animate(
				{
					opacity: 1,
				},
				mili,
			);
	});
}

function _fade(fadeOutIds, fadeInIds, duration = 250, isBlock = true) {
	_fadeOut(fadeOutIds);
	setTimeout(function () {
		_fadeIn(fadeInIds, isBlock);
	}, duration);
}

// Swipe
function _swipeOut(elementIds, direction) {
	const transformOut = _getSwipeDirection(direction, false);
	elementIds.forEach((id) => {
		const $element = $("#" + id);
		$element.css({
			transition: "transform 0.5s ease, opacity 0.5s ease",
			transform: transformOut,
			opacity: "0",
		});

		// Ensure element is hidden after animation
		setTimeout(() => $element.hide(), 500);
	});
}

function _swipeIn(elementIds, direction, isBlock = true) {
	const transformInStart = _getSwipeDirection(direction, true);
	const transformInEnd = "translateX(0) translateY(0)"; // Reset to original position

	elementIds.forEach((id) => {
		const $element = $("#" + id);
		// Initially set to start position and invisible
		$element.css({
			display: isBlock ? "block" : "",
			transition: "none", // Disable transition for initial state
			transform: transformInStart,
			opacity: "0",
		});

		// Trigger the transition to end position
		setTimeout(() => {
			$element.css({
				transition: "transform 0.5s ease, opacity 0.5s ease", // Enable transitions
				transform: transformInEnd,
				opacity: "1",
			});
		}, 20); // Short delay to ensure initial state is applied
	});
}

function _getSwipeDirection(direction, isEntering) {
	switch (direction) {
		case "up":
			return isEntering ? "translateY(100%)" : "translateY(-100%)";
		case "down":
			return isEntering ? "translateY(-100%)" : "translateY(100%)";
		case "left":
			return isEntering ? "translateX(100%)" : "translateX(-100%)";
		case "right":
			return isEntering ? "translateX(-100%)" : "translateX(100%)";
		default:
			return "";
	}
}

function _swipe(swipeOutIds, swipeInIds, direction, isBlock = true) {
	_swipeOut(swipeOutIds, direction);
	setTimeout(() => _swipeIn(swipeInIds, direction, isBlock), 500);
}
