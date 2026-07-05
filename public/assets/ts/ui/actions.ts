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
        let el = event.target as Element | null;

        // Walk up the DOM to find data-action, respecting data-stop-propagation boundaries
        while (el) {
            if (el.hasAttribute("data-stop-propagation")) {
                event.stopPropagation();
                // Handle data-action on the stop-propagation element itself, then stop
                const action = el.getAttribute("data-action");
                if (action) {
                    const handler = _pageActions[action];
                    if (typeof handler === "function") {
                        handler(el, event);
                    }
                }
                return;
            }

            if (el.hasAttribute("data-action")) {
                const action = el.getAttribute("data-action");
                const handler = _pageActions[action];
                if (typeof handler === "function") {
                    handler(el, event);
                } else {
                    console.warn(`No handler registered for action: "${action}"`);
                }
                return;
            }

            el = el.parentElement;
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
