function _animate(fadeIn, fadeOut, from = 0, to = 0, horizontal = true) {
    const forward = horizontal ? 'left' : 'down';
    const backwards = horizontal ? 'right' : 'up';

    if (fadeIn && fadeOut) {
        if (from == to) {
            _fade(fadeOut, fadeIn);
        } else if (from > to) {
            _swipe(fadeOut, fadeIn, backwards);
        } else {
            _swipe(fadeOut, fadeIn, forward);
        }
    } else if (fadeIn) {
        if (from == to) {
            _fadeIn(fadeIn);
        } else if (from > to) {
            _swipeIn(fadeIn, backwards);
        } else {
            _swipeIn(fadeIn, forward);
        }
    }
}

function _animateRight(fadeIn, fadeOut) {
    _animate(fadeIn, fadeOut, 0, 1, true);
}

function _animateLeft(fadeIn, fadeOut) {
    _animate(fadeIn, fadeOut, 1, 0, true);
}

function _animateUp(fadeIn, fadeOut) {
    _animate(fadeIn, fadeOut, 1, 0, false);
}

function _animateDown(fadeIn, fadeOut) {
    _animate(fadeIn, fadeOut, 0, 1, false);
}

// Fade
function _fadeOut(elementIds, mili = 250) {
    elementIds.forEach(function (id) {
        var $element = $('#' + id);
        $element.animate({
            opacity: 0
        }, mili, function () {
            $element.css('display', 'none');
        });
    });
}

function _fadeIn(elementIds, mili = 250) {
    elementIds.forEach(function (id) {
        var $element = $('#' + id);
        $element.css({
            'display': '',
            'opacity': 0
        }).animate({
            opacity: 1
        }, mili);
    });
}

function _fade(fadeOutIds, fadeInIds, duration=250) {
    _fadeOut(fadeOutIds);
    setTimeout(function () {
        _fadeIn(fadeInIds);
    }, duration);
}

// Swipe
function _swipeOut(elementIds, direction) {
    const transformOut = _getSwipeDirection(direction, false);
    elementIds.forEach(id => {
        const $element = $('#' + id);
        $element.css({
            'transition': 'transform 0.5s ease, opacity 0.5s ease',
            'transform': transformOut,
            'opacity': '0'
        });

        // Ensure element is hidden after animation
        setTimeout(() => $element.hide(), 500);
    });
}

function _swipeIn(elementIds, direction) {
    const transformInStart = _getSwipeDirection(direction, true);
    const transformInEnd = 'translateX(0) translateY(0)'; // Reset to original position

    elementIds.forEach(id => {
        const $element = $('#' + id);
        // Initially set to start position and invisible
        $element.css({
            'display': '',
            'transition': 'none', // Disable transition for initial state
            'transform': transformInStart,
            'opacity': '0'
        });

        // Trigger the transition to end position
        setTimeout(() => {
            $element.css({
                'transition': 'transform 0.5s ease, opacity 0.5s ease', // Enable transitions
                'transform': transformInEnd,
                'opacity': '1'
            });
        }, 20); // Short delay to ensure initial state is applied
    });
}

function _getSwipeDirection(direction, isEntering) {
    switch (direction) {
        case 'up':
            return isEntering ? 'translateY(100%)' : 'translateY(-100%)';
        case 'down':
            return isEntering ? 'translateY(-100%)' : 'translateY(100%)';
        case 'left':
            return isEntering ? 'translateX(100%)' : 'translateX(-100%)';
        case 'right':
            return isEntering ? 'translateX(-100%)' : 'translateX(100%)';
        default:
            return '';
    }
}

function _swipe(swipeOutIds, swipeInIds, direction) {
    _swipeOut(swipeOutIds, direction);
    setTimeout(() => _swipeIn(swipeInIds, direction), 500);
}

