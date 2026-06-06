# 🔧 Onclick Cleanup Plan — Eliminate Inline `onclick` Handlers

> **Status:** 📋 Ready to execute
> **Created:** 2026-06-06
> **Goal:** Eliminate ALL inline `onclick` handlers — both in static HTML files and in JS-generated `innerHTML` — replacing them with centralized delegated event listeners. Zero `window.functionName` calls from `onclick`.

---

## 🔍 Root Cause Analysis

The project has two categories of inline `onclick` handlers:

### Type A: Static HTML `onclick` attributes
These are in `.html` files, calling functions like `_openFilterDrawer()`, `_calendarPrevious()`, `_deleteViagem()`, etc. These functions only work because they're set on `window` (or were set before the refactoring removed window attachments).

### Type B: JS-generated `onclick` attributes (in template literals)
These are in `.js` files, where functions build HTML strings with `onclick="functionName(${param})"`. These also rely on the function being globally accessible.

### Why This Is Fragile

1. **Global scope dependency**: Every `onclick` handler requires the function to be on `window` — which we're actively removing.
2. **No import visibility**: Static analysis tools can't trace onclick → function calls.
3. **Parameter serialization bugs**: `onclick="openModal('${categoria}', ${j})"` — string quoting in template literals is error-prone.
4. **No IDE support**: No rename refactoring, no "find all references", no dead-code detection.
5. **Duplicate patterns**: The same `_openAttributions()` pattern appears in 7 HTML files with no shared handler.

---

## ✅ Existing Solution: Index Page's Delegated Handler

The index page (`pages/home/support/event-listeners.js`) already implements the solution pattern:

```js
// Static elements → direct addEventListener
getID("login-button").addEventListener("click", function () {
    signInWithEmailAndPassword();
});

// Dynamic elements → centralized delegated handler on document
document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");

    switch (action) {
        case "sign-out":
            signOut();
            break;
        case "backup-account":
            backupOnClickAction();
            break;
        case "open-trip-dialog": {
            const tripId = target.getAttribute("data-trip-id");
            if (tripId) openTripDialog(tripId);
            break;
        }
        // ... etc
    }
});
```

**Key principles from this pattern:**
1. **Static elements** (those in the HTML at page load) → use `getID("id").addEventListener("click", ...)`
2. **Dynamic elements** (created via JS innerHTML) → use `data-action="action-name"` + `data-*` for parameters → caught by the centralized delegated `document` click handler
3. **Parameters** go in `data-*` attributes, not stringified into an `onclick` string

---

## 📋 Complete Inventory

### A. Static HTML `onclick` (37 occurrences across 7 HTML files)

| File | Line | Current onclick | Suggested `data-action` |
|------|------|----------------|------------------------|
| `destination.html` | 22 | `_openFilterDrawer()` | `open-filter-drawer` |
| `destination.html` | 26 | `_openSortDrawer()` | `open-sort-drawer` |
| `destination.html` | 35 | `_add()` | `add-destination` |
| `destination.html` | 47 | `_openAttributions()` | `open-attributions` |
| `destination.html` | 54 | `_closeDrawer()` (overlay) | `close-drawer` |
| `destination.html` | 58 | `_closeDrawer()` (close btn) | `close-drawer` |
| `destination.html` | 68 | `_closeToast()` | `close-toast` |
| `view.html` | 247 | `_calendarPrevious()` | `calendar-previous` |
| `view.html` | 249 | `_calendarNext()` | `calendar-next` |
| `view.html` | 257 | `_closeModalCalendar()` | `close-modal-calendar` |
| `view.html` | 363 | `_openAttributions()` | `open-attributions` |
| `view.html` | 377 | `_closeToast()` | `close-toast` |
| `expenses.html` | 103 | `_openAttributions()` | `open-attributions` |
| `itinerary.html` | 56 | `_openAttributions()` | `open-attributions` |
| `itinerary.html` | 68 | `_closeToast()` | `close-toast` |
| `edit/trip.html` | 191 | `_openTravelersInfo()` | `open-travelers-info` |
| `edit/trip.html` | 211 | `_requestPinEditarGastos()` | `request-pin-expenses` |
| `edit/trip.html` | 217 | `_deleteViagem()` | `delete-trip` |
| `edit/trip.html` | 449 | `_openInnerGasto('gastosPrevios')` | `open-inner-expense` + `data-category="gastosPrevios"` |
| `edit/trip.html` | 481 | `_openInnerGasto('gastosDurante')` | `open-inner-expense` + `data-category="gastosDurante"` |
| `edit/trip.html` | 543 | `onclick=""` (empty — transport add btn) | Already handled by event-listeners.js via getID |
| `edit/trip.html` | 721 | `_openAtribuicoes()` | `open-attributions` |
| `edit/trip.html` | 736 | `_closeModal('delete-modal')` | `close-modal` + `data-modal="delete-modal"` |
| `edit/trip.html` | 767 | `_closeToast()` | `close-toast` |
| `edit/destination.html` | 159 | `_deleteDestino()` | `delete-destination` |
| `edit/destination.html` | 411 | `_openAtribuicoes()` | `open-attributions` |
| `edit/destination.html` | 426 | `_closeModal('delete-modal')` | `close-modal` + `data-modal="delete-modal"` |
| `edit/destination.html` | 457 | `_closeToast()` | `close-toast` |
| `edit/listing.html` | 111 | `_deleteListagem()` | `delete-listing` |
| `edit/listing.html` | 362 | `_openAtribuicoes()` | `open-attributions` |
| `edit/listing.html` | 377 | `_closeModal('delete-modal')` | `close-modal` + `data-modal="delete-modal"` |
| `edit/listing.html` | 408 | `_closeToast()` | `close-toast` |

### B. JS-Generated `onclick` (26 occurrences across 12 JS files)

| File | Line | Current onclick | Suggested fix |
|------|------|----------------|--------------|
| `utils/dom.js` | 702 | `onclick="window.open('${midia}', '_blank')"` | `data-action="open-link" data-url="${midia}"` |
| `pages/destination/categories.js` | 91 | `onclick="openLinkInNewTab('${item[tipo]}')"` | `data-action="open-link" data-url="${item[tipo]}"` |
| `pages/destination/support/content.js` | 11 | `onclick="${closeAction}(${j})"` | `data-action="close-accordion" data-index="${j}"` |
| `pages/destination/support/content.js` | 52 | `onclick="edit(${j})"` | `data-action="edit-destination" data-index="${j}"` |
| `pages/edit-destination/new-destination.js` | 56 (×5) | `onclick="openDescriptionModal('${categoria}', ${j})"` | `data-action="open-description-modal" data-category="${categoria}" data-index="${j}"` |
| `pages/edit-destination/new-destination.js` | 114 (×5) | `onclick="openMoveDestinationModal(${j}, '${categoria}')"` | `data-action="move-destination" data-index="${j}" data-category="${categoria}"` |
| `pages/trip-detail/categories/destination.js` | 158 | `onclick="loadAndOpenDestino('${type}')"` | `data-action="load-and-open-destination" data-type="${type}"` |
| `pages/trip-detail/categories/transportation-module.js` | 145 | `onclick="copyToClipboard('${reserva}')"` | `data-action="copy-to-clipboard" data-text="${reserva}"` |
| `pages/trip-detail/categories/accommodation-module.js` | 94 | `onclick="window.open('${hospedagem.link}', '_blank')"` | `data-action="open-link" data-url="${hospedagem.link}"` |
| `pages/edit-trip/new-trip.js` | 254 | `onclick="openAccommodationImages(${j})"` | `data-action="open-accommodation-images" data-index="${j}"` |
| `pages/edit-trip/new-trip.js` | 375 | `onclick="openInnerItinerary(${j})"` | `data-action="open-inner-itinerary" data-index="${j}"` |
| `pages/trip-detail/categories/itinerary-module/inner-itinerary.js` | 217 | `onclick="displayInnerItineraryMessage(${...})"` | `data-action="display-inner-itinerary-message" data-index="${...}"` |
| `pages/edit-trip/categories/accommodation.js` | 157 | `onclick="openInnerAccommodationImage(${k})"` | `data-action="open-inner-accommodation-image" data-index="${k}"` |
| `pages/edit-trip/categories/expenses.js` | 246 | `onclick="deleteInnerGasto('${categoria}', '${tipo}', ${index})"` | `data-action="delete-inner-expense" data-category="${categoria}" data-type="${tipo}" data-index="${index}"` |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.js` | 33 | `onclick="openInnerItinerary(${j}, ${k}, '${turno}')"` | `data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-turno="${turno}"` |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/content.js` | 7 | `onclick="openInnerItineraryItem(${j})"` | `data-action="open-inner-itinerary-item" data-index="${j}"` |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/content.js` | 46 | `onclick="openInnerItinerarySwap()"` | `data-action="open-inner-itinerary-swap"` |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/content.js` | 53 | `onclick="deleteInnerProgramacao(${j}, ${k}, '${turno}')"` | `data-action="delete-inner-itinerary" data-j="${j}" data-k="${k}" data-turno="${turno}"` |

### C. `event.stopPropagation()` Pattern
One special case in `destination.html` line 55:
```html
<div class="drawer" id="drawer" onclick="event.stopPropagation()">
```
This is NOT a function call — it's inline JS to stop bubbling. It should be converted to a `data-stop-propagation` attribute handled by the delegated listener, or simply be a non-issue since the drawer close is handled by the overlay click.

---

## 🎯 Unified Action Name Convention

To make the delegated handler manageable, use these standard action names across all pages:

| Action Name | Parameters | Used By |
|------------|------------|---------|
| `open-attributions` | — | All pages (footer) |
| `close-toast` | — | All pages (toast) |
| `close-modal` | `data-modal` (optional ID) | Edit pages |
| `open-link` | `data-url` | Multiple |
| `copy-to-clipboard` | `data-text` | Transportation module |
| `calendar-previous` | — | View page |
| `calendar-next` | — | View page |
| `close-modal-calendar` | — | View page |
| `open-filter-drawer` | — | Destination page |
| `open-sort-drawer` | — | Destination page |
| `close-drawer` | — | Destination page |
| `add-destination` | — | Destination page |
| `open-travelers-info` | — | Edit trip |
| `request-pin-expenses` | — | Edit trip |
| `delete-trip` | — | Edit trip |
| `delete-destination` | — | Edit destination |
| `delete-listing` | — | Edit listing |
| `open-inner-expense` | `data-category` | Edit trip |
| `edit-destination` | `data-index` | Destination page content |
| `open-description-modal` | `data-category`, `data-index` | Edit destination |
| `move-destination` | `data-index`, `data-category` | Edit destination |
| `load-and-open-destination` | `data-type` | View page destinations |
| `open-accommodation-images` | `data-index` | Edit trip (new trip) |
| `open-inner-itinerary` | `data-index` | Edit trip (new trip) |
| `display-inner-itinerary-message` | `data-index` | View page itinerary |
| `open-inner-accommodation-image` | `data-index` | Edit trip accommodation |
| `delete-inner-expense` | `data-category`, `data-type`, `data-index` | Edit trip expenses |
| `open-inner-itinerary-detail` | `data-j`, `data-k`, `data-turno` | Edit trip inner itinerary |
| `open-inner-itinerary-item` | `data-index` | Edit trip inner itinerary content |
| `open-inner-itinerary-swap` | — | Edit trip inner itinerary content |
| `delete-inner-itinerary` | `data-j`, `data-k`, `data-turno` | Edit trip inner itinerary content |

---

## 🗺️ Prompt Plan (7 prompts)

| # | What It Does | Risk | Files Touched |
|---|-------------|------|--------------|
| **P0** | Create shared delegated handler framework | Low | 1 new file |
| **P1** | Fix static HTML: `destination.html` | Low | 1 HTML + 1 JS |
| **P2** | Fix static HTML: `view.html` | Low | 1 HTML + 1 JS |
| **P3** | Fix static HTML: `edit/trip.html` | Medium | 1 HTML + 1 JS |
| **P4** | Fix static HTML: `edit/destination.html`, `edit/listing.html`, `expenses.html`, `itinerary.html` | Low | 4 HTML |
| **P5** | Fix JS-generated: view page + destination page | Medium | 5 JS files |
| **P6** | Fix JS-generated: edit-trip + edit-destination | High | 6 JS files |
| **P7** | Validation — static analysis, build, test | Low | — |

---

## Prompt P0 — Create Shared Delegated Handler Framework

```
Create a shared delegated click handler module that ALL pages can use for
data-action-based event delegation. This module will replace the inline
onclick handlers across the entire project.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

BACKGROUND:
The index page (pages/home/support/event-listeners.js) already has a
document-level delegated click handler for data-action elements.
We need to extract the general mechanism into a shared module so every
page can register its own action handlers without duplicating the
delegation logic.

STEP 1: Create a new file: ui/actions.js

This module provides:
  a. A function to register the global delegated click listener
     (called once, at app init).
  b. A function for each page to register its action handlers.
  c. Automatic stopPropagation support via data-stop-propagation attribute.

Content:

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
        const stopPropTarget = event.target.closest("[data-stop-propagation]");
        if (stopPropTarget) {
            event.stopPropagation();
            // Don't return — the element might also have a data-action
        }

        const target = event.target.closest("[data-action]");
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
```

STEP 2: In app/main.js, AFTER the imports, call initActions():

    import { initActions } from '../ui/actions.js';

    // In the main() or initializeApp() function, before any page loads:
    initActions();

STEP 3: The existing index page handler in pages/home/support/event-listeners.js
ALREADY implements this pattern. AFTER P0, update it to use the shared module:

    import { registerActions } from '../../../ui/actions.js';

    export function loadListenersIndex() {
        // Static elements → direct addEventListener (unchanged)
        getID("login-button").addEventListener("click", ...);

        // Dynamic/data-action elements → use registerActions
        registerActions({
            "sign-out": () => signOut(),
            "backup-account": () => backupOnClickAction(),
            "restore-account": () => restoreOnClickAction(),
            "open-delete-modal": () => openModal(),
            "close-delete-modal": () => closeModal(),
            "close-trip-dialog": () => closeTripDialog(),
            "close-dest-dialog": () => closeDestDialog(),
            "close-list-dialog": () => closeListDialog(),
            "open-attributions": () => openAttributions(),
            "close-toast": () => closeToast(),
            "open-trip-dialog": (target) => {
                const tripId = target.getAttribute("data-trip-id");
                if (tripId) openTripDialog(tripId);
            },
            "open-dest-dialog": (target) => {
                const destId = target.getAttribute("data-dest-id");
                if (destId) openDestDialog(destId);
            },
            "open-list-dialog": (target) => {
                const listId = target.getAttribute("data-list-id");
                if (listId) openListDialog(listId);
            },
        });

        // REMOVE the old document.addEventListener("click", ...) block
    }

STEP 4: Verify the build still passes:
    npm run build
    npm run check

IMPORTANT:
- The registerActions() function MERGES actions. Each page adds its own.
  If two pages register the same action name, the last one wins (page load order).
  This is intentional — the current page's handlers take precedence.
- Do NOT add page-specific actions to the shared module. Each page registers
  only its own actions.
- Keep static addEventListener calls for elements with IDs that exist at
  page load. Only use data-action for dynamic elements and shared widgets.
```

**Validation:** `npm run build && npm run check` passes. Index page still works with the refactored handler.

---

## Prompt P1 — Fix Static HTML: `destination.html`

```
Convert all inline onclick handlers in destination.html to data-action attributes.
Register the corresponding handlers in the destination page's event-listeners.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public

STEP 1: In destination.html, change ALL onclick attributes to data-action:

LINE 22:
  OLD: <button class="filter-sort" id="filter" onclick="_openFilterDrawer()">
  NEW: <button class="filter-sort" id="filter" data-action="open-filter-drawer">

LINE 26:
  OLD: <button class="filter-sort" id="sort" onclick="_openSortDrawer()">
  NEW: <button class="filter-sort" id="sort" data-action="open-sort-drawer">

LINE 35:
  OLD: <button class="edit-btn" id="add-button" onclick="_add()">
  NEW: <button class="edit-btn" id="add-button" data-action="add-destination">

LINE 47:
  OLD: onclick="_openAttributions()"
  NEW: data-action="open-attributions"

LINE 54 (drawer overlay):
  OLD: <div class="drawer-overlay" id="overlay" onclick="_closeDrawer()">
  NEW: <div class="drawer-overlay" id="overlay" data-action="close-drawer">

LINE 55 (drawer inner):
  OLD: <div class="drawer" id="drawer" onclick="event.stopPropagation()">
  NEW: <div class="drawer" id="drawer" data-stop-propagation>

LINE 58:
  OLD: <button class="close-btn" onclick="_closeDrawer()">✕</button>
  NEW: <button class="close-btn" data-action="close-drawer">✕</button>

LINE 68:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

STEP 2: Find all files that DEFINE the functions called by these onclicks.
Search the JS codebase for:
  - function _openFilterDrawer  (or openFilterDrawer without underscore)
  - function _openSortDrawer    (or openSortDrawer)
  - function _add               (or addDestination)
  - function _openAttributions  (or openAttributions)
  - function _closeDrawer       (or closeDrawer)
  - function _closeToast        (or closeToast)

For each function found:
  a. Note its file location and ensure it's properly exported.
  b. If it's NOT exported yet, add the export keyword.

STEP 3: Create a event-listeners file for the destination page if one doesn't exist.
If pages/destination/support/event-listeners.js does NOT exist, create it.

STEP 4: In the destination page's event-listeners (or the destination.js directly),
register the action handlers:

    import { registerActions } from '../../../ui/actions.js';
    import { openFilterDrawer, openSortDrawer } from './sort-and-filter/support/drawer.js';  // or correct path
    import { addDestination } from '...';  // find the correct import
    import { openAttributions } from '../../../utils/attributions.js';
    import { closeToast } from '../../../utils/messages.js';

    export function loadDestinationListeners() {
        registerActions({
            "open-filter-drawer": () => openFilterDrawer(),
            "open-sort-drawer": () => openSortDrawer(),
            "add-destination": () => addDestination(),
            "open-attributions": () => openAttributions(),
            "close-drawer": () => closeDrawer(),
            "close-toast": () => closeToast(),
        });
    }

STEP 5: Ensure the loadDestinationListeners() is called from the destination
page's load function (destination.js's loadDestinationPage).

STEP 6: In the destination-entry.js, add the import for the event-listeners
(if a new file was created):

    import './support/event-listeners.js';  // if new file

STEP 7: Verify:
    npm run build
    npm run check
    Test destination.html in browser — filter drawer, sort drawer, add button,
    attributions, and toast close must all work.

IMPORTANT:
- Search for the ACTUAL function names — they may have had the `_` prefix
  stripped during P17 renaming. Use grep to find them.
- If a function cannot be found (dead onclick), remove the onclick and
  flag it in a comment.
- The drawer's event.stopPropagation() is handled by data-stop-propagation
  in the shared actions.js module (see P0).
```

**Validation:** All destination.html onclick handlers work via data-action. Zero onclick attributes remain.

---

## Prompt P2 — Fix Static HTML: `view.html`

```
Convert all inline onclick handlers in view.html to data-action attributes.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public

STEP 1: In view.html, change ALL onclick attributes:

LINE 247:
  OLD: <button class="calendar-navigation" id="previous" onclick="_calendarPrevious()">
  NEW: <button class="calendar-navigation" id="previous" data-action="calendar-previous">

LINE 249:
  OLD: <button class="calendar-navigation" id="next" onclick="_calendarNext()">
  NEW: <button class="calendar-navigation" id="next" data-action="calendar-next">

LINE 257:
  OLD: <div id="programacao-fechar" onclick="_closeModalCalendar()">
  NEW: <div id="programacao-fechar" data-action="close-modal-calendar">

LINE 363:
  OLD: onclick="_openAttributions()"
  NEW: data-action="open-attributions"

LINE 377:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

STEP 2: Find the actual function names for calendarPrevious, calendarNext,
closeModalCalendar. Search for them in the JS codebase.

The calendar functions are likely in:
  - pages/trip-detail/categories/itinerary-module/calendar.js
    (look for changeCalendarMonth or similar)

STEP 3: In the view page's load function (view.js's loadViewPage or a new
event-listeners file), register the handlers:

    import { registerActions } from '../../../ui/actions.js';
    import { openAttributions } from '../../../utils/attributions.js';
    import { closeToast } from '../../../utils/messages.js';

    // Calendar navigation — import from calendar module
    import { calendarPrevious, calendarNext, closeModalCalendar }
        from './categories/itinerary-module/calendar.js';

    export function loadViewListeners() {
        registerActions({
            "calendar-previous": () => calendarPrevious(),
            "calendar-next": () => calendarNext(),
            "close-modal-calendar": () => closeModalCalendar(),
            "open-attributions": () => openAttributions(),
            "close-toast": () => closeToast(),
        });
    }

STEP 4: If the calendar functions (calendarPrevious, calendarNext, closeModalCalendar)
are NOT exported, add export to them in calendar.js.

STEP 5: Call loadViewListeners() from view.js's loadViewPage, or import it
as a side effect in view-entry.js.

STEP 6: Verify:
    npm run build
    npm run check
    Test view.html — calendar prev/next, calendar close, attributions, toast.

IMPORTANT:
- The calendar functions may have different names. Search the codebase to
  find the exact function names before registering handlers.
- Export any functions that are currently only attached to window.
```

**Validation:** All view.html onclick handlers work via data-action. Zero onclick attributes remain.

---

## Prompt P3 — Fix Static HTML: `edit/trip.html`

```
Convert all inline onclick handlers in edit/trip.html to data-action attributes.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public

STEP 1: In edit/trip.html, change ALL onclick attributes:

LINE 191:
  OLD: <button id="travelers-info" ... onclick="_openTravelersInfo()"
  NEW: <button id="travelers-info" ... data-action="open-travelers-info"

LINE 211:
  OLD: <button id="request-pin" ... onclick="_requestPinEditarGastos()"
  NEW: <button id="request-pin" ... data-action="request-pin-expenses"

LINE 217:
  OLD: <a href="#" onclick="_deleteViagem()" ...>
  NEW: <a href="#" data-action="delete-trip" ...>

LINE 449:
  OLD: onclick="_openInnerGasto('gastosPrevios')"
  NEW: data-action="open-inner-expense" data-category="gastosPrevios"

LINE 481:
  OLD: onclick="_openInnerGasto('gastosDurante')"
  NEW: data-action="open-inner-expense" data-category="gastosDurante"

LINE 543:
  OLD: <button id="transporte-adicionar" class="btn btn-theme" onclick="">
  NEW: <button id="transporte-adicionar" class="btn btn-theme">
  (remove empty onclick — this button is already handled by event-listeners.js
   via getID("transporte-adicionar").addEventListener)

LINE 721:
  OLD: onclick="_openAtribuicoes()"
  NEW: data-action="open-attributions"

LINE 736:
  OLD: <button id="re-editar" ... onclick="_closeModal('delete-modal')">
  NEW: <button id="re-editar" ... data-action="close-modal" data-modal="delete-modal">

LINE 767:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

STEP 2: Find the actual function names. Search for:
  - _openTravelersInfo / openTravelersInfo
  - _requestPinEditarGastos / requestPinExpenses
  - _deleteViagem / deleteTrip
  - _openInnerGasto / openInnerExpense
  - _openAtribuicoes / openAttributions

They are likely in:
  - pages/edit-trip/categories/travelers.js
  - pages/edit-trip/categories/basic-data/protected-data.js
  - pages/edit-trip/categories/expenses.js
  - pages/edit-trip/edit-trip.js

STEP 3: In the edit-trip's existing event-listeners file
(pages/edit-trip/support/event-listeners.js), ADD the data-action
registrations alongside the existing addEventListener calls.

At the TOP of the loadEventListeners function (or in a new exported function),
add:

    import { registerActions } from '../../../ui/actions.js';
    import { openAttributions } from '../../../utils/attributions.js';
    import { closeToast } from '../../../utils/messages.js';

    registerActions({
        "open-travelers-info": () => openTravelersInfo(),
        "request-pin-expenses": () => requestPinExpenses(),
        "delete-trip": () => deleteTrip(),
        "open-inner-expense": (target) => {
            const category = target.getAttribute("data-category");
            if (category) openInnerExpense(category);
        },
        "open-attributions": () => openAttributions(),
        "close-modal": (target) => {
            const modalId = target.getAttribute("data-modal");
            closeModal(modalId || "delete-modal");
        },
        "close-toast": () => closeToast(),
    });

    // NOTE: The addEventListener calls for save-btn, re-editar, visualizar,
    // cancel-btn, transporte-adicionar, hospedagens-adicionar, etc.
    // REMAIN as direct addEventListener because they reference elements
    // with stable IDs that exist at page load.

STEP 4: Ensure the functions (openTravelersInfo, requestPinExpenses, deleteTrip,
openInnerExpense, closeModal) are EXPORTED from their source files.

STEP 5: Verify:
    npm run build
    npm run check
    Test edit/trip.html — travelers info, pin expenses, delete trip,
    inner expense tabs, attributions, close modal, toast.

IMPORTANT:
- The edit-trip page already has a event-listeners.js with direct
  addEventListener calls for buttons with IDs. Keep those as-is.
- Only ADD the data-action registrations for the onclick conversions.
- The "re-editar" button with closeModal — NOTE: event-listeners.js already
  has: getID("re-editar").addEventListener("click", () => reEdit(...)).
  Check if the onclick="_closeModal" is a DIFFERENT "re-editar" button
  (the one in the delete modal) vs the one event-listeners already handles.
  If they're different elements, the data-action approach will work.
  If they share the same ID, there's a bug — fix by giving the modal one
  a different ID.
```

**Validation:** All edit/trip.html onclick handlers work via data-action or existing addEventListener. Zero onclick attributes remain.

---

## Prompt P4 — Fix Remaining Static HTML Pages

```
Convert the remaining inline onclick handlers in these 4 HTML files:

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public

=== edit/destination.html ===

LINE 159:
  OLD: <a href="#" onclick="_deleteDestino()" ...>
  NEW: <a href="#" data-action="delete-destination" ...>

LINE 411:
  OLD: onclick="_openAtribuicoes()"
  NEW: data-action="open-attributions"

LINE 426:
  OLD: <button id="re-editar" ... onclick="_closeModal('delete-modal')">
  NEW: <button id="re-editar" ... data-action="close-modal" data-modal="delete-modal">

LINE 457:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

=== edit/listing.html ===

LINE 111:
  OLD: <a href="#" onclick="_deleteListagem()" ...>
  NEW: <a href="#" data-action="delete-listing" ...>

LINE 362:
  OLD: onclick="_openAtribuicoes()"
  NEW: data-action="open-attributions"

LINE 377:
  OLD: <button id="re-editar" ... onclick="_closeModal('delete-modal')">
  NEW: <button id="re-editar" ... data-action="close-modal" data-modal="delete-modal">

LINE 408:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

=== expenses.html ===

LINE 103:
  OLD: <span class="attributions" onclick="_openAttributions()">
  NEW: <span class="attributions" data-action="open-attributions">

=== itinerary.html ===

LINE 56:
  OLD: <span class="attributions" onclick="_openAttributions()">
  NEW: <span class="attributions" data-action="open-attributions">

LINE 68:
  OLD: <span class="toast-close" onclick="_closeToast()">
  NEW: <span class="toast-close" data-action="close-toast">

STEP 2: For each page, register the actions in its event-listeners or load function.

For edit-destination (in pages/edit-destination/destination-entry.js or a new
event-listeners file):

    import { registerActions } from '../../ui/actions.js';
    import { openAttributions } from '../../utils/attributions.js';
    import { closeToast } from '../../utils/messages.js';
    import { deleteDestination, closeModal } from './edit-destination.js';

    registerActions({
        "delete-destination": () => deleteDestination(),
        "open-attributions": () => openAttributions(),
        "close-modal": (target) => {
            const modalId = target.getAttribute("data-modal") || "delete-modal";
            closeModal(modalId);
        },
        "close-toast": () => closeToast(),
    });

For edit-listing (in pages/edit-listing/listing-entry.js or new event-listeners):

    import { registerActions } from '../../ui/actions.js';
    import { openAttributions } from '../../utils/attributions.js';
    import { closeToast } from '../../utils/messages.js';
    import { deleteListing, closeModal } from './edit-listing.js';

    registerActions({
        "delete-listing": () => deleteListing(),
        "open-attributions": () => openAttributions(),
        "close-modal": (target) => {
            const modalId = target.getAttribute("data-modal") || "delete-modal";
            closeModal(modalId);
        },
        "close-toast": () => closeToast(),
    });

For expenses (expenses-entry.js already loads several side-effect imports.
Add the registration there or in expenses.js):

    import { registerActions } from '../../ui/actions.js';
    import { openAttributions } from '../../utils/attributions.js';

    registerActions({
        "open-attributions": () => openAttributions(),
    });

For itinerary (in itinerary-entry.js or itinerary.js):

    import { registerActions } from '../../ui/actions.js';
    import { openAttributions } from '../../utils/attributions.js';
    import { closeToast } from '../../utils/messages.js';

    registerActions({
        "open-attributions": () => openAttributions(),
        "close-toast": () => closeToast(),
    });

STEP 3: Ensure all called functions are exported from their source files.

STEP 4: Verify:
    npm run build
    npm run check
    Test each page — attributions, toast close, delete buttons, close modal.

IMPORTANT:
- The "open-attributions" and "close-toast" actions should be registered by
  EVERY page that uses them. The registerActions() function merges, so the
  last page to load wins. This is fine since only one page is loaded at a time.
- For the re-editar button: check if the same ID is used in both the save-success
  modal and the delete modal. If so, the delete modal's button may need a
  different ID.
```

**Validation:** All 4 HTML files have zero onclick attributes. All actions work.

---

## Prompt P5 — Fix JS-Generated Onclicks: View & Destination Pages

```
Convert JS-generated onclick handlers (in template literals) to data-action
attributes for the view page and destination page modules.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

BACKGROUND:
These files build HTML strings in JavaScript and inject them via innerHTML.
The onclick handlers in these strings need to become data-action attributes.

=== FILE 1: pages/trip-detail/categories/destination.js (line ~158) ===

FIND the template literal containing:
    onclick="loadAndOpenDestino('${type}')"

CHANGE to:
    data-action="load-and-open-destination" data-type="${type}"

Then REGISTER the handler (in view.js or a view event-listeners):

    registerActions({
        "load-and-open-destination": (target) => {
            const type = target.getAttribute("data-type");
            if (type) loadAndOpenDestino(type);
        },
    });

=== FILE 2: pages/trip-detail/categories/transportation-module.js (line ~145) ===

FIND:
    onclick="copyToClipboard('${reserva}')"

CHANGE to:
    data-action="copy-to-clipboard" data-text="${reserva}"

REGISTER:
    registerActions({
        "copy-to-clipboard": (target) => {
            const text = target.getAttribute("data-text");
            if (text) copyToClipboard(text);
        },
    });

=== FILE 3: pages/trip-detail/categories/accommodation-module.js (line ~94) ===

FIND:
    onclick="window.open('${hospedagem.link}', '_blank')"

CHANGE to:
    data-action="open-link" data-url="${hospedagem.link}"

REGISTER:
    registerActions({
        "open-link": (target) => {
            const url = target.getAttribute("data-url");
            if (url) window.open(url, "_blank");
        },
    });

=== FILE 4: pages/trip-detail/categories/itinerary-module/inner-itinerary.js (line ~217) ===

FIND:
    onclick="displayInnerItineraryMessage(${CURRENT_INNER_ITINERARY.length - 1})"

CHANGE to:
    data-action="display-inner-itinerary-message" data-index="${CURRENT_INNER_ITINERARY.length - 1}"

REGISTER:
    registerActions({
        "display-inner-itinerary-message": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) displayInnerItineraryMessage(index);
        },
    });

=== FILE 5: pages/destination/categories.js (line ~91) ===

FIND:
    onclick="openLinkInNewTab('${item[tipo]}')"

CHANGE to:
    data-action="open-link" data-url="${item[tipo]}"

This uses the SAME "open-link" action already registered. No new registration needed.

=== FILE 6: pages/destination/support/content.js (line ~11) ===

FIND:
    onclick="${closeAction}(${j})"

This is tricky — closeAction is a variable. Search for how closeAction is set.
It's likely either a string like "closeAccordion" or a function reference.

REPLACE with:
    data-action="close-accordion" data-index="${j}"

REGISTER:
    registerActions({
        "close-accordion": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) closeAccordion(index);
        },
    });

=== FILE 7: pages/destination/support/content.js (line ~52) ===

FIND:
    onclick="edit(${j})"

CHANGE to:
    data-action="edit-destination" data-index="${j}"

REGISTER:
    registerActions({
        "edit-destination": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) editDestination(index);
        },
    });

STEP 1: For EACH file above:
  a. Locate the exact line with the onclick template literal.
  b. Replace onclick="..." with the corresponding data-action + data-* attributes.
  c. Make sure the function being called is properly exported.
  d. Register the handler using registerActions().

STEP 2: The "open-link" action is generic and used by multiple files.
Register it ONCE — ideally in a shared location. If P0's ui/actions.js
is the right place, add it there as a built-in handler.

Alternatively, register it in the entry point of every page that needs it.

STEP 3: Add the action registrations to the correct page's load function
or event-listeners file:

  For view page files (FILE 1-4):
    Add to pages/trip-detail/view.js (in loadViewPage) or a new
    pages/trip-detail/support/event-listeners.js

  For destination page files (FILE 5-7):
    Add to pages/destination/destination.js (in loadDestinationPage)

STEP 4: Verify:
    npm run build
    npm run check
    Test view.html — destinations click-to-open, copy-to-clipboard,
    accommodation link, inner itinerary message.
    Test destination.html — link opening, accordion close, edit button.

IMPORTANT:
- Be VERY careful with template literal syntax. The onclick string is inside
  backtick template literals. Make sure the quoting is correct.
- For closeAction in content.js: find where it's defined and what values
  it can have. It may be a variable function name.
- Functions like copyToClipboard, loadAndOpenDestino, displayInnerItineraryMessage
  must be EXPORTED from their source files if not already.
- parseInt the data-index values since data-* attributes are always strings.
- The "open-link" action replaces BOTH onclick="window.open(...)" AND
  onclick="openLinkInNewTab(...)" — unify them under one action.
```

**Validation:** All JS-generated onclick handlers in view/destination modules work via data-action.

---

## Prompt P6 — Fix JS-Generated Onclicks: Edit Pages

```
Convert JS-generated onclick handlers in the edit-trip and edit-destination
page modules.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

=== FILE 1: pages/edit-destination/new-destination.js ===

This file has TWO repeated patterns × 5 categories (restaurantes, lanches,
saidas, turismo, lojas):

PATTERN A (lines 56, 194, 329, 463, 598):
  OLD: onclick="openDescriptionModal('${categoria}', ${j})"
  NEW: data-action="open-description-modal" data-category="${categoria}" data-index="${j}"

PATTERN B (lines 114, 253, 387, 521, 657):
  OLD: onclick="openMoveDestinationModal(${j}, '${categoria}')"
  NEW: data-action="move-destination" data-index="${j}" data-category="${categoria}"

REGISTER in edit-destination's entry or event-listeners:
    registerActions({
        "open-description-modal": (target) => {
            const category = target.getAttribute("data-category");
            const index = parseInt(target.getAttribute("data-index"));
            if (category && !isNaN(index)) openDescriptionModal(category, index);
        },
        "move-destination": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            const category = target.getAttribute("data-category");
            if (!isNaN(index) && category) openMoveDestinationModal(index, category);
        },
    });

=== FILE 2: pages/edit-trip/new-trip.js ===

LINE 254:
  OLD: onclick="openAccommodationImages(${j})"
  NEW: data-action="open-accommodation-images" data-index="${j}"

LINE 375:
  OLD: onclick="openInnerItinerary(${j})"
  NEW: data-action="open-inner-itinerary" data-index="${j}"

REGISTER:
    registerActions({
        "open-accommodation-images": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) openAccommodationImages(index);
        },
        "open-inner-itinerary": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) openInnerItinerary(index);
        },
    });

=== FILE 3: pages/edit-trip/categories/accommodation.js (line ~157) ===

  OLD: onclick="openInnerAccommodationImage(${k})"
  NEW: data-action="open-inner-accommodation-image" data-index="${k}"

REGISTER:
    registerActions({
        "open-inner-accommodation-image": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) openInnerAccommodationImage(index);
        },
    });

=== FILE 4: pages/edit-trip/categories/expenses.js (line ~246) ===

  OLD: onclick="deleteInnerGasto('${categoria}', '${tipo}', ${index})"
  NEW: data-action="delete-inner-expense" data-category="${categoria}" data-type="${tipo}" data-index="${index}"

REGISTER:
    registerActions({
        "delete-inner-expense": (target) => {
            const category = target.getAttribute("data-category");
            const type = target.getAttribute("data-type");
            const index = parseInt(target.getAttribute("data-index"));
            if (category && type && !isNaN(index)) deleteInnerGasto(category, type, index);
        },
    });

=== FILE 5: pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.js (line ~33) ===

  OLD: onclick="openInnerItinerary(${j}, ${k}, '${turno}')"
  NEW: data-action="open-inner-itinerary-detail" data-j="${j}" data-k="${k}" data-turno="${turno}"

REGISTER:
    registerActions({
        "open-inner-itinerary-detail": (target) => {
            const j = parseInt(target.getAttribute("data-j"));
            const k = parseInt(target.getAttribute("data-k"));
            const turno = target.getAttribute("data-turno");
            if (!isNaN(j) && !isNaN(k) && turno) openInnerItinerary(j, k, turno);
        },
    });

=== FILE 6: pages/edit-trip/categories/itinerary-module/inner-itinerary/content.js ===

LINE 7:
  OLD: onclick="openInnerItineraryItem(${j})"
  NEW: data-action="open-inner-itinerary-item" data-index="${j}"

LINE 46:
  OLD: onclick="openInnerItinerarySwap()"
  NEW: data-action="open-inner-itinerary-swap"

LINE 53:
  OLD: onclick="deleteInnerProgramacao(${j}, ${k}, '${turno}')"
  NEW: data-action="delete-inner-itinerary" data-j="${j}" data-k="${k}" data-turno="${turno}"

REGISTER:
    registerActions({
        "open-inner-itinerary-item": (target) => {
            const index = parseInt(target.getAttribute("data-index"));
            if (!isNaN(index)) openInnerItineraryItem(index);
        },
        "open-inner-itinerary-swap": () => openInnerItinerarySwap(),
        "delete-inner-itinerary": (target) => {
            const j = parseInt(target.getAttribute("data-j"));
            const k = parseInt(target.getAttribute("data-k"));
            const turno = target.getAttribute("data-turno");
            if (!isNaN(j) && !isNaN(k) && turno) deleteInnerProgramacao(j, k, turno);
        },
    });

=== FILE 7: utils/dom.js (line ~702) ===

  OLD: onclick="window.open('${midia}', '_blank');"
  NEW: data-action="open-link" data-url="${midia}"

This uses the generic "open-link" action. Ensure it's registered.

STEP 1: For EACH file, locate the exact template literal lines and replace
onclick with data-action + data-* attributes.

STEP 2: Add all action registrations to the correct page:

  For edit-destination (FILE 1):
    Add to pages/edit-destination/destination-entry.js or a new
    pages/edit-destination/support/event-listeners.js

  For edit-trip (FILES 2-6):
    Add to pages/edit-trip/support/event-listeners.js (in the existing
    loadEventListeners function)

  For utils/dom.js (FILE 7):
    The "open-link" action should be registered globally (in ui/actions.js
    or app/main.js) since it's used by multiple pages.

STEP 3: Verify all called functions are properly EXPORTED:
  - openDescriptionModal (edit-destination)
  - openMoveDestinationModal (edit-destination)
  - openAccommodationImages (edit-trip/new-trip.js)
  - openInnerItinerary (edit-trip/new-trip.js)
  - openInnerAccommodationImage (edit-trip/categories/accommodation.js)
  - deleteInnerGasto (edit-trip/categories/expenses.js)
  - openInnerItinerary (edit-trip/categories/itinerary-module/inner-itinerary/)
  - openInnerItineraryItem (edit-trip/categories/itinerary-module/inner-itinerary/content.js)
  - openInnerItinerarySwap (same)
  - deleteInnerProgramacao (same)

STEP 4: Verify:
    npm run build
    npm run check
    Test edit/trip.html — accommodation images, inner itinerary, inner accommodation
    image, inner expense delete, inner itinerary item/swap/delete.
    Test edit/destination.html — description modal, move destination modal.

IMPORTANT:
- new-destination.js has the same pattern repeated 5 times (one for each category:
  restaurantes, lanches, saidas, turismo, lojas). Change ALL of them.
- The action names "open-inner-itinerary" conflict between new-trip.js (1 param)
  and inner-itinerary.js (3 params). Use "open-inner-itinerary" for the simple
  one and "open-inner-itinerary-detail" for the 3-param one.
- Be careful with parseInt for numeric data-* attributes.
```

**Validation:** All JS-generated onclick handlers in edit pages work via data-action.

---

## Prompt P7 — Final Validation & Cleanup

```
Perform final validation and cleanup after all onclick conversions.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase

STEP 1: Search for ANY remaining onclick attributes in HTML files:
    grep -r "onclick=" public/*.html public/edit/*.html public/shared/*.html

    Expected: ZERO results (except possibly vendor/shared files).

STEP 2: Search for ANY remaining onclick in JS template literals:
    grep -r 'onclick=' public/assets/js/

    Expected: The ONLY remaining onclick should be:
    - In comments or documentation
    - event.stopPropagation() calls (which should now use data-stop-propagation)
    - Any that you intentionally skipped and documented

    Flag any unexpected matches.

STEP 3: Run static analysis:
    npm run check

    Expected: No new missing imports. The functions previously called via
    onclick should now show as properly imported by the files that call
    registerActions().

STEP 4: Build:
    npm run build

    Expected: Build succeeds without errors.

STEP 5: For EACH page, test in browser:

  ☐ index.html — all data-action handlers work (sign-out, backup, restore,
     trip/dest/listing dialogs, attributions, toast)
  ☐ view.html — calendar prev/next/close, attributions, toast,
     copy-to-clipboard, open-link, load-and-open-destination,
     display-inner-itinerary-message
  ☐ destination.html — filter drawer, sort drawer, add destination,
     close drawer, attributions, toast, edit destination, close accordion,
     open-link
  ☐ expenses.html — attributions
  ☐ itinerary.html — attributions, toast
  ☐ edit/trip.html — travelers info, pin expenses, delete trip,
     inner expense tabs, attributions, close modal, toast,
     accommodation images, inner itinerary, inner accommodation image,
     delete inner expense, inner itinerary item/swap/delete
  ☐ edit/destination.html — delete destination, attributions,
     close modal, toast, description modal, move destination
  ☐ edit/listing.html — delete listing, attributions, close modal, toast

STEP 6: Check browser console for each page:
    - Zero "X is not defined" errors
    - Zero "X is not a function" errors
    - Zero uncaught ReferenceErrors

STEP 7: If the old functions still have `window.xxx = xxx` assignments,
remove them NOW since nothing calls them via window anymore.

STEP 8: Update the check-imports.js KNOWN_MISSING_IMPORTS list:
    - Remove any functions that were previously "missing" because they
      were only called via onclick (and therefore not import-detectable).
    - Now that they're called via registerActions callbacks, the imports
      should be visible to the static analyzer.

STEP 9: Update the cleanup-tracking.md with the changes made.

STEP 10: Update this plan's status to "✅ Complete".

IMPORTANT:
- If any onclick was intentionally left (e.g., third-party widget
  requirements), document it with a comment explaining why.
- The data-action pattern should now be the STANDARD for ALL future
  development. Add a note to README.md about this convention.
```

**Validation:** Zero onclick attributes in project source. All 8 pages functional. Console clean.

---

## 📊 Progress Tracker

| # | Prompt | Status |
|---|--------|--------|
| P0 | Create shared delegated handler framework | 📋 Ready |
| P1 | Fix static HTML: `destination.html` | 📋 Ready |
| P2 | Fix static HTML: `view.html` | 📋 Ready |
| P3 | Fix static HTML: `edit/trip.html` | 📋 Ready |
| P4 | Fix remaining static HTML pages | 📋 Ready |
| P5 | Fix JS-generated: view & destination pages | 📋 Ready |
| P6 | Fix JS-generated: edit pages | 📋 Ready |
| P7 | Final validation & cleanup | 📋 Ready |

---

## 🎯 Target Architecture After Fix

```
All pages:
  └── ui/actions.js  ←  shared delegated click handler
       ├── initActions()           ← called ONCE at app init
       └── registerActions({...})  ← each page registers its handlers

Each HTML file:
  - Zero onclick attributes
  - Static elements → data-action="name" + data-* params
  - JS-generated elements → same data-action pattern in template literals

Each page's event-listeners:
  - Static ID elements → direct addEventListener("click", ...)
  - Dynamic/data-action elements → registerActions({...})

Import chain (example: view page):
  view-entry.js
    ├── import { main } from '../../app/main.js'
    │     └── main.js imports { initActions } from ui/actions.js
    ├── import './support/event-listeners.js'
    │     └── registers view-specific actions via registerActions()
    └── main({ view: loadViewPage })
```

---

## ⚠️ Critical Notes

1. **The `open-link` action replaces ALL `window.open()` onclicks.** Register it once globally in `ui/actions.js` or `app/main.js`.
2. **`event.stopPropagation()` becomes `data-stop-propagation`** — the shared handler automatically stops propagation on elements with this attribute, then continues to check for `data-action`.
3. **Parameter types matter.** `data-*` attributes are always strings. Always `parseInt()` numeric values and check for `!isNaN()`.
4. **Action name conflicts.** If two files generate the same action name with different parameter signatures, use distinct names (e.g., `open-inner-itinerary` vs `open-inner-itinerary-detail`).
5. **Test after EVERY prompt.** Each prompt has a validation step. Run `npm run build && npm run check` after each.
6. **Commit after each prompt.** `git add -A && git commit -m "Px: onclick cleanup - [page name]"`
7. **Do NOT remove the existing `addEventListener` calls** for elements with stable IDs. Only convert the inline `onclick` attributes.
8. **The `registerActions` function MERGES** — each page adds its handlers on top. Two pages can register the same action (the last one wins), which is fine since only one page is active at a time.
9. **Export every function** that was previously called via onclick. They need proper ES module exports now.
