---
name: typescript-conventions
description: 'Use when you need to write or modify TypeScript code, understand the module organization, page routing, service layer, vendor globals, or coding conventions. Always consult this skill before adding new files or refactoring existing TypeScript.'
applyTo: 'public/assets/ts/**; public/**/*.html'
---

# TypeScript Conventions

TripViewer uses TypeScript incrementally (no full rewrite). Code is organized into domain modules with clear separation of concerns. No framework — vanilla TS with ES modules.

---

## Module Organization

```
public/assets/ts/
├── app/                  ← Application entry & config
│   ├── main.ts           ← main() — universal page entry point
│   └── config.ts         ← Config loading, language, versions
├── data/                 ← Data access layer
│   ├── firebase/
│   │   ├── database.ts   ← Firestore CRUD (get, set, update, delete, batch)
│   │   ├── auth.ts       ← Firebase Auth helpers
│   │   ├── storage.ts    ← Firebase Storage (file uploads)
│   │   └── counter.ts    ← Read/write operation counters
│   ├── services/         ← Domain service layer
│   │   ├── trip.service.ts
│   │   ├── expense.service.ts
│   │   ├── destination.service.ts
│   │   └── auth.service.ts
│   └── state.ts          ← Global state (error flags, doc IDs)
├── models/               ← TypeScript interfaces
│   ├── trip.model.ts
│   ├── expense.model.ts
│   ├── itinerary.model.ts
│   ├── destination.model.ts
│   ├── traveler.model.ts
│   └── new-schema.ts     ← Post-migration English field names
├── pages/                ← Page-specific logic (one folder per HTML page)
│   ├── home/             ← index.html
│   ├── trip-detail/      ← view.html
│   ├── destination/      ← destination.html
│   ├── expenses/         ← expenses.html
│   ├── itinerary/        ← itinerary.html
│   ├── edit-trip/        ← edit/trip.html
│   ├── edit-destination/ ← edit/destination.html
│   └── edit-listing/     ← edit/listing.html
├── ui/                   ← Reusable UI components
│   ├── accordion.ts
│   ├── edit-tabs.ts
│   ├── color-picker-hex.ts
│   ├── sortable.ts
│   ├── embed.ts
│   ├── dynamic-select.ts
│   ├── custom-select.ts
│   ├── date-range-picker.ts
│   ├── fields.ts
│   ├── actions.ts
│   └── bimap.ts
├── utils/                ← Pure utility functions
│   ├── dom.ts            ← select(), on(), getID(), getURLParam(), cloneObject()
│   ├── dates.ts          ← getTimestamp(), date formatting
│   ├── messages.ts       ← displayError(), displayPrompt(), openToast(), closeMessage()
│   ├── loading.ts        ← startLoadingScreen(), stopLoadingScreen()
│   ├── pin.ts            ← PIN hashing/validation
│   ├── set.ts            ← Set operations
│   ├── diff.ts           ← Object diffing
│   ├── devices.ts        ← Device detection
│   ├── attributions.ts   ← Data attribution
│   └── dev.ts            ← window.dev proxy for browser console
├── theme/                ← Theme & color management
│   ├── colors.ts
│   ├── theme.ts
│   ├── visibility.ts
│   ├── icons.ts
│   ├── animations.ts
│   └── stylesheets.ts
├── i18n/                 ← Internationalization
│   └── translation.ts    ← translate(), translatePage(), language switching
├── backup/               ← Data export/import
│   ├── backup.ts
│   ├── restore.ts
│   ├── export-documents.ts
│   ├── import-documents.ts
│   └── normalize.ts
└── vendor.d.ts           ← Type declarations for global vendor scripts
```

---

## Page Routing

Each HTML page uses the same entry pattern:

```typescript
// In each page's *-entry.js (compiled from .ts):
import { main } from '../../app/main.js';
import { loadView } from './view.js';

main({ view: loadView });
```

The `main()` function in `app/main.ts`:
1. Loads config (colors, currencies, icons, translations)
2. Runs `translatePage()` for static HTML
3. Initializes app (theme, actions, dev tools)
4. Routes to the correct page loader based on the HTML filename

```typescript
switch (getHTMLpage()) {
    case 'index': pageLoaders.index(); break;
    case 'view':  pageLoaders.view(); break;
    // ...
}
```

### Page loader naming convention
Each page exports a loader function named after the page:
- `index.html` → `pageLoaders.index`
- `view.html` → `pageLoaders.view`
- `edit/trip.html` → `pageLoaders.editTrip`
- `edit/destination.html` → `pageLoaders.editDestination`
- `edit/listing.html` → `pageLoaders.editListing`

---

## Service Layer Pattern

Pages should **never call `database.ts` directly**. Use the service layer:

```typescript
// ✅ Correct — use the service
import { getTrip, createTrip, updateTrip, deleteTrip } from '../data/services/trip.service.js';

// ❌ Avoid — direct database access
import { get, set, deleteDocument } from '../data/firebase/database.js';
```

Services wrap Firestore operations with domain logic (fallbacks, data normalization, auth checks).

### Available services:
| Service | Key exports |
|---|---|
| `trip.service.ts` | `getTrip()`, `getTripRaw()`, plus re-exports of `get`, `update`, `create`, `deleteDocument`, `COLLECTION`, etc. |
| `expense.service.ts` | Expense CRUD wrappers |
| `destination.service.ts` | Destination CRUD wrappers |
| `auth.service.ts` | Auth state, login/logout |

---

## Collection & Subcollection Constants

Always use the constants from `database.ts`, never hardcode strings:

```typescript
import { COLLECTION, SUBCOLLECTION } from '../data/firebase/database.js';

// ✅ Correct
get(`${COLLECTION.TRIPS}/${tripId}`);

// ❌ Avoid
get(`trips/${tripId}`);
```

Available constants:
```typescript
COLLECTION.USERS, .TRIPS, .DESTINATIONS, .LISTINGS, .EXPENSES, .PROTECTED, .CONFIG
SUBCOLLECTION.TRIP_SUMMARIES, .DESTINATION_SUMMARIES, .LISTING_SUMMARIES,
             .ACCOMMODATIONS, .TRANSPORTATION, .ITINERARY
```

---

## Vendor Globals (`vendor.d.ts`)

Third-party libraries are loaded via `<script>` tags, NOT bundled. Their types are declared in `vendor.d.ts`:

```typescript
declare var $: any;           // jQuery
declare var jQuery: any;
declare var firebase: any;    // Firebase compat SDK
declare var bootstrap: any;   // Bootstrap JS
declare var Chart: any;       // Chart.js
declare var Swiper: any;      // Swiper.js
declare var Sortable: any;    // SortableJS
declare var AOS: any;         // AOS animations
declare var GLightbox: any;   // Lightbox gallery
declare var Isotope: any;     // Isotope grid
declare var Typed: any;       // Typed.js
declare var Waypoint: any;    // Waypoints
```

**Do not `import` these** — they're globals. Access them directly: `$('.selector')`, `new Swiper(...)`, etc.

---

## DOM Utilities (`utils/dom.ts`)

Preferred over raw DOM APIs:

```typescript
import { select, selectAll, on, getID, getURLParam, cloneObject } from '../utils/dom.js';

// Instead of: document.querySelector('.foo')
const el = select('.foo');

// Instead of: element.addEventListener('click', handler)
on(element, 'click', handler);

// Instead of: document.getElementById('my-id')
const el = getID('my-id');

// Instead of: new URLSearchParams(window.location.search).get('v')
const tripId = getURLParam('v');
```

---

## Message Utilities (`utils/messages.ts`)

For user-facing notifications:

```typescript
import { displayError, displayMessage, displayPrompt, openToast, closeMessage } from '../utils/messages.js';

displayError('Something went wrong');
displayMessage('Title', 'Detailed message');
displayPrompt({ title, content, yesAction: () => { ... }, noAction: () => { ... } });
openToast('Quick notification');
```

---

## TypeScript Config

From `tsconfig.json`:
- `strict: false` — type-checking is loose, errors are non-blocking in watch mode
- `noEmit: true` — tsc only type-checks; esbuild does actual compilation
- `moduleResolution: "bundler"` — allows `.ts` extension imports
- `isolatedModules: true` — required for esbuild compatibility
- Includes: `public/assets/ts/**/*.ts`, `vendor.d.ts`, `index.ts`, `firebase-config.ts`

---

## File Naming Conventions

| Pattern | Examples |
|---|---|
| Page loaders | `view-entry.ts`, `index-entry.ts`, `trip-entry.ts` |
| Models | `trip.model.ts`, `expense.model.ts` |
| Services | `trip.service.ts`, `expense.service.ts` |
| UI components | `accordion.ts`, `custom-select.ts` |
| Utilities | `dom.ts`, `dates.ts`, `messages.ts` |

---

## Code Organization Rules

1. **New pages** go in `pages/{page-name}/` with an `*-entry.ts` and a main `*.ts` file
2. **New models** go in `models/`
3. **New UI components** go in `ui/`
4. **New utilities** go in `utils/`
5. **Data access** goes through `data/services/`, not raw `database.ts`
6. **Imports** use relative paths: `../../utils/dom.js` (note: `.js` extension, not `.ts`)
7. **No default exports** — use named exports
