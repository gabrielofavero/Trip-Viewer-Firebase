import { getID } from '../utils/dom.js';
import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { cancelAnimateOut } from '../utils/messages.js';

// ============================================================
// Progress Loading — reusable full-screen loading with a bar.
//
// Builds a theme-colored spinning ring, a status message, and a
// pill-shaped theme-colored progress bar inside the existing
// #preloader overlay.
// Use it for long, multi-step operations (e.g. restore/import)
// where the default spinner alone is not informative enough.
//
//   startProgressLoading({ message, progress })   → show overlay
//   updateProgressLoading({ message, progress })  → advance bar
//   stopProgressLoading()                          → hide overlay
//
// All options are optional; only the provided values are applied.
// ============================================================

interface ProgressLoadingOptions {
	message?: string;
	progress?: number;
}

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

function clampProgress(value: number): number {
	return Math.min(MAX_PROGRESS, Math.max(MIN_PROGRESS, value));
}

/**
 * Returns the progress container, creating it inside #preloader
 * on first use so no static HTML changes are required on any page.
 */
function getProgressContainer(): HTMLElement | null {
	let container = getID('progress-loading');
	if (container) return container;

	const preloader = getID('preloader');
	if (!preloader) return null;

	container = document.createElement('div');
	container.id = 'progress-loading';
	container.className = 'progress-loading';
	container.innerHTML = `
		<div class="progress-loading-spinner"></div>
		<div class="progress-loading-message"></div>
		<div class="progress-loading-track">
			<div class="progress-loading-bar"></div>
		</div>
	`;
	preloader.appendChild(container);
	return container;
}

/**
 * Shows the loading overlay and switches it into progress mode
 * (the default spinner is hidden, the bar + message are shown).
 */
export function startProgressLoading(options: ProgressLoadingOptions = {}): void {
	const preloader = getID('preloader');
	if (!preloader) return;

	// Replace whatever is currently in the overlay (e.g. a dialog that a prior
	// closeMessage() is still animating out) with the progress view. Cancel the
	// pending close first so its completion can't wipe this overlay afterwards.
	if ((preloader as any)._closeMsgTimeout) {
		clearTimeout((preloader as any)._closeMsgTimeout);
		delete (preloader as any)._closeMsgTimeout;
	}
	cancelAnimateOut(preloader.firstElementChild as HTMLElement | null);
	preloader.innerHTML = '';

	// A dialog closed right before this (closeMessage() → startProgressLoading())
	// leaves its translucent dark background + backdrop blur inline on #preloader
	// because the pending close cleanup never ran. Reset both so the progress
	// overlay sits on the clean solid preloader background (var(--bg-primary)),
	// not on top of the blurred dialog backdrop.
	preloader.style.background = '';
	preloader.style.backdropFilter = '';
	(preloader.style as any).webkitBackdropFilter = '';

	const container = getProgressContainer();
	if (!container) return;

	preloader.classList.add('progress-mode');
	container.classList.add('active');

	updateProgressLoading(options);
	startLoadingScreen();
}

/**
 * Updates the status message and/or the bar width (0–100).
 */
export function updateProgressLoading(options: ProgressLoadingOptions): void {
	const container = getID('progress-loading');
	if (!container) return;

	if (options.message !== undefined) {
		const messageEl = container.querySelector<HTMLElement>('.progress-loading-message');
		if (messageEl) {
			messageEl.textContent = options.message;
			// Restart the fade-in animation on every update
			messageEl.classList.remove('progress-loading-message-enter');
			void messageEl.offsetWidth;
			messageEl.classList.add('progress-loading-message-enter');
		}
	}

	if (options.progress !== undefined) {
		const barEl = container.querySelector<HTMLElement>('.progress-loading-bar');
		if (barEl) barEl.style.width = `${clampProgress(options.progress)}%`;
	}
}

/**
 * Hides the progress bar and stops the underlying loading screen.
 * Safe to call even if the progress bar was never started.
 */
export function stopProgressLoading(): void {
	getID('preloader')?.classList.remove('progress-mode');
	getID('progress-loading')?.classList.remove('active');
	stopLoadingScreen();
}
