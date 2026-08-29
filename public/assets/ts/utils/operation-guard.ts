import { translate } from '../i18n/translation.js';

/**
 * Guards against accidental page refresh/close while a data operation
 * (backup, restore, document import/export, static export) is in flight.
 *
 * The `beforeunload` prompt is only installed while at least one operation is
 * active, so the rest of the app keeps working without confirm dialogs. Each
 * `beginOperation()` must be paired with an `endOperation()` (use `try/finally`
 * so the guard is always released on errors too).
 */

let activeOperations = 0;

function handleBeforeUnload(event: BeforeUnloadEvent): void {
	event.preventDefault();
	// Firefox still shows this as the confirm text; Chrome ignores custom text
	// and shows its own "Leave site?" prompt.
	event.returnValue = translate('messages.busy_operation');
}

/** Mark the start of a guarded data operation. */
export function beginOperation(): void {
	activeOperations++;
	if (activeOperations === 1) {
		window.addEventListener('beforeunload', handleBeforeUnload);
	}
}

/** Mark the end of a guarded data operation (safe to call on any path). */
export function endOperation(): void {
	activeOperations = Math.max(0, activeOperations - 1);
	if (activeOperations === 0) {
		window.removeEventListener('beforeunload', handleBeforeUnload);
	}
}

/** True while at least one guarded operation is in flight. */
export function hasActiveOperation(): boolean {
	return activeOperations > 0;
}

/**
 * Run a synchronous callback with the beforeunload guard temporarily removed.
 *
 * Chrome fires `beforeunload` when a download is initiated via `link.click()`,
 * so a guarded download would show a spurious "Leave site?" prompt even though
 * no close/reload was attempted. Wrapping the click in this helper keeps the
 * guard active during the actual data loading, but silent during the download
 * hand-off. The listener is restored immediately (the callback is synchronous).
 */
export function suspendOperationGuard<T>(fn: () => T): T {
	const wasGuarded = activeOperations > 0;
	if (wasGuarded) {
		window.removeEventListener('beforeunload', handleBeforeUnload);
	}
	try {
		return fn();
	} finally {
		if (wasGuarded) {
			window.addEventListener('beforeunload', handleBeforeUnload);
		}
	}
}
