
export function animate(fadeIn, fadeOut, from = 0, to = 0, horizontal = true) {
    const forward = horizontal ? 'left' : 'down';
    const backwards = horizontal ? 'right' : 'up';

    if (fadeIn && fadeOut) {
        if (from == to) {
            animateFade(fadeOut, fadeIn);
        } else if (from > to) {
            swipe(fadeOut, fadeIn, backwards);
        } else {
            swipe(fadeOut, fadeIn, forward);
        }
    } else if (fadeIn) {
        if (from == to) {
            animateFadeIn(fadeIn);
        } else if (from > to) {
            swipeIn(fadeIn, backwards);
        } else {
            swipeIn(fadeIn, forward);
        }
    }
}

// Fade
export function animateFadeOut(elementIds, mili = 250) {
    elementIds.forEach(function (id) {
        var $element = $('#' + id);
        $element.animate({
            opacity: 0
        }, mili, function () {
            $element.css('display', 'none');
        });
    });
}

export function animateFadeIn(elementIds, mili = 250) {
    elementIds.forEach(function (id) {
        var $element = $('#' + id);
        $element.css({
            'display': 'block',
            'opacity': 0
        }).animate({
            opacity: 1
        }, mili);
    });
}

export function animateFade(fadeOutIds, fadeInIds, duration=250) {
    animateFadeOut(fadeOutIds);
    setTimeout(function () {
        animateFadeIn(fadeInIds);
    }, duration);
}

// Swipe
function swipeOut(elementIds, direction) {
    const transformOut = getSwipeDirection(direction, false);
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

function swipeIn(elementIds, direction) {
    const transformInStart = getSwipeDirection(direction, true);
    const transformInEnd = 'translateX(0) translateY(0)'; // Reset to original position

    elementIds.forEach(id => {
        const $element = $('#' + id);
        // Initially set to start position and invisible
        $element.css({
            'display': 'block',
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

function getSwipeDirection(direction, isEntering) {
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

function swipe(swipeOutIds, swipeInIds, direction) {
    swipeOut(swipeOutIds, direction);
    setTimeout(() => swipeIn(swipeInIds, direction), 500);
}

