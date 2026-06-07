// ======= Centralized Action Delegation =======
//
// Replaces all inline onclick="functionName()" with
// data-action="action-name" + data-* for parameters.
//
// Usage:
//   1. Call initActions() ONCE in app/main.js
//   2. Each page calls registerActions({ actionName: handler, ... })
//   3. In HTML/JS templates, use data-action="action-name" instead of onclick

const _pageActions = {};

/**
 * Initialize the global delegated click listener.
 * Call ONCE at app startup.
 */
export function initActions() {
    document.addEventListener("click", function (event) {
        // Support data-stop-propagation (replaces onclick="event.stopPropagation()")
        const stopPropTarget = (event.target as Element).closest("[data-stop-propagation]");
        if (stopPropTarget) {
            event.stopPropagation();
            // Don't return — the element might also have a data-action
        }

        const target = (event.target as Element).closest("[data-action]");
        if (!target) return;

        const action = target.getAttribute("data-action");
        if (!action) return;

        const handler = _pageActions[action];
        if (typeof handler === "function") {
            handler(target, event);
        } else {
            console.warn(`No handler registered for action: "${action}"`);
        }
    });
}

/**
 * Register action handlers for the current page.
 * @param {Object<string, Function>} actions — map of action-name → handler(target, event)
 */
export function registerActions(actions) {
    Object.assign(_pageActions, actions);
}
