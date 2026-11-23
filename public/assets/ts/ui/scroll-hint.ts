// ======= Scroll Hint =======
// Wraps a horizontally scrollable strip (the category tab bars) in a relative
// shell that overlays chevron buttons + edge fades whenever part of the strip
// is off-screen. The strip also gets `.is-scrollable`, so its CSS can switch
// from centered to left-aligned: a centered flex strip that overflows is
// clipped on the unscrollable start edge, which hid the first tabs on phones.

/** Gap (px) kept between a revealed tab and the strip edges. */
const SCROLL_PADDING = 12;

interface ScrollHintEntry {
	update: () => void;
}

const hints = new WeakMap<HTMLElement, ScrollHintEntry>();

/**
 * Wrap `strip` once (later calls only refresh its state) and keep the
 * scrollability classes in sync with scroll position, size and content.
 */
export function setupScrollHint(strip: HTMLElement): void {
	const existing = hints.get(strip);
	if (existing) {
		existing.update();
		return;
	}

	const parent = strip.parentElement;
	if (!parent) return;

	const wrap = document.createElement('div');
	wrap.className = 'scroll-hint';
	parent.insertBefore(wrap, strip);
	wrap.appendChild(strip);
	wrap.append(createScrollButton(strip, 'left'), createScrollButton(strip, 'right'));

	// Move the strip's vertical margins to the shell: a block wrapper's auto
	// height includes its child's margins, which would push the button row
	// (centered at 50%) below the strip's own middle.
	const stripStyles = getComputedStyle(strip);
	wrap.style.marginTop = stripStyles.marginTop;
	wrap.style.marginBottom = stripStyles.marginBottom;
	strip.style.marginTop = '0';
	strip.style.marginBottom = '0';

	const update = () => {
		const maxScroll = strip.scrollWidth - strip.clientWidth;
		const scrollable = maxScroll > 1;
		const atStart = strip.scrollLeft <= 1;
		const atEnd = strip.scrollLeft >= maxScroll - 1;

		wrap.classList.toggle('is-scrollable', scrollable);
		strip.classList.toggle('is-scrollable', scrollable);
		wrap.classList.toggle('has-scroll-left', scrollable && !atStart);
		wrap.classList.toggle('has-scroll-right', scrollable && !atEnd);
	};
	hints.set(strip, { update });

	// Coalesce every trigger into one frame so scrolling stays cheap.
	let frame = 0;
	const scheduleUpdate = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			update();
		});
	};

	strip.addEventListener('scroll', scheduleUpdate, { passive: true });
	// On phones the active tab animates its label open; re-measure when done.
	strip.addEventListener('transitionend', scheduleUpdate);
	window.addEventListener('resize', scheduleUpdate, { passive: true });
	document.fonts?.ready.then(scheduleUpdate).catch(() => undefined);

	if (typeof ResizeObserver !== 'undefined') {
		const resizeObserver = new ResizeObserver(scheduleUpdate);
		const observeStrip = () => {
			resizeObserver.observe(strip);
			for (const child of Array.from(strip.children)) resizeObserver.observe(child);
		};
		observeStrip();
		// Pages re-render the tabs, so observe newly inserted children too.
		new MutationObserver(() => {
			observeStrip();
			scheduleUpdate();
		}).observe(strip, { childList: true });
	}

	update();
}

/** Scroll a tab back inside the visible strip area. */
export function scrollTabIntoView(tab: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
	const strip = tab.parentElement;
	if (!strip) return;

	const reveal = () => {
		const stripRect = strip.getBoundingClientRect();
		const tabRect = tab.getBoundingClientRect();
		if (tabRect.left < stripRect.left + SCROLL_PADDING) {
			strip.scrollBy({ left: tabRect.left - stripRect.left - SCROLL_PADDING, behavior });
		} else if (tabRect.right > stripRect.right - SCROLL_PADDING) {
			strip.scrollBy({ left: tabRect.right - stripRect.right + SCROLL_PADDING, behavior });
		}
	};

	reveal();
	// The active label animates open on phones — measure again when it settles.
	tab.querySelector('.tab-label')?.addEventListener('transitionend', reveal, { once: true });
}

function createScrollButton(
	strip: HTMLElement,
	direction: 'left' | 'right',
): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `scroll-hint-btn scroll-hint-${direction}`;
	button.tabIndex = -1;
	button.setAttribute('aria-hidden', 'true');
	button.innerHTML = `<i class="bx bx-chevron-${direction}"></i>`;
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		const step = Math.max(strip.clientWidth * 0.7, 120);
		strip.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
	});
	return button;
}
