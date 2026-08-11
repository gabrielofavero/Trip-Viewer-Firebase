// ======= Places API — Dialog Shell (P5) =======
// Multi-step dialog used by the edit-destination "Fetch Info With Maps" flow
// (and shared later by the bulk "Update with Maps" flow).
//
// This module is the dialog SHELL only: it owns the fullscreen modal, the step
// state machine, the back/close navigation, and the dialog-scoped loading
// overlay (which reuses the app's spinner animation and can cancel the
// in-flight request via an AbortController).
//
// Step CONTENT is provided by later prompts via registerStepRenderer():
//   - places-linked-step.ts         (P6b) renders the 'linked' step (already-linked entries)
//   - places-search-step.ts         (P6)  renders the 'search' step
//   - places-details-step.ts        (P7)  renders the 'details' step
//   - places-closed-photos-step.ts  (P8)  renders the 'photos' / 'closed' steps
// Until a step has a renderer, a small placeholder is shown so the shell is
// buildable and demoable on its own.
//
// References:
// - docs/ai-analysis/6-places-api-edit-destination.md (§4, P5)
// - models/places-api.model.ts / data/services/places-api.service.ts (P1)

import { cloneObject, getID } from '../utils/dom.js';
import {
	closeMessage,
	displayError,
	displayFullMessage,
	getContainersInput,
	MESSAGE_PROPERTIES,
	openToast,
} from '../utils/messages.js';
import { translate } from '../i18n/translation.js';
import { FIRESTORE_DESTINATIONS_DATA } from '../data/state.js';
import { PLACES_API_ENABLED } from '../data/services/places-api.service.js';

/** The steps the Places dialog can be in. */
export type PlacesDialogStep = 'linked' | 'search' | 'details' | 'photos' | 'closed' | 'done';

/** Entry context the dialog was opened for. */
export interface PlacesDialogContext {
	/** Destination category ('restaurants' | 'snacks' | 'nightlife' | 'tourism' | 'shopping'). */
	category: string;
	/** Entry index within the category (1-based, matches the form ids `#<category>-<field>-<j>`). */
	j: number;
	/** Current entry name (from the form). */
	entryName: string;
	/** Destination doc title. */
	destinationTitle: string;
	/** Previously saved `placeAPI` object for this entry (or null). */
	placeAPI: Record<string, any> | null;
}

/** A step renderer: given the dialog context, returns HTML for the step. */
export type StepRenderer = (context: PlacesDialogContext) => string | Promise<string>;

// ------------------------------------------------------------------
// Module state
// ------------------------------------------------------------------
let _active = false;
let _context: PlacesDialogContext | null = null;
let _step: PlacesDialogStep = 'search';
let _history: PlacesDialogStep[] = [];
let _stepData: Record<string, unknown> = {};
let _abortController: AbortController | null = null;
const _stepRenderers: Partial<Record<PlacesDialogStep, StepRenderer>> = {};

/** Loading message key per step ('' when the step has no fetch of its own). */
const STEP_LOADING_KEYS: Partial<Record<PlacesDialogStep, string>> = {
	search: 'placesApi.loading.search',
	details: 'placesApi.loading.fetching',
	photos: 'placesApi.loading.importing',
};

/**
 * Toast shown when the worker degrades a response because the monthly Places
 * quota is nearly reached (photos disabled; search/details still returned).
 * `#toast` (z-index 10000) renders above the fullscreen dialog modal (preloader
 * z-index 9999), so it is visible while the Places dialog is open.
 */
export function notifyPlacesLimited(): void {
	openToast(translate('placesApi.limited.message'));
}

// ------------------------------------------------------------------
// Lifecycle
// ------------------------------------------------------------------

/**
 * Open the Places dialog for the given destination entry.
 * Reads the current entry name + saved `placeAPI`. Entries already linked to a
 * Google place start on the 'linked' step (update it vs find a different one);
 * brand-new entries start at the search step.
 */
export function openPlacesDialog(category: string, j: number): void {
	// HARD CHECK — the Places feature is local-environments only. Even if the
	// button somehow rendered on a deployed host, opening the dialog refuses.
	if (PLACES_API_ENABLED !== true) {
		displayError(new Error(translate('placesApi.errors.localOnly')));
		return;
	}
	if (_active) return;

	const entryName = getID(`${category}-name-${j}`)?.value ?? '';
	const destinationTitle = getID('title')?.value ?? FIRESTORE_DESTINATIONS_DATA?.title ?? '';
	const placeAPI = getEntryPlaceAPI(category, j);

	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('placesApi.dialog.title');
	properties.containers = getContainersInput();
	// Mark the container so the CSS can widen this data-heavy dialog.
	properties.containers.principal = `${properties.containers.principal} places-dialog-container`;
	properties.fullscreen = true;
	// The X close button renders in the standard icon box (above the title);
	// its action cancels the in-flight request before closing (closeDialog).
	// closeButton stays false so Escape keeps going through closeDialog (which
	// aborts) instead of the generic closeMessage.
	properties.closeButton = false;
	properties.icons = [{ type: 'close', action: closeDialog }];
	properties.buttons = [];
	properties.content = getDialogShellHTML();
	displayFullMessage(properties);

	_active = true;
	_context = { category, j, entryName, destinationTitle, placeAPI };
	_stepData = {};
	_history = [];
	// Already-linked entries start on the 'linked' step (update this place vs
	// find a different place); brand-new entries go straight to search.
	_step = placeAPI?.id ? 'linked' : 'search';

	wireDialogControls();
	document.addEventListener('keydown', handlePlacesKeydown);
	void goTo(_step);
}

/** Close the dialog, cancelling any in-flight request first. */
export function closeDialog(): void {
	if (!_active) return;
	abortCurrentRequest();
	_active = false;
	_context = null;
	_step = 'search';
	_history = [];
	_stepData = {};
	document.removeEventListener('keydown', handlePlacesKeydown);
	closeMessage();
}

// ------------------------------------------------------------------
// Step navigation
// ------------------------------------------------------------------

/**
 * Navigate to a step. Any in-flight request from the previous step is
 * cancelled, then the step's registered renderer is invoked.
 */
export async function goTo(step: PlacesDialogStep): Promise<void> {
	if (!_active) return;
	abortCurrentRequest();
	if (_step !== step) _history.push(_step);
	_step = step;
	updateBackButton();
	await renderStep(step);
}

/** Go back to the previous step (mirrors the browser back stack). */
export function goBack(): void {
	if (!_active || _history.length === 0) return;
	abortCurrentRequest();
	const previous = _history.pop() as PlacesDialogStep;
	_step = previous;
	updateBackButton();
	void renderStep(previous);
}

/** Register the renderer for a step (called by the step modules P6/P7/P8/P9). */
export function registerStepRenderer(step: PlacesDialogStep, renderer: StepRenderer): void {
	_stepRenderers[step] = renderer;
}

// ------------------------------------------------------------------
// Context / cross-step data
// ------------------------------------------------------------------

/** The context the dialog was opened for (null when closed). */
export function getDialogContext(): PlacesDialogContext | null {
	return _context;
}

/** Store a value shared between steps (e.g. the selected search result). */
export function setStepData(key: string, value: unknown): void {
	_stepData[key] = value;
}

/** Read a value shared between steps. */
export function getStepData<T = unknown>(key: string): T | undefined {
	return _stepData[key] as T | undefined;
}

// ------------------------------------------------------------------
// Dialog-scoped loading
// ------------------------------------------------------------------

/**
 * Show the dialog-scoped loading overlay with the given message.
 * The overlay reuses the app's spinner animation (base/preloader.css
 * `animate-preloader` ring) and offers an X that cancels the in-flight request.
 */
export function showDialogLoading(message = ''): void {
	const overlay = getID('places-dialog-loading');
	if (!overlay) return;
	const messageEl = getID('places-dialog-loading-message');
	if (messageEl) messageEl.textContent = message;
	overlay.style.display = 'flex';
}

/** Hide the dialog-scoped loading overlay. */
export function hideDialogLoading(): void {
	const overlay = getID('places-dialog-loading');
	if (overlay) overlay.style.display = 'none';
}

/** Default loading message for a step ('' when the step has no fetch). */
export function getStepLoadingMessage(step: PlacesDialogStep): string {
	const key = STEP_LOADING_KEYS[step];
	return key ? translate(key) : '';
}

/**
 * Run `task` under the dialog-scoped loading overlay.
 *
 * A fresh AbortController is created and its signal is passed to `task`, so a
 * step renderer can hand it straight to the Places API service
 * (e.g. `searchPlaces(q, { signal })`). The overlay's X (or
 * `abortCurrentRequest()`) aborts that controller: `task` rejects with
 * AbortError and this helper returns `null` — the caller should bail without
 * touching the DOM.
 *
 * Non-abort errors are re-thrown so the step renderer can surface them
 * (usually via displayError()).
 */
export async function withDialogLoading<T>(
	task: (signal: AbortSignal) => Promise<T>,
	message = '',
): Promise<T | null> {
	if (!_active) return null;
	abortCurrentRequest();
	const controller = new AbortController();
	_abortController = controller;
	showDialogLoading(message);
	try {
		return await task(controller.signal);
	} catch (error) {
		if (isAbortError(error)) return null;
		throw error;
	} finally {
		if (_abortController === controller) {
			_abortController = null;
			hideDialogLoading();
		}
	}
}

/** Cancel the current in-flight request (if any) and hide the loading overlay. */
export function abortCurrentRequest(): void {
	if (_abortController) {
		_abortController.abort();
		_abortController = null;
	}
	hideDialogLoading();
}

/** Whether `error` is a user-cancelled AbortError. */
export function isAbortError(error: unknown): boolean {
	return (error as Error)?.name === 'AbortError';
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

function getDialogShellHTML(): string {
	return `
	<div class="places-dialog" id="places-dialog">
		<div class="places-dialog-header">
			<button id="places-dialog-back" type="button" class="places-dialog-back" style="display: none">
				<i class="iconify" data-icon="material-symbols-light:arrow-back"></i>
				<span>${translate('placesApi.details.back')}</span>
			</button>
		</div>
		<div id="places-dialog-step" class="places-dialog-step"></div>
		<div id="places-dialog-loading" class="places-dialog-loading" style="display: none">
			<div class="places-dialog-loading-ring"></div>
			<div id="places-dialog-loading-message" class="places-dialog-loading-message"></div>
			<i id="places-dialog-loading-cancel" class="iconify places-dialog-loading-cancel"
				data-icon="material-symbols-light:close" role="button"></i>
		</div>
	</div>`;
}

function wireDialogControls(): void {
	const dialog = getID('places-dialog');
	if (!dialog) return;
	// Use closest() + event delegation so the buttons keep working after
	// Iconify replaces the <i> close icons with <svg> at runtime (same pattern
	// as utils/messages.ts getIconsBox).
	dialog.addEventListener('click', (event) => {
		const target = event.target as Element | null;
		if (!target) return;
		if (target.closest('#places-dialog-back')) {
			goBack();
		} else if (target.closest('#places-dialog-loading-cancel')) {
			abortCurrentRequest();
		}
	});
}

function handlePlacesKeydown(event: KeyboardEvent): void {
	if (event.key === 'Escape') {
		event.preventDefault();
		closeDialog();
	}
}

function updateBackButton(): void {
	const back = getID('places-dialog-back');
	if (!back) return;
	back.style.display = _history.length > 0 ? 'inline-flex' : 'none';
}

function setDialogContent(html: string): void {
	if (!_active) return;
	const step = getID('places-dialog-step');
	if (step) step.innerHTML = html;
}

/** Set the text shown in the message modal's title bar (id `message-title`). */
function setDialogTitle(title: string): void {
	const titleEl = getID('message-title');
	if (!titleEl) return;
	titleEl.textContent = title;
}

async function renderStep(step: PlacesDialogStep): Promise<void> {
	// The title bar follows the current step: the 'linked' step shows its own
	// title ("This place is already linked"), every other step shows the
	// dialog's default title. It reverts as soon as the user confirms an
	// option on the 'linked' step (update vs find a different place).
	setDialogTitle(
		step === 'linked' ? translate('placesApi.linked.title') : translate('placesApi.dialog.title'),
	);
	const renderer = _stepRenderers[step];
	if (!renderer) {
		setDialogContent(getPlaceholderHTML(step));
		return;
	}
	try {
		const html = await renderer(_context as PlacesDialogContext);
		setDialogContent(html ?? '');
	} catch (error) {
		console.error('[places-dialog] Error rendering step', step, error);
		if (!_active) return;
		setDialogContent(getErrorHTML());
	}
}

function getPlaceholderHTML(step: PlacesDialogStep): string {
	return `
	<div class="places-dialog-placeholder">
		<div class="places-dialog-placeholder-icon">
			<i class="iconify" data-icon="material-symbols-light:construction"></i>
		</div>
		<p class="places-dialog-placeholder-title">${translate('placesApi.dialog.title')} — ${step}</p>
		<p class="places-dialog-placeholder-note">Step renderer not registered yet (P6/P7/P8).</p>
	</div>`;
}

function getErrorHTML(): string {
	return `<div class="places-dialog-error">${translate('placesApi.errors.network')}</div>`;
}

function getEntryPlaceAPI(category: string, j: number): Record<string, any> | null {
	const id = getID(`${category}-id-${j}`)?.value;
	if (!id) return null;
	const entry = FIRESTORE_DESTINATIONS_DATA?.[category]?.[id];
	return entry?.placeAPI ?? null;
}
