# TripViewer — Migration Plan: HTML+JS → React + Vite (TypeScript)

---

## Table of Contents

1. [Project Assessment](#1-project-assessment)
2. [Target Architecture](#2-target-architecture)
3. [Migration Roadmap](#3-migration-roadmap)
4. [AI Execution Prompts](#4-ai-execution-prompts)
5. [Final Validation Checklist](#5-final-validation-checklist)

---

## 1. Project Assessment

### 1.1 Current Architecture Overview

TripViewer is a **Firebase-hosted SPA** built with vanilla HTML, CSS, and JavaScript. It uses Firebase Authentication (email/password) and Cloud Firestore as its database. There is no backend — all logic runs in the browser.

| Layer    | Technology                              | Notes                                                                                                                    |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Pages    | 8 static `.html` files                | `index`, `view`, `destination`, `expenses`, `itinerary`, `edit/trip`, `edit/destination`, `edit/listing` |
| Styling  | 12 CSS files (~200 KB, ~8,500 lines)    | One pair (light + dark) per page/feature, plus Bootstrap 5                                                               |
| Scripts  | ~90+ JS files (~140 KB, ~12,000 lines)  | Globally scoped; loaded via `<script>` tags                                                                            |
| Routing  | Manual pathname parsing                 | `_getHTMLpage()` maps URL to page function                                                                             |
| State    | Global mutable variables                | `CONFIG`, `FIRESTORE_DATA`, `USER_DATA`, `UID`, `DOCUMENT_ID`, etc.                                            |
| Database | Firebase Firestore (Compat SDK v10.4.0) | Collections:`usuarios`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido`                            |
| Auth     | Firebase Auth (Compat SDK)              | Email/password only                                                                                                      |
| i18n     | Custom JSON-based system                | 2 languages:`en`, `pt`; `data-translate` attributes on DOM elements                                                |
| Build    | None                                    | No bundler, no minification, no tree-shaking                                                                             |

### 1.2 Identified Architecture Issues

| Issue                                                                                                                                                                                                                                                      | Severity | Impact                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| **Global namespace pollution** — ~90+ files all share the global scope; functions and variables can collide                                                                                                                                         | High     | Bugs, maintenance difficulty               |
| **No module system** — Scripts loaded via `<script>` tags in a specific order; missing a script breaks the page silently                                                                                                                          | High     | Fragile dependency chain                   |
| **Mixed Portuguese/English naming** — e.g., `_loadViagemPage`, `destinos.js`, `gastos.js`, `proximasViagens`                                                                                                                                | Medium   | Onboarding friction, inconsistency         |
| **Imperative DOM manipulation** — jQuery and direct `innerHTML` used everywhere instead of declarative approach                                                                                                                                   | High     | Hard to reason about UI state              |
| **Duplicated code** — Multiple versions of `dados.js`, `destinos.js`, `categorias.js`, `embed.js`, `content.js`, `gastos.js`, `galeria.js`, `event-listeners.js`, `visibilidade.js`, `programacao.js` exist across page folders | High     | Bugs fixed in one copy survive in others   |
| **Monolithic CSS** — `viagem.css` (2,701 lines), `editar.css` (1,871 lines), `destinos.css` (1,034 lines)                                                                                                                                     | Medium   | Specificity wars, dead code                |
| **No type safety** — All JavaScript is untyped; runtime errors from misspelled properties                                                                                                                                                           | Medium   | Hard to refactor                           |
| **Embed-based subpage loading** — Uses iframe `postMessage` for communication between pages                                                                                                                                                       | Medium   | Complex, fragile communication             |
| **No centralized error handling** — Each function handles errors ad-hoc                                                                                                                                                                             | Medium   | Inconsistent UX on failure                 |
| **jQuery dependency** — Used for animations, AJAX (JSON loading), and DOM manipulation                                                                                                                                                              | Medium   | Unnecessary abstraction in modern browsers |
| **Multiple copies of vendor libs** — jQuery, Isotope, etc. are duplicated per page instead of shared                                                                                                                                                | Low      | Larger bundle per page                     |
| **No lazy loading** — All scripts load upfront regardless of whether they are needed                                                                                                                                                                | Low      | Slower initial load                        |

### 1.3 Risk Assessment

| Risk                                                                                                | Likelihood | Mitigation                                                          |
| --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| **Visual regression** — CSS migration may alter appearance                                   | High       | Keep Bootstrap 5 + extract CSS incrementally; use visual comparison |
| **Firebase SDK migration** — Moving from Compat SDK to Modular SDK                           | Medium     | Test each Firestore operation individually                          |
| **iframe/embed breakage** — Communication between pages currently uses `postMessage`       | Medium     | Replace with React Router + shared state; remove iframes            |
| **i18n breakage** — Translation keys embedded in HTML via `data-translate`                 | Low        | Reuse the same JSON packs; adapt the `translate()` function       |
| **Feature parity loss** — Missing a feature during migration                                 | Medium     | Exhaustive checklist-based validation                               |
| **Firebase Auth state mismatch** — React re-renders may conflict with Firebase auth listener | Low        | Use `onAuthStateChanged` in a React Context                       |

### 1.4 Estimated Migration Complexity

| Area                                               | Complexity | Estimated Effort             |
| -------------------------------------------------- | ---------- | ---------------------------- |
| Project scaffolding (Vite + React + TS)            | Low        | 1 session                    |
| Firebase migration (Compat → Modular SDK)         | Medium     | 1–2 sessions                |
| Shared infrastructure (config, types, i18n, hooks) | Medium     | 2 sessions                   |
| Auth + User context                                | Medium     | 1 session                    |
| Index/Home page                                    | Medium     | 2 sessions                   |
| Trip View page (`view.html`)                     | High       | 3–4 sessions                |
| Destinations page                                  | Medium     | 2 sessions                   |
| Expenses page                                      | Medium     | 2 sessions                   |
| Itinerary page                                     | Medium     | 1–2 sessions                |
| Edit pages (Trip, Destination, Listing)            | High       | 3–4 sessions                |
| CSS/styling migration                              | High       | Spread across all sessions   |
| Testing & validation                               | Medium     | 2 sessions                   |
| **Total estimated**                          |            | **18–25 AI sessions** |

---

## 2. Target Architecture

### 2.1 Proposed Folder Structure

```
src/
├── main.tsx                          # App entry point
├── App.tsx                           # Root component (auth gate + router)
├── vite-env.d.ts                     # Vite type declarations
│
├── config/
│   ├── firebase.ts                   # Firebase initialization (Modular SDK)
│   ├── constants.ts                  # App-wide constants (collections, routes, etc.)
│   └── theme.ts                      # Theme configuration (colors, breakpoints)
│
├── types/
│   ├── database.ts                   # Firestore document type interfaces
│   ├── models.ts                     # Domain model interfaces (Trip, Destination, Expense, etc.)
│   └── common.ts                     # Shared utility types
│
├── services/
│   ├── firestore/
│   │   ├── trips.ts                  # CRUD operations for `viagens` collection
│   │   ├── destinations.ts           # CRUD operations for `destinos` collection
│   │   ├── listings.ts               # CRUD operations for `listagens` collection
│   │   ├── expenses.ts               # CRUD operations for `gastos` collection
│   │   ├── users.ts                  # CRUD operations for `usuarios` collection
│   │   └── protected.ts              # Protected data access
│   ├── auth.ts                       # Firebase Auth wrapper (signIn, signOut, onAuthChange)
│   └── storage.ts                    # LocalStorage helpers (preferences, language)
│
├── hooks/
│   ├── useAuth.ts                    # Authentication state and actions
│   ├── useFirestoreDoc.ts            # Generic Firestore document listener
│   ├── useFirestoreCollection.ts     # Generic Firestore collection listener
│   ├── useTranslation.ts             # i18n translation hook
│   ├── useTheme.ts                   # Dark/light mode toggle
│   ├── useUnsavedChanges.ts          # Form dirty state detection
│   ├── useToast.ts                   # Toast notification state
│   ├── useMediaQuery.ts              # Responsive breakpoint detection
│   └── useDebounce.ts                # Input debouncing
│
├── context/
│   ├── AuthContext.tsx                # Auth state (user, loading, error)
│   ├── ThemeContext.tsx               # Theme state (dark/light)
│   ├── LanguageContext.tsx            # Current language, translation function
│   └── ToastContext.tsx               # Toast notifications (app-wide)
│
├── i18n/
│   ├── en.json                        # English translations (unchanged from current)
│   ├── pt.json                        # Portuguese translations (unchanged from current)
│   └── types.ts                       # Translation key types
│
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx                 # Shared top navigation bar + logo
│   │   ├── TopBar.module.css
│   │   ├── Footer.tsx                 # Shared footer
│   │   ├── Footer.module.css
│   │   ├── MobileDrawer.tsx           # Mobile navigation drawer
│   │   ├── MobileDrawer.module.css
│   │   ├── Preloader.tsx              # Global loading spinner
│   │   └── Preloader.module.css
│   │
│   ├── ui/
│   │   ├── Button.tsx                 # Themed button
│   │   ├── CustomSelect.tsx           # Dropdown select (replaces custom-select.js)
│   │   ├── CustomSelect.module.css
│   │   ├── Drawer.tsx                 # Slide-out drawer (filter/sort/options)
│   │   ├── Drawer.module.css
│   │   ├── Tabs.tsx                   # Tab navigation
│   │   ├── Tabs.module.css
│   │   ├── Accordion.tsx              # Collapsible sections
│   │   ├── Accordion.module.css
│   │   ├── Toast.tsx                  # Toast notification
│   │   ├── Toast.module.css
│   │   ├── Modal.tsx                  # Confirmation/info modal
│   │   ├── Modal.module.css
│   │   ├── LanguageSelector.tsx       # EN/PT toggle
│   │   ├── LanguageSelector.module.css
│   │   ├── SortableList.tsx           # Drag-and-drop list (wraps SortableJS)
│   │   └── SortableList.module.css
│   │
│   ├── trip/
│   │   ├── TripCard.tsx               # Card for trip listings
│   │   ├── TripCard.module.css
│   │   ├── Countdown.tsx              # Trip countdown timer
│   │   ├── TripHeader.tsx             # Hero section with trip title, dates, links
│   │   ├── TripHeader.module.css
│   │   ├── TripNav.tsx                # Side navigation for trip sections
│   │   └── TripNav.module.css
│   │
│   ├── destination/
│   │   ├── DestinationCard.tsx        # Destination card with media
│   │   ├── DestinationCard.module.css
│   │   ├── CategoryFilter.tsx         # Category filter buttons
│   │   └── CategoryFilter.module.css
│   │
│   ├── expenses/
│   │   ├── ExpenseChart.tsx           # Chart.js wrapper for expense pie/bar charts
│   │   ├── ExpenseTable.tsx           # Expense breakdown table
│   │   ├── CurrencyTabs.tsx           # Currency selection tabs
│   │   └── ExpenseSummary.module.css
│   │
│   ├── transport/
│   │   ├── TransportCard.tsx          # Flight/bus/car info card
│   │   └── TransportCard.module.css
│   │
│   ├── accommodation/
│   │   ├── AccommodationCard.tsx      # Hotel/lodging info card
│   │   └── AccommodationCard.module.css
│   │
│   ├── itinerary/
│   │   ├── ItineraryDay.tsx           # Single day in itinerary
│   │   ├── ItineraryTimeline.tsx      # Full itinerary timeline
│   │   └── Itinerary.module.css
│   │
│   ├── media/
│   │   ├── MediaEmbed.tsx             # TikTok/Instagram/YouTube embed
│   │   ├── Gallery.tsx                # Photo gallery (GLightbox wrapper)
│   │   └── MediaEmbed.module.css
│   │
│   └── forms/
│       ├── FormField.tsx              # Labeled input wrapper
│       ├── FormSection.tsx            # Form section with title
│       ├── FieldArray.tsx             # Dynamic array of fields (add/remove/reorder)
│       └── forms.module.css
│
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx              # Email/password login form
│   │   └── LoginForm.module.css
│   │
│   ├── home/
│   │   ├── HomePage.tsx               # Main index page (logged-in + unlogged states)
│   │   ├── HomePage.module.css
│   │   ├── HeroSection.tsx            # Hero with Typed.js animation
│   │   ├── LoggedMenu.tsx             # Menu for authenticated users
│   │   └── UserLists.tsx              # Trip/destination/listing lists
│   │
│   ├── trip-view/
│   │   ├── TripViewPage.tsx           # Full trip visualization (view.html)
│   │   ├── TripViewPage.module.css
│   │   ├── KeypointsSection.tsx       # Highlights/key points section
│   │   ├── TransportSection.tsx       # Transportation section
│   │   ├── AccommodationSection.tsx   # Accommodation section
│   │   ├── ScheduleSection.tsx        # Calendar/schedule section
│   │   ├── DestinationSection.tsx     # Destinations within a trip
│   │   └── GallerySection.tsx         # Photo gallery section
│   │
│   ├── destinations/
│   │   ├── DestinationsPage.tsx       # Destination listing + category view
│   │   ├── DestinationsPage.module.css
│   │   ├── DestinationFilters.tsx     # Filter + sort drawer
│   │   └── DestinationMap.tsx         # MyMaps embed view
│   │
│   ├── expenses/
│   │   ├── ExpensesPage.tsx           # Full expenses view
│   │   ├── ExpensesPage.module.css
│   │   ├── ExpenseOverview.tsx        # Summary tab
│   │   ├── PreTripExpenses.tsx        # Pre-trip expenses tab
│   │   ├── DuringTripExpenses.tsx     # During-trip expenses tab
│   │   └── TravelerExpenses.tsx       # Per-traveler breakdown tab
│   │
│   ├── itinerary/
│   │   ├── ItineraryPage.tsx          # Full itinerary view
│   │   └── ItineraryPage.module.css
│   │
│   └── edit/
│       ├── EditTripPage.tsx           # Create/edit trip
│       ├── EditTripPage.module.css
│       ├── EditDestinationPage.tsx    # Create/edit destination
│       ├── EditDestinationPage.module.css
│       ├── EditListingPage.tsx        # Create/edit listing
│       ├── EditListingPage.module.css
│       ├── TripForm.tsx               # Trip form fields
│       ├── DestinationForm.tsx        # Destination form fields
│       └── ListingForm.tsx            # Listing form fields
│
├── utils/
│   ├── text.ts                        # String utilities (capitalize, codify, etc.)
│   ├── date.ts                        # Date formatting and manipulation
│   ├── object.ts                      # Object utilities (clone, diff, deepEqual)
│   ├── random.ts                      # Random ID generation
│   ├── url.ts                         # URL parameter parsing
│   └── currency.ts                    # Currency formatting
│
└── assets/
    ├── img/                           # Moved from public/assets/img/
    │   ├── backgrounds/
    │   ├── hospedagens/
    │   └── transportes/
    ├── fonts/                          # Moved from public/assets/fonts/
    └── json/
        ├── cores.json
        ├── icons.json
        ├── moedas.json
        ├── transportes.json
        └── version.json
```

### 2.2 Routing Strategy

Use **React Router v6** with the following route structure:

| Route                      | Component               | Description                                       |
| -------------------------- | ----------------------- | ------------------------------------------------- |
| `/`                      | `HomePage`            | Index with login/logged-in states                 |
| `/trip/:id`              | `TripViewPage`        | Full trip view (replaces `view.html?v=...`)     |
| `/trip/:id/itinerary`    | `ItineraryPage`       | Itinerary for a trip                              |
| `/trip/:id/expenses`     | `ExpensesPage`        | Expenses for a trip                               |
| `/destination/:id`       | `DestinationsPage`    | Destination details + categories                  |
| `/edit/trip/:id?`        | `EditTripPage`        | Create/edit trip (optional `:id` for edit mode) |
| `/edit/trip/new`         | `EditTripPage`        | Create new trip                                   |
| `/edit/destination/:id?` | `EditDestinationPage` | Create/edit destination                           |
| `/edit/destination/new`  | `EditDestinationPage` | Create new destination                            |
| `/edit/listing/:id?`     | `EditListingPage`     | Create/edit listing                               |
| `/edit/listing/new`      | `EditListingPage`     | Create new listing                                |

Query parameters (e.g., `?l=`, `?d=`, `?v=`) from the old system are replaced with path parameters.

### 2.3 State Management Strategy

| State Category                 | Mechanism                                 | Rationale                                                    |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------------------ |
| Auth state                     | React Context (`AuthContext`)           | Needed app-wide; changes infrequently                        |
| Theme (dark/light)             | React Context (`ThemeContext`)          | Needed app-wide; persisted in localStorage                   |
| Language / i18n                | React Context (`LanguageContext`)       | Needed app-wide; rarely changes                              |
| Toast notifications            | React Context (`ToastContext`)          | Needed app-wide; transient                                   |
| Firestore document data        | Custom hooks (`useFirestoreDoc`)        | Component-scoped; each hook manages its own subscription     |
| Firestore collection data      | Custom hooks (`useFirestoreCollection`) | Component-scoped                                             |
| Form state (edit pages)        | Local state (`useState`/`useReducer`) | Only relevant during editing; too complex for a global store |
| UI state (drawers, tabs, etc.) | Local state (`useState`)                | Component-scoped by nature                                   |

**Avoided**: Redux, Zustand, or any external state library. The application's state is primarily derived from Firestore (server state), not complex client-side state. React Context covers the small amount of truly global state.

### 2.4 Component Organization Strategy

- **`components/layout/`** — App shell: TopBar, Footer, MobileDrawer, Preloader. Reused across all pages.
- **`components/ui/`** — Design system primitives: Button, CustomSelect, Tabs, Accordion, Drawer, Modal, Toast, SortableList. These replace the custom JS widgets in `assets/js/suporte/componentes/` and `assets/js/suporte/html/`.
- **`components/[domain]/`** — Domain-specific presentational components: TripCard, DestinationCard, ExpenseChart, TransportCard, etc.
- **`components/forms/`** — Reusable form infrastructure used by edit pages.
- **`features/[feature]/`** — Page-level components and their sub-sections. Each feature folder represents a "page" from the original app.
- **`services/`** — Data access layer. No component imports Firebase directly.
- **`hooks/`** — Reusable logic. Thin wrappers around services + React lifecycle.

### 2.5 Styling Strategy

**Recommendation: CSS Modules**

| Approach              | Pros                                                                                             | Cons                                                                                 | Verdict                     |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------- |
| **CSS Modules** | Scoped by default; co-located with components; no runtime cost; easy migration from existing CSS | Requires rewriting selectors (class-based only)                                      | ✅**Recommended**     |
| Tailwind CSS          | Fast prototyping; no CSS files                                                                   | Radical departure from current codebase; steep migration; utility classes everywhere | ❌ Too disruptive           |
| Styled Components     | Dynamic styling; JS co-location                                                                  | Runtime overhead; learning curve; harder to migrate existing CSS                     | ❌ Unnecessary complexity   |
| SCSS Modules          | Same as CSS Modules + nesting/variables                                                          | Requires `sass` dependency                                                         | ⚠️ Acceptable alternative |

**Rationale for CSS Modules**:

1. Existing CSS is already organized by page/feature — this maps naturally to CSS Modules.
2. Bootstrap 5 can be kept as the global base (imported once in `main.tsx`), and CSS Modules override/extend per component.
3. CSS custom properties (`--theme-color`, etc.) from the current codebase can be moved to `:root` in `index.css`, keeping the theming system intact.
4. No runtime CSS-in-JS cost — all styles are static extracts.

**CSS Migration approach**:

1. Keep Bootstrap 5 as a global dependency (import in `main.tsx`).
2. Move theme variables and global resets to `src/index.css`.
3. Extract each page's CSS file into component-level `.module.css` files.
4. Each dark variant (`-dark.css`) becomes a `[data-theme="dark"]` selector block within the same module or a CSS custom property approach.
5. Vendor CSS (AOS, Swiper, GLightbox) is imported globally.

### 2.6 TypeScript Strategy

- **Strict mode** enabled in `tsconfig.json`.
- **No `any`** — use `unknown` when type is truly uncertain, and narrow with type guards.
- **Firestore documents** — Define interfaces for every collection's document shape (e.g., `TripDocument`, `DestinationDocument`, `ExpenseDocument`).
- **JSON data** — Define types for all JSON data files (`cores.json`, `icons.json`, etc.).
- **Translation keys** — Generate a union type of all valid translation keys from the JSON files (or use a const assertion).
- **Firebase Modular SDK** — The v10 Modular SDK has excellent TypeScript support out of the box.

**Key interfaces** (kept in `src/types/database.ts`):

```typescript
// Firestore document IDs are strings
type DocumentId = string;

interface TripDocument {
  titulo: string;
  inicio?: string;         // ISO date
  fim?: string;            // ISO date
  descricao?: string;
  modulos?: TripModules;
  pin?: 'no-pin' | 'all-data' | 'sensitive-only';
  moeda?: string;
  // ... other fields
}

interface TripModules {
  resumo?: boolean;
  transportes?: boolean;
  hospedagens?: boolean;
  gastos?: boolean;
  destinos?: boolean;
  galeria?: boolean;
  programacao?: boolean;
}

interface DestinationDocument {
  titulo: string;
  myMaps?: string;
  [category: string]: Record<string, DestinationItem> | string | undefined;
}

interface DestinationItem {
  nome: string;
  descricao?: string;
  midia?: MediaItem;
  // ... other fields
}
```

### 2.7 Firebase SDK Migration

Move from **Compat SDK** (namespaced) to **Modular SDK** (tree-shakeable):

| Old (Compat)                                        | New (Modular)                             |
| --------------------------------------------------- | ----------------------------------------- |
| `firebase.firestore().doc(path).get()`            | `getDoc(doc(db, path))`                 |
| `firebase.firestore().collection(path).add(data)` | `addDoc(collection(db, path), data)`    |
| `firebase.auth().signInWithEmailAndPassword(...)` | `signInWithEmailAndPassword(auth, ...)` |
| `firebase.auth().onAuthStateChanged(...)`         | `onAuthStateChanged(auth, ...)`         |

The Modular SDK is imported as:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
```

---

## 3. Migration Roadmap

### Phase 1: Project Scaffolding & Foundation

**Objective**: Set up the Vite + React + TypeScript project with all configurations and shared infrastructure.

**Files involved**: New files only (no modifications to existing codebase).

**Expected result**: A runnable Vite dev server with React, TypeScript, React Router, Firebase Modular SDK initialized, and all configuration files.

**Validation checklist**:

- [ ] `npm run dev` starts without errors
- [ ] TypeScript strict mode compiles cleanly
- [ ] Firebase initialization succeeds (read from existing project config)
- [ ] ESLint configured and passes
- [ ] Bootstrap 5 CSS loads correctly
- [ ] All vendor CSS (AOS, Swiper, GLightbox, BoxIcons) loads
- [ ] Google Fonts load correctly

**Dependencies**: None (this is Phase 1)

---

### Phase 2: Types, Config & Utilities

**Objective**: Port all shared infrastructure — types, constants, utility functions, and JSON data.

**Files involved**:

- All files under `src/types/`
- All files under `src/config/`
- All files under `src/utils/`
- `src/assets/json/*.json` (copied from `public/json/`)

**Expected result**: All TypeScript types defined, all utility functions ported with proper types, all JSON data importable.

**Validation checklist**:

- [ ] All utility functions from `dados.js` ported with types
- [ ] Date utilities from `datas.js` ported with types
- [ ] Text utilities ported with types
- [ ] Object utilities ported with types
- [ ] Firebase config reads from environment variables
- [ ] All JSON files accessible as ES module imports

**Dependencies**: Phase 1

---

### Phase 3: Firebase Services Layer

**Objective**: Port all Firestore CRUD operations to the Modular SDK with proper TypeScript types.

**Files involved**:

- `src/services/firestore/trips.ts`
- `src/services/firestore/destinations.ts`
- `src/services/firestore/listings.ts`
- `src/services/firestore/expenses.ts`
- `src/services/firestore/users.ts`
- `src/services/firestore/protected.ts`
- `src/services/auth.ts`
- `src/services/storage.ts`

**Expected result**: Typed service functions that replace all functions from `database.js`, `user.js`, and `storage.js`.

**Validation checklist**:

- [ ] `getTrip(id)` returns typed `TripDocument`
- [ ] `getDestination(id)` returns typed `DestinationDocument`
- [ ] `createTrip(data)` writes and returns document reference
- [ ] `updateTrip(id, data)` updates and returns result
- [ ] `deleteTrip(id)` removes document
- [ ] `signIn(email, password)` authenticates user
- [ ] `signOut()` clears auth state
- [ ] `onAuthChange(callback)` returns unsubscribe function
- [ ] All functions use Modular SDK (no `firebase.firestore()` compat calls)

**Dependencies**: Phase 2

---

### Phase 4: Contexts & Core Hooks

**Objective**: Build the React Context providers and custom hooks that form the app's infrastructure.

**Files involved**:

- `src/context/AuthContext.tsx`
- `src/context/ThemeContext.tsx`
- `src/context/LanguageContext.tsx`
- `src/context/ToastContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useFirestoreDoc.ts`
- `src/hooks/useFirestoreCollection.ts`
- `src/hooks/useTranslation.ts`
- `src/hooks/useTheme.ts`
- `src/hooks/useToast.ts`
- `src/hooks/useUnsavedChanges.ts`
- `src/i18n/en.json` (copied from `json/languages/en.json`)
- `src/i18n/pt.json` (copied from `json/languages/pt.json`)

**Expected result**: App-wide contexts and hooks ready for use by page components. The `translate()` function works within React components via `useTranslation()`.

**Validation checklist**:

- [ ] `useAuth()` returns `{ user, loading, signIn, signOut }`
- [ ] `useTheme()` returns `{ theme, toggleTheme }` and persists to localStorage
- [ ] `useTranslation()` returns `{ t, language, setLanguage }`
- [ ] i18n system supports placeholder replacement (e.g., `{{name}}`)
- [ ] `useFirestoreDoc(path)` returns `{ data, loading, error }` with real-time updates
- [ ] `useToast()` returns `{ showToast, toasts }`

**Dependencies**: Phase 3

---

### Phase 5: Shared UI Components

**Objective**: Port the reusable UI components from the `suporte/` JS files to React components with CSS Modules.

**Files involved**:

- All files under `src/components/layout/`
- All files under `src/components/ui/`
- All files under `src/components/media/`

**Expected result**: A complete design system of reusable components — TopBar, Footer, Buttons, CustomSelect, Drawer, Tabs, Accordion, Modal, Toast, SortableList.

**Validation checklist**:

- [ ] TopBar renders logo, language selector, night mode toggle, back button
- [ ] LanguageSelector toggles between EN and PT, updates context
- [ ] CustomSelect renders dropdown with options, triggers callback on selection
- [ ] Drawer slides in from the side, closes on overlay click
- [ ] Tabs render with glider animation, switch content
- [ ] Accordion expands/collapses sections
- [ ] Modal shows with title, content, and action buttons
- [ ] Toast appears and auto-dismisses
- [ ] SortableList supports drag-and-drop reorder (using SortableJS)
- [ ] Footer renders credits and attribution link
- [ ] Preloader shows/hides globally
- [ ] All components have dark mode support via CSS custom properties

**Dependencies**: Phase 4

---

### Phase 6: Auth & Home Page

**Objective**: Port the index page — login form, logged-in menu, trip/destination/listing lists.

**Files involved**:

- `src/features/auth/LoginForm.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/home/HeroSection.tsx`
- `src/features/home/LoggedMenu.tsx`
- `src/features/home/UserLists.tsx`
- `src/components/trip/TripCard.tsx`
- `src/App.tsx` (auth gate + router setup)

**Expected result**: The home page is fully functional — unauthenticated users see the login form; authenticated users see their trips, destinations, and listings.

**Validation checklist**:

- [ ] Unauthenticated user sees login form with email/password fields
- [ ] Login with valid credentials redirects to logged-in view
- [ ] Login with invalid credentials shows error
- [ ] Typed.js animation works in hero section (use `react-typed` or a useEffect wrapper)
- [ ] "Next trips" list shows upcoming trips
- [ ] "Previous trips" list shows past trips
- [ ] "My destinations" list shows user's destinations
- [ ] "My listings" list shows user's listings
- [ ] "New trip" / "New destination" / "New listing" buttons navigate to edit pages
- [ ] Sign out clears state and returns to login view
- [ ] Notification bar works (shows current trip)
- [ ] Dark mode toggle works on home page
- [ ] Language switch works on home page

**Dependencies**: Phase 5

---

### Phase 7: Trip View Page

**Objective**: Port the most complex page — the full trip visualization (`view.html`).

**Files involved**:

- `src/features/trip-view/TripViewPage.tsx`
- `src/features/trip-view/KeypointsSection.tsx`
- `src/features/trip-view/TransportSection.tsx`
- `src/features/trip-view/AccommodationSection.tsx`
- `src/features/trip-view/ScheduleSection.tsx`
- `src/features/trip-view/DestinationSection.tsx`
- `src/features/trip-view/GallerySection.tsx`
- `src/components/trip/TripHeader.tsx`
- `src/components/trip/TripNav.tsx`
- `src/components/trip/Countdown.tsx`
- `src/components/transport/TransportCard.tsx`
- `src/components/accommodation/AccommodationCard.tsx`
- `src/components/destination/DestinationCard.tsx`
- `src/components/media/Gallery.tsx`
- `src/components/forms/FormField.tsx` (for inline editing features)

**Expected result**: Full trip view page with all sections (hero, highlights, expenses preview, transport, accommodation, schedule, destinations, gallery). Side navigation scrolls to sections.

**Validation checklist**:

- [ ] Trip hero section shows title, dates, countdown
- [ ] Social links (attachments, Drive, Sheets, PPT) render conditionally
- [ ] Side navigation highlights current section on scroll
- [ ] Keypoints/highlights section renders
- [ ] Expenses summary section renders with chart
- [ ] Transportation section renders cards grouped by type (flight/bus/car)
- [ ] Accommodation section renders hotel/lodging cards
- [ ] Calendar/schedule section renders
- [ ] Destinations section renders with category navigation
- [ ] Gallery section with GLightbox integration
- [ ] Share button works
- [ ] Print button works
- [ ] Export button works (backup functionality)
- [ ] Mobile drawer navigation works on small screens
- [ ] All sections respect visibility settings (`modulos`)

**Dependencies**: Phase 6

---

### Phase 8: Destinations Page

**Objective**: Port the destinations detail page (`destination.html`).

**Files involved**:

- `src/features/destinations/DestinationsPage.tsx`
- `src/features/destinations/DestinationFilters.tsx`
- `src/features/destinations/DestinationMap.tsx`
- `src/components/destination/CategoryFilter.tsx`

**Expected result**: Full destinations page with category filters, sort, drawer, MyMaps embed, and add destination button (for owners).

**Validation checklist**:

- [ ] Destination title renders
- [ ] Category tabs render from destination data
- [ ] Filter drawer opens with category-specific filters
- [ ] Sort drawer opens with sort options
- [ ] Content renders destination items with media embeds
- [ ] MyMaps category renders as full-width iframe
- [ ] Instagram embeds render correctly
- [ ] TikTok embeds render correctly
- [ ] Add button visible for trip owners
- [ ] Edit visibility controls work

**Dependencies**: Phase 5 (reuses shared components)

---

### Phase 9: Expenses Page

**Objective**: Port the expenses page (`expenses.html`) with Chart.js charts.

**Files involved**:

- `src/features/expenses/ExpensesPage.tsx`
- `src/features/expenses/ExpenseOverview.tsx`
- `src/features/expenses/PreTripExpenses.tsx`
- `src/features/expenses/DuringTripExpenses.tsx`
- `src/features/expenses/TravelerExpenses.tsx`
- `src/components/expenses/ExpenseChart.tsx`
- `src/components/expenses/ExpenseTable.tsx`
- `src/components/expenses/CurrencyTabs.tsx`

**Expected result**: Full expenses page with currency tabs, overview/summary, pre-trip, during-trip, and per-traveler breakdowns with Chart.js pie/bar charts.

**Validation checklist**:

- [ ] Currency tabs render for each currency in trip data
- [ ] Overview tab shows total expenses pie chart
- [ ] Pre-trip tab shows pre-trip expense breakdown
- [ ] During-trip tab shows during-trip expense breakdown
- [ ] Travelers tab shows per-traveler expense breakdown
- [ ] All charts render with Chart.js
- [ ] Conversion section shows exchange rates
- [ ] Expense tables show detailed line items

**Dependencies**: Phase 5 (reuses shared components)

---

### Phase 10: Itinerary Page

**Objective**: Port the itinerary page (`itinerary.html`).

**Files involved**:

- `src/features/itinerary/ItineraryPage.tsx`
- `src/components/itinerary/ItineraryDay.tsx`
- `src/components/itinerary/ItineraryTimeline.tsx`

**Expected result**: Full itinerary page with timeline view, export, and print functionality.

**Validation checklist**:

- [ ] Trip title renders
- [ ] Itinerary timeline renders day-by-day
- [ ] Each day shows events/schedule
- [ ] Export button generates downloadable format
- [ ] Print button triggers print layout
- [ ] Mobile menu works

**Dependencies**: Phase 5

---

### Phase 11: Edit Pages — Trip

**Objective**: Port the trip creation/editing page (`edit/trip.html`).

**Files involved**:

- `src/features/edit/EditTripPage.tsx`
- `src/features/edit/TripForm.tsx`
- `src/components/forms/FormSection.tsx`
- `src/components/forms/FieldArray.tsx`

**Expected result**: Full trip editor with basic info, modules, dates, currency, pin protection, and all sub-sections.

**Validation checklist**:

- [ ] New trip mode: empty form with "Create" button
- [ ] Edit trip mode: pre-filled form with "Save" button
- [ ] Basic info section: title, description, dates
- [ ] Modules section: toggles for each trip section
- [ ] Travelers section: add/remove/reorder travelers
- [ ] Currency selection works
- [ ] PIN protection options work
- [ ] Unsaved changes detection works
- [ ] Required field validation works
- [ ] Form submission creates/updates Firestore document
- [ ] Save success shows toast and redirects

**Dependencies**: Phase 5

---

### Phase 12: Edit Pages — Destination & Listing

**Objective**: Port destination and listing editors (`edit/destination.html`, `edit/listing.html`).

**Files involved**:

- `src/features/edit/EditDestinationPage.tsx`
- `src/features/edit/EditListingPage.tsx`
- `src/features/edit/DestinationForm.tsx`
- `src/features/edit/ListingForm.tsx`

**Expected result**: Full destination and listing editors with category management, media embeds, and drag-and-drop item reordering.

**Validation checklist**:

- [ ] New/edit modes work for both destination and listing
- [ ] Category management (add/remove/rename categories)
- [ ] Item management within categories (add/remove/reorder)
- [ ] Media embed fields (Instagram, TikTok, YouTube)
- [ ] Drag-and-drop reorder via SortableJS
- [ ] Unsaved changes detection
- [ ] Required field validation
- [ ] Form submission creates/updates Firestore document
- [ ] Navigation back to trip/destination view after save

**Dependencies**: Phase 11 (shares form infrastructure)

---

### Phase 13: Styling Polish & Visual Parity

**Objective**: Ensure the migrated app looks identical to the original.

**Files involved**: All `.module.css` files across the project.

**Expected result**: Visual comparison between old and new app shows no regressions.

**Validation checklist**:

- [ ] All spacing, margins, padding match original
- [ ] All font sizes, weights, families match original
- [ ] All colors match original (light and dark modes)
- [ ] All animations (AOS, Swiper, custom) work identically
- [ ] Responsive breakpoints match original
- [ ] Mobile drawer behavior matches original
- [ ] Preloader animation matches original
- [ ] Toast animation matches original

**Dependencies**: Phase 6–12

---

### Phase 14: Backup, Restore & Data Management

**Objective**: Port backup/restore functionality and settings page.

**Files involved**: Port `backup.js` and `restore.js` logic.

**Expected result**: Data backup, restore, and account settings work.

**Validation checklist**:

- [ ] Backup downloads JSON with all user data
- [ ] Restore uploads and merges data
- [ ] PIN-protected data handled correctly
- [ ] Account settings page functional

**Dependencies**: Phase 6

---

### Phase 15: Final Integration & Cleanup

**Objective**: Integration testing, performance optimization, final cleanup.

**Files involved**: All files.

**Expected result**: Production-ready React application.

**Validation checklist**:

- [ ] All routes work (no 404s)
- [ ] All Firebase operations work
- [ ] No console errors or warnings
- [ ] No TypeScript compilation errors
- [ ] Bundle size is reasonable (tree-shaking effective)
- [ ] Lighthouse score acceptable
- [ ] All original `public/` HTML/JS/CSS can be archived

**Dependencies**: Phase 1–14

---

## 4. AI Execution Prompts

### Prompt 1: Project Scaffolding

```
You are building a React + Vite + TypeScript project for TripViewer, a Firebase-powered travel planner app. This is Phase 1 of a migration from a vanilla HTML+JS+CSS codebase.

## Task
Initialize a new Vite project with React and TypeScript in the workspace root. Do NOT modify any existing files in `public/`.

## Requirements
1. Use Vite 5+ with the React TypeScript template.
2. Configure `tsconfig.json` with strict mode enabled, path aliases (`@/` maps to `src/`).
3. Install these dependencies:
   - `react-router-dom` (v6)
   - `firebase` (v10+, Modular SDK)
   - `bootstrap` (v5.3+)
   - `aos`
   - `swiper`
   - `glightbox`
   - `chart.js` + `react-chartjs-2`
   - `sortablejs` + `@types/sortablejs`
   - `react-typed` (or wrap Typed.js in a useEffect)
   - `boxicons`
   - `bootstrap-icons`
4. Configure ESLint with TypeScript rules.
5. Set up Vite config with path aliases.
6. Create a minimal `src/main.tsx` that renders `<App />`.
7. Create `src/App.tsx` with a placeholder "TripViewer" heading.
8. Import Bootstrap CSS and Bootstrap Icons CSS in `main.tsx`.
9. Set up the folder structure as specified in the migration plan.
10. Add `.env.example` with Firebase config placeholder variables.

## Acceptance Criteria
- `npm run dev` starts a dev server without errors.
- `npm run build` produces a production build without TypeScript errors.
- Bootstrap CSS classes work in the browser.
- The folder structure matches the specification.
```

### Prompt 2: Types & Utilities

```
You are migrating a travel planner app (TripViewer) from vanilla JS to React + TypeScript. This is Phase 2.

## Context
The previous phase created the Vite + React + TypeScript scaffold. Now define all TypeScript types and port utility functions from the old codebase.

## Files to Reference
- `public/assets/js/suporte/paginas/dados.js` — Contains utility functions: `_firstCharToUpperCase`, `_codifyText`, `_uncodifyText`, `_getRandomID`, `_getEmptyChar`, `_isObject`, `_objectExistsAndHasKeys`, `_cloneObject`, `_areObjectsEqual`, `_getObjectDiff`, `_getDateString`, `_getDateRegionalFormat`, etc.
- `public/assets/js/suporte/paginas/datas.js` — Date utilities.
- `public/json/cores.json`, `public/json/icons.json`, `public/json/moedas.json`, `public/json/transportes.json`, `public/json/version.json` — Static JSON data files.

## Task

### Part A — Types (`src/types/`)

1. `database.ts`: 
   - `TripDocument` — fields: titulo, inicio (ISO string), fim (ISO string), descricao, modulos (object with boolean flags for resumo, transportes, hospedagens, gastos, destinos, galeria, programacao), moeda, pin ('no-pin' | 'all-data' | 'sensitive-only'), viajantes (array), etc.
   - `DestinationDocument` — fields: titulo, myMaps (URL string), plus dynamic category keys.
   - `ExpenseDocument` — fields based on the gastos structure.
   - `UserDocument` — fields: email, nome, viagens (map of IDs), destinos (map of IDs), listagens (map of IDs).

2. `models.ts`:
   - `Trip`, `Destination`, `Expense`, `Traveler`, `Transport`, `Accommodation`, `ItineraryEvent`, `MediaItem`, `Currency` — domain model types.

3. `common.ts`:
   - `Nullable<T>`, `DeepPartial<T>`, `WithId<T>`, `AsyncResult<T>`, `SortOrder`, `FilterCriteria`.

### Part B — Config (`src/config/`)
1. `constants.ts` — App-wide constants: Firestore collection names, route paths, localStorage keys.
2. `firebase.ts` — Initialize Firebase app from environment variables (VITE_FIREBASE_*).
3. `theme.ts` — Theme color definitions extracted from the CSS `:root` variables.

### Part C — Utilities (`src/utils/`)
Port all utility functions from `dados.js` and `datas.js`:
- `text.ts`: capitalize, codify, uncodify, getRandomId, getEmptyChar.
- `date.ts`: formatDate, getRegionalFormat, getLastUpdatedText, isDateInPast, isDateInFuture, getCountdownText.
- `object.ts`: clone, deepEqual, getDiff, isObject, objectExistsAndHasKeys.
- `url.ts`: getURLParams, buildQueryString.
- `currency.ts`: formatCurrency, convertCurrency.
- `random.ts`: generateRandomId.

### Part D — Static Data (`src/assets/json/`)
Copy the JSON files from `public/json/` (but NOT the `languages/` subfolder — that goes in Phase 4).

## Acceptance Criteria
- All utility functions have full TypeScript types (no `any`).
- All JSON data files are copied and importable.
- TypeScript compilation passes with strict mode.
- Functions produce identical output to the original JS versions for the same inputs.
```

### Prompt 3: Firebase Services Layer

```
You are migrating TripViewer from Firebase Compat SDK to the Modular SDK. This is Phase 3.

## Context
Previous phases created the project scaffold and types. Now port all Firestore CRUD operations to typed service functions using the Firebase Modular SDK (v10+).

## Files to Reference
- `public/assets/js/suporte/firebase/database.js` — Contains: `_get`, `_create`, `_deepCreate`, `_update`, `_override`, `_delete`, `_hasReadPermission`, `_getCollection`, `_getSingleData`, `_getTripData`.
- `public/assets/js/suporte/firebase/user.js` — Contains: `_getUserData`, `_signInWithEmailAndPassword`, `_signOut`, `_registerIfUserNotPresent`, `_getUID`.
- `public/assets/js/main/backup.js` — Contains backup logic.
- `public/assets/js/main/restore.js` — Contains restore logic.

## Task

### Services (`src/services/`)

1. **`auth.ts`** — Firebase Auth wrapper:
   - `initializeAuth()` — get or create Auth instance.
   - `signInWithEmail(email, password)` — returns `UserCredential`.
   - `signOutUser()` — signs out and clears state.
   - `onAuthStateChange(callback)` — returns unsubscribe function.
   - `getCurrentUser()` — returns current user or null.

2. **`firestore/trips.ts`**:
   - `getTrip(tripId)` — fetches a single trip document.
   - `createTrip(data)` — creates a new trip.
   - `updateTrip(tripId, data)` — partial update.
   - `deleteTrip(tripId)` — deletes a trip.
   - `getUserTrips(userId)` — fetches all trips for a user.

3. **`firestore/destinations.ts`**: Same CRUD pattern.

4. **`firestore/listings.ts`**: Same CRUD pattern.

5. **`firestore/expenses.ts`**: CRUD for gastos subcollection.

6. **`firestore/users.ts`**:
   - `getUserData(uid)` — fetches user document.
   - `createUser(uid, data)` — creates user document on first login.
   - `updateUser(uid, data)` — updates user preferences.

7. **`firestore/protected.ts`**: Access PIN-protected data.

8. **`storage.ts`**: localStorage helpers for language preference, theme preference, etc.

## Rules
- All functions return typed results (use the types from `src/types/database.ts`).
- Use Modular SDK imports ONLY: `import { getDoc, doc } from 'firebase/firestore'`.
- Do NOT use the Compat SDK (`firebase.firestore().doc()`).
- Wrap Firestore calls in try/catch and return `{ success: boolean, data?: T, error?: string }`.
- Read Firebase config from `src/config/firebase.ts`.

## Acceptance Criteria
- All service functions are fully typed.
- No `any` types.
- TypeScript compiles cleanly.
- Functions handle errors gracefully (no uncaught exceptions).
```

### Prompt 4: Context Providers & Hooks

```
You are building the React infrastructure for TripViewer. This is Phase 4.

## Context
Previous phases created the project scaffold, types, and Firebase services. Now create the React Context providers and custom hooks.

## Task

### Contexts (`src/context/`)

1. **`AuthContext.tsx`**:
   - Provides: `user`, `loading`, `error`, `signIn(email, password)`, `signOut()`.
   - Uses `onAuthStateChanged` from Firebase Auth to listen for auth changes.
   - On auth change, fetches user data from Firestore.
   - Handles: loading state, unauthenticated state, error state.

2. **`ThemeContext.tsx`**:
   - Provides: `theme` ('light' | 'dark'), `toggleTheme()`.
   - Persists to localStorage.
   - Applies `data-theme` attribute to `<html>` element.
   - Initializes from localStorage or system preference.

3. **`LanguageContext.tsx`**:
   - Provides: `language` ('en' | 'pt'), `setLanguage(lang)`, `t(key, replacements?)`.
   - Loads translation JSON from `src/i18n/{lang}.json`.
   - The `t()` function supports dot-notation keys and `{{placeholder}}` replacement.
   - Persists language choice to localStorage.
   - Falls back to English for unknown keys.

4. **`ToastContext.tsx`**:
   - Provides: `showToast(message, type?)`, array of active toasts.
   - Toasts auto-dismiss after a configurable duration.
   - Supports types: 'info', 'success', 'error', 'warning'.

### Hooks (`src/hooks/`)

1. **`useAuth.ts`** — Convenience wrapper around `useContext(AuthContext)`.
2. **`useTheme.ts`** — Convenience wrapper around `useContext(ThemeContext)`.
3. **`useTranslation.ts`** — Convenience wrapper around `useContext(LanguageContext)`.
4. **`useToast.ts`** — Convenience wrapper around `useContext(ToastContext)`.
5. **`useFirestoreDoc.ts`** — Generic hook for subscribing to a single Firestore document. Returns `{ data, loading, error }`. Cleanly unsubscribes on unmount.
6. **`useFirestoreCollection.ts`** — Generic hook for subscribing to a Firestore collection. Returns `{ data, loading, error }`.
7. **`useUnsavedChanges.ts`** — Tracks form dirty state. Returns `{ isDirty, markClean, markDirty }`.
8. **`useMediaQuery.ts`** — Returns boolean for a CSS media query string.
9. **`useDebounce.ts`** — Debounces a value.

### i18n Files
Copy `public/json/languages/en.json` → `src/i18n/en.json`
Copy `public/json/languages/pt.json` → `src/i18n/pt.json`

## Architectural Rules
- Contexts should be small and focused — no "god object" context.
- Each context has its own provider component.
- Providers are composed in `App.tsx` (Auth → Theme → Language → Toast → Router).
- Hooks throw if used outside their provider.

## Acceptance Criteria
- Auth flow works: sign in → user state updates → sign out → returns to unauthenticated.
- Theme toggle switches between light and dark, persists across page reloads.
- Language switch translates the UI, persists across page reloads.
- `t('trip.next')` returns the correct translated string.
- `useFirestoreDoc` subscribes and unsubscribes cleanly.
- All hooks are fully typed.
```

### Prompt 5: Shared UI Components

```
You are building the shared UI component library for TripViewer. This is Phase 5.

## Context
Previous phases created contexts, hooks, and Firebase services. Now build all reusable UI components that multiple pages will use. These components replace the custom JS widgets from the old codebase.

## Files to Reference (old codebase)
- `public/assets/js/suporte/componentes/custom-select.js` — Custom dropdown select.
- `public/assets/js/suporte/componentes/dynamic-select.js` — Dynamic select with add option.
- `public/assets/js/suporte/componentes/sortable.js` — SortableJS wrapper.
- `public/assets/js/suporte/html/accordion.js` — Accordion widget.
- `public/assets/js/suporte/html/embed.js` — Media embed + postMessage communication.
- `public/index.html` (lines with `top-bar`, `icons-box`, `lang-selector`, `night-mode`, `notification-bar`) — Top bar structure.
- `public/assets/css/index/index.css` — Reference for visual styling.

## Task

### Layout Components

1. **`TopBar.tsx` + `TopBar.module.css`**:
   - Logo (SVG inline, switches between light/dark variant based on theme).
   - Logo links to home page.
   - Language selector (EN/PT dropdown).
   - Night mode toggle button (moon/sun icon).
   - Optional: back button (shown when not on home page).
   - Optional: share button.
   - Optional: menu button (mobile).
   - Props: `showBack?: boolean`, `showShare?: boolean`, `onShare?: () => void`, `showMenu?: boolean`.

2. **`Footer.tsx` + `Footer.module.css`**:
   - Credits text: "Developed by Gabriel Fávero" with link.
   - Attribution/info button.
   - Props: none.

3. **`MobileDrawer.tsx` + `MobileDrawer.module.css`**:
   - Slide-in drawer from the left (mobile only).
   - Navigation links passed as children.
   - Props: `isOpen`, `onClose`, `children`.

4. **`Preloader.tsx` + `Preloader.module.css`**:
   - Full-screen loading spinner.
   - Props: `isLoading`.

### UI Components

5. **`Button.tsx`**:
   - Themed button with variants: 'primary', 'secondary', 'outline', 'danger'.
   - Props: `variant`, `size`, `disabled`, `loading`, `onClick`, `children`.

6. **`CustomSelect.tsx` + `CustomSelect.module.css`**:
   - Dropdown select with custom styling.
   - Props: `id`, `options: {value: string, label: string}[]`, `value`, `onChange`, `placeholder?`.
   - Opens/closes on click, closes on outside click.

7. **`Drawer.tsx` + `Drawer.module.css`**:
   - Generic slide-in drawer from the right.
   - Header with title and close button.
   - Body for content.
   - Props: `isOpen`, `onClose`, `title`, `children`.

8. **`Tabs.tsx` + `Tabs.module.css`**:
   - Tab navigation with animated glider.
   - Props: `tabs: {id: string, label: string}[]`, `activeTab`, `onChange`, `children` (tab panels).

9. **`Accordion.tsx` + `Accordion.module.css`**:
   - Collapsible sections with animated chevron.
   - Props: `items: {id: string, title: string, content: ReactNode}[]`, `allowMultiple?`.

10. **`Toast.tsx` + `Toast.module.css`**:
    - Renders toast notifications from ToastContext.
    - Auto-dismiss animation.
    - Close button.
    - Props: read from context, no direct props.

11. **`Modal.tsx` + `Modal.module.css`**:
    - Centered modal with overlay.
    - Props: `isOpen`, `onClose`, `title`, `children`, `actions?: ReactNode`.

12. **`LanguageSelector.tsx` + `LanguageSelector.module.css`**:
    - Compact EN/PT toggle.
    - Reads/writes LanguageContext.
    - Props: none (reads from context).

13. **`SortableList.tsx` + `SortableList.module.css`**:
    - Wrapper around SortableJS for drag-and-drop reordering.
    - Props: `items`, `onReorder: (newOrder: T[]) => void`, `renderItem: (item: T, index: number) => ReactNode`.

### Media Components

14. **`MediaEmbed.tsx` + `MediaEmbed.module.css`**:
    - Renders Instagram, TikTok, or YouTube embeds based on URL.
    - Handles embed script loading.
    - Props: `url: string`, `type?: 'instagram' | 'tiktok' | 'youtube'`.

15. **`Gallery.tsx` + `Gallery.module.css`**:
    - Wrapper around GLightbox for image galleries.
    - Props: `images: {src: string, thumb?: string, caption?: string}[]`.

## Styling Rules
- Use CSS Modules (`.module.css`).
- Use CSS custom properties for theming (reference theme colors via `var(--theme-color)`).
- All components must support dark mode via `[data-theme="dark"]` selectors or CSS custom properties.
- Match the visual appearance of the original TripViewer app as closely as possible.
- Use Bootstrap utility classes where appropriate (spacing, grid) via `className`.

## Acceptance Criteria
- Each component renders correctly in isolation.
- Dark mode toggle changes all component appearances.
- CustomSelect opens/closes and triggers onChange.
- Drawer slides in/out with animation.
- Tabs switch content with glider animation.
- Accordion expands/collapses.
- Modal opens/closes and traps focus.
- SortableList supports drag-and-drop.
- No TypeScript errors.
```

### Prompt 6: Auth & Home Page

```
You are building the authentication and home page for TripViewer. This is Phase 6.

## Context
Previous phases built all infrastructure: contexts, hooks, Firebase services, and UI components. Now build the first user-facing pages.

## Files to Reference (old codebase)
- `public/index.html` — The home page HTML structure.
- `public/assets/js/paginas/index/` — Index page JS logic.
- `public/assets/js/main/main.js` — `_loadIndexPage()`, login/logout flow.
- `public/assets/js/main/translation.js` — `translate()` function behavior.

## Task

### 1. Auth Feature (`src/features/auth/`)

**`LoginForm.tsx` + `LoginForm.module.css`**:
- Email input with placeholder from translation.
- Password input with placeholder from translation.
- "Sign In" button.
- Loading state while authenticating.
- Error display for invalid credentials.
- Calls `signIn()` from AuthContext.
- Styled to match the original login box (centered, semi-transparent background).

### 2. Home Page (`src/features/home/`)

**`HomePage.tsx` + `HomePage.module.css`**:
- Shows different content based on auth state:
  - **Unauthenticated**: Hero section with Typed.js animation ("Las Vegas, New York, São Paulo, TripViewer" cycling text), login form.
  - **Authenticated**: Hero with greeting ("Hello, {name}"), logged-in menu, notification bar.
- Notification bar shows current/next trip with link.
- Handles URL params for deep linking (e.g., `?v=xxx` redirects to trip view).

**`HeroSection.tsx`**:
- Animated text cycling via Typed.js (wrapped in useEffect).
- Props: `isLoggedIn`, `userName?`.

**`LoggedMenu.tsx`**:
- Menu items: "Next trips", "Previous trips", "My destinations", "My listings", "Account settings".
- Each item navigates to the appropriate section or page.
- Icons from BoxIcons/Bootstrap Icons.
- Props: `onNavigate: (section: string) => void`.

**`UserLists.tsx`**:
- Generic list component that shows items with a title and "New" button.
- Props: `title`, `items`, `onItemClick`, `onNewClick`, `emptyMessage?`.
- Used for: next trips, previous trips, destinations, listings.

### 3. Root App (`src/App.tsx`)

Update `App.tsx` to:
- Wrap everything in context providers: `AuthProvider → ThemeProvider → LanguageProvider → ToastProvider`.
- Set up React Router with routes for all pages (placeholder components for pages not yet built).
- Show Preloader while auth is initializing.
- Show HomePage for route `/`.
- Handle protected routes (redirect to login if unauthenticated).

### 4. Components

**`TripCard.tsx` + `TripCard.module.css`**:
- Displays trip title, dates, countdown (if upcoming).
- Shows trip destination count.
- Click navigates to trip view.
- Props: `trip: TripDocument`, `onClick: () => void`.

## Hooks to Use
- `useAuth()` — for user state and auth actions.
- `useTranslation()` — for all text.
- `useTheme()` — for theme-aware styling.
- `useFirestoreDoc()` / `useFirestoreCollection()` — for data fetching.
- `useNavigate()` — for navigation.

## Architectural Rules
- Components only access Firebase via service functions (no direct Firebase imports in components).
- All text uses the `t()` function from `useTranslation()`.
- No jQuery or direct DOM manipulation.
- All navigation uses React Router.

## Acceptance Criteria
- Home page loads and shows login form for unauthenticated users.
- Typed.js animation cycles through city names.
- Login with test credentials works.
- After login, greeting shows user's name.
- "Next trips" section shows trips from Firestore.
- "New trip" button navigates to `/edit/trip/new`.
- Theme toggle works on home page.
- Language toggle works on home page.
- Notification bar appears when user has an upcoming trip.
- Sign out returns to login view.
- TypeScript compiles cleanly.
```

### Prompt 7: Trip View Page

```
You are building the trip view page for TripViewer. This is Phase 7 and the most complex page.

## Context
The trip view page (`view.html` in the old codebase) displays a complete trip with hero section, side navigation, and multiple collapsible sections (keypoints, expenses, transport, accommodation, schedule, destinations, gallery).

## Files to Reference (old codebase)
- `public/view.html` — Full HTML structure.
- `public/assets/js/paginas/viagem/viagem.js` — Main trip view logic.
- `public/assets/js/paginas/viagem/suporte/` — All sub-modules (resumo, transportes, hospedagens, destinos, galeria, programacao, etc.).
- `public/assets/css/viagem/viagem.css` (2,701 lines) — All trip view styling.

## Task

### Main Page Component

**`TripViewPage.tsx` + `TripViewPage.module.css`**:
- Reads trip ID from URL params (`/trip/:id`).
- Fetches trip data using `useFirestoreDoc`.
- Fetches destination/listing data depending on `l` or `d` query params (for backward compatibility).
- Handles PIN-protected trips (shows PIN input modal if protected).
- Renders the full page layout:
  - TopBar with back button, share, and menu.
  - TripHeader (hero section).
  - TripNav (side navigation, mobile drawer).
  - Scrollable sections: Keypoints, Expenses (preview), Transport, Accommodation, Schedule, Destinations, Gallery.
- Implements scroll-spy to highlight active nav section.
- Handles loading, error, and not-found states.

### Sub-Components

1. **`TripHeader.tsx` + `TripHeader.module.css`**:
   - Trip title (h1).
   - Trip logo/image (h2).
   - Subtitle/description.
   - Countdown to trip start (if upcoming).
   - Social links: Attachments, Google Drive, Google Sheets, Google Slides (conditional).
   - Props: `trip: TripDocument`, `countdown: string | null`.

2. **`TripNav.tsx` + `TripNav.module.css`**:
   - Side navigation with section links.
   - Highlights active section based on scroll position.
   - Mobile: collapses into hamburger menu.
   - Sections: Home, Keypoints, Expenses, Transport, Accommodation, Schedule, Destinations, Gallery.
   - Visibility based on `modulos` config.
   - Props: `sections: NavSection[]`, `activeSection: string`.

3. **`Countdown.tsx`**:
   - Live countdown timer. Updates every second.
   - Props: `targetDate: string` (ISO).

### Section Components

4. **`KeypointsSection.tsx`**: Renders trip highlights/keypoints. Props: `data: Keypoint[] | undefined`.

5. **`TransportSection.tsx`**: Fetches transport data. Groups by type (flights, buses, cars). Renders TransportCard for each. Props: `tripId: string`.

6. **`TransportCard.tsx` + `TransportCard.module.css`**: Displays transport details with type icon, company, departure/arrival, dates, times, reservation info. Props: `transport: Transport`.

7. **`AccommodationSection.tsx`**: Fetches accommodation data. Renders AccommodationCard for each. Props: `tripId: string`.

8. **`AccommodationCard.tsx` + `AccommodationCard.module.css`**: Displays hotel/lodging: name, check-in/out, address, reservation info. Props: `accommodation: Accommodation`.

9. **`ScheduleSection.tsx`**: Shows trip calendar/schedule. Props: `tripId: string`.

10. **`DestinationSection.tsx`**: Shows destinations within the trip. Category tabs. Reuses DestinationCard. Props: `tripId: string`.

11. **`DestinationCard.tsx` + `DestinationCard.module.css`**: Card with destination name, description, media embed. Props: `destination: DestinationItem`.

12. **`GallerySection.tsx`**: Photo gallery with GLightbox. Props: `images: GalleryImage[]`.

### Styling
- Extract relevant styles from `viagem.css` into component-level `.module.css` files.
- Preserve visual appearance: side nav on desktop, hamburger on mobile, section spacing, card styles.

## Architectural Rules
- Use `useFirestoreDoc` / `useFirestoreCollection` for all data fetching.
- No direct Firebase calls in components.
- All navigation uses React Router.
- All text via `useTranslation().t()`.
- Handle loading, error, and not-found states.

## Acceptance Criteria
- Navigating to `/trip/{id}` loads the trip and displays the hero section.
- Countdown shows correct time remaining.
- Social links are clickable and open in new tabs.
- Side navigation scrolls to correct sections.
- Active section highlights in nav on scroll.
- All sections render when data is available.
- Sections hide when their module is disabled.
- Mobile view shows hamburger menu.
- Share button triggers native share or copy link.
- PIN-protected trips show PIN input.
- Loading state shows Preloader.
- Error state shows error message with retry option.
```

### Prompt 8: Destinations Page

```
You are building the destinations detail page for TripViewer. This is Phase 8.

## Context
The destinations page (`destination.html`) displays a destination with category tabs, filter/sort drawers, and content with media embeds.

## Files to Reference
- `public/destination.html` — HTML structure.
- `public/assets/js/paginas/destinos/destinos.js` — Page logic.
- `public/assets/js/paginas/destinos/categorias.js` — Category handling.
- `public/assets/js/paginas/destinos/suporte/` — Filter, sort, drawer.
- `public/assets/css/destinos/destinos.css` — Styling.

## Task

### `DestinationsPage.tsx` + `DestinationsPage.module.css`
- Reads destination ID from URL params (`/destination/:id`).
- Fetches destination data.
- Renders: TopBar with back button and share, title, category selector, filter/sort buttons (opens Drawer), content area, "Add" button (for owners), Footer.
- Handles MyMaps category (full-width iframe).

### `DestinationFilters.tsx`
- Drawer content for filtering destination items.
- Props: `category`, `filters`, `onFilterChange`.

### `DestinationMap.tsx`
- Renders Google MyMaps iframe.
- Props: `mapUrl: string`.

### `CategoryFilter.tsx` + `CategoryFilter.module.css`
- Horizontal scrollable category tabs/pills.
- Props: `categories: string[]`, `active: string`, `onChange: (cat: string) => void`.

## Acceptance Criteria
- Destination title and subtitle display correctly.
- Category selector switches content.
- Filter drawer opens with relevant filters.
- Sort drawer opens with sort options (A-Z, Z-A, newest, oldest).
- Instagram/TikTok embeds render in content cards.
- MyMaps category shows full-width Google Maps iframe.
- Add button visible for trip owners.
- Mobile responsive.
```

### Prompt 9: Expenses Page

```
You are building the expenses page for TripViewer. This is Phase 9.

## Context
The expenses page (`expenses.html`) shows trip expenses with currency tabs, summary overview, and detailed breakdowns using Chart.js.

## Files to Reference
- `public/expenses.html` — HTML structure.
- `public/assets/js/paginas/gastos/` — Expenses JS logic.
- `public/assets/css/gastos/gastos.css` — Styling.

## Task

### `ExpensesPage.tsx` + `ExpensesPage.module.css`
- Reads trip ID from URL params (`/trip/:id/expenses`).
- Fetches expense data from Firestore.
- Renders: TopBar with back button, title, currency tabs, tab navigation (Overview, Pre-trip, During-trip, Travelers), active tab content, Footer.

### `ExpenseOverview.tsx` — Pie chart + total + summary tables.
### `PreTripExpenses.tsx` — Pie chart + detailed table for pre-trip.
### `DuringTripExpenses.tsx` — Pie chart + detailed table for during-trip.
### `TravelerExpenses.tsx` — Pie chart + table per traveler.

### `ExpenseChart.tsx`
- Wrapper around `react-chartjs-2`.
- Props: `type: 'pie' | 'bar'`, `data`, `options?`.

### `ExpenseTable.tsx`
- Styled table for expense line items.
- Props: `items: ExpenseItem[]`, `currency: string`.

### `CurrencyTabs.tsx`
- Currency selector tabs.
- Props: `currencies: string[]`, `active: string`, `onChange`.

## Acceptance Criteria
- Expenses page loads for a given trip.
- Currency tabs switch between currencies.
- Overview tab shows total expenses pie chart.
- Pre-trip tab shows pre-trip expense breakdown.
- During-trip tab shows during-trip expense breakdown.
- Travelers tab shows per-traveler expense breakdown.
- Charts render with correct theme colors.
- Empty state shown when no expenses exist.
```

### Prompt 10: Itinerary Page

```
You are building the itinerary page for TripViewer. This is Phase 10.

## Context
The itinerary page (`itinerary.html`) shows a day-by-day trip itinerary with export and print functionality.

## Files to Reference
- `public/itinerary.html` — HTML structure.
- `public/assets/js/paginas/itinerary/` — Itinerary JS logic.
- `public/assets/css/itinerary/itinerary.css` — Styling.

## Task

### `ItineraryPage.tsx` + `ItineraryPage.module.css`
- Reads trip ID from URL params (`/trip/:id/itinerary`).
- Fetches itinerary data.
- Renders: TopBar with back, export, print, night mode buttons; trip title; itinerary timeline; mobile drawer; Footer.

### `ItineraryTimeline.tsx`
- Vertical timeline with day markers.
- Each day shows events/activities.
- Props: `days: ItineraryDay[]`.

### `ItineraryDay.tsx`
- Single day card with date, events.
- Props: `day: ItineraryDay`.

## Acceptance Criteria
- Itinerary renders day-by-day timeline.
- Each day shows correct date and events.
- Export button generates downloadable format.
- Print button opens print dialog with print styles.
- Mobile menu includes export, print, and night mode.
- Night mode toggle works.
```

### Prompt 11: Edit Trip Page

```
You are building the trip editor page for TripViewer. This is Phase 11.

## Context
The edit trip page (`edit/trip.html`) allows creating and editing trips with all configuration options.

## Files to Reference
- `public/edit/trip.html` — HTML structure.
- `public/assets/js/paginas/editar-viagem/` — Edit trip JS logic.
- `public/assets/css/editar/editar.css` (1,871 lines) — Edit pages styling.

## Task

### `EditTripPage.tsx` + `EditTripPage.module.css`
- Supports two modes via route: `/edit/trip/new` (create) and `/edit/trip/:id` (edit).
- Fetches existing trip data if in edit mode.
- Renders: TopBar with back button, form title, TripForm, Save/Cancel buttons.
- Validates required fields, calls `createTrip()` or `updateTrip()`.
- Shows success toast and navigates to trip view.
- Uses `useUnsavedChanges` hook for navigation warning.

### `TripForm.tsx`
- **Basic Info**: Title (required), description, start date, end date.
- **Modules**: Toggles for each section.
- **Travelers**: Dynamic list with add/remove/reorder.
- **Currency**: Selection dropdown.
- **PIN Protection**: Radio options.
- **Attachments**: Links (Drive, Sheets, Slides).
- Props: `trip?: TripDocument`, `onSubmit: (data: TripFormData) => Promise<void>`.

### Form Components
- `FormSection.tsx`: Section wrapper with title.
- `FormField.tsx`: Labeled input/select/textarea.
- `FieldArray.tsx`: Dynamic array with add/remove/reorder via SortableList.

## Architectural Rules
- Form state is local (useState/useReducer). No global form state.
- Firebase writes only on explicit Save.
- PIN input uses a separate modal for security.

## Acceptance Criteria
- New trip mode: empty form, "Create Trip" button.
- Edit trip mode: pre-filled form, "Save Changes" button.
- All form sections render correctly.
- Travelers can be added, removed, and reordered.
- Required field validation prevents submission.
- Save creates/updates Firestore document.
- Success toast after save.
- Navigation away with unsaved changes shows confirmation.
- Cancel returns to previous page.
```

### Prompt 12: Edit Destination & Listing Pages

```
You are building the destination and listing editor pages for TripViewer. This is Phase 12.

## Context
The edit destination and listing pages allow creating and editing destinations/listings with category and item management.

## Files to Reference
- `public/edit/destination.html`, `public/edit/listing.html` — HTML structures.
- `public/assets/js/paginas/editar-destino/` — Edit destination JS logic.
- `public/assets/js/paginas/editar-listagem/` — Edit listing JS logic.

## Task

### `EditDestinationPage.tsx` + `EditDestinationPage.module.css`
- Supports `/edit/destination/new` and `/edit/destination/:id`.
- Fetches existing data if editing.
- Renders: TopBar, form title, DestinationForm, Save/Cancel.
- Unsaved changes detection.

### `EditListingPage.tsx` + `EditListingPage.module.css`
- Same pattern for listings. Routes: `/edit/listing/new`, `/edit/listing/:id`.

### `DestinationForm.tsx`
- **Title** (required).
- **MyMaps URL** (optional).
- **Categories**: Dynamic list (add/remove/rename).
  - Each category has items that can be added, removed, reordered.
  - Each item: name, description, media URL, media type.
- Props: `destination?: DestinationDocument`, `onSubmit`.

### `ListingForm.tsx`
- Same structure as DestinationForm but for listagens collection.
- Props: `listing?: ListingDocument`, `onSubmit`.

## Acceptance Criteria
- New modes show empty forms.
- Edit modes show pre-filled forms.
- Categories can be added, renamed, removed.
- Items can be added, removed, reordered within categories.
- Media URL fields accept Instagram, TikTok, YouTube URLs.
- Required field validation.
- Save creates/updates Firestore document.
- Unsaved changes detection works.
```

### Prompt 13: Styling Polish

```
You are polishing the visual appearance of the migrated TripViewer app. This is Phase 13.

## Context
All pages are functional. Now ensure visual parity with the original application.

## Task

1. **Audit all pages** against the original:
   - Compare font sizes, weights, families.
   - Compare spacing (margins, padding, gaps).
   - Compare colors (light and dark mode).
   - Compare responsive breakpoints.
   - Compare animations (AOS, Swiper, custom).

2. **Fix visual discrepancies** in CSS Modules.

3. **Dark mode audit**: Ensure all components respect `[data-theme="dark"]`.

4. **Responsive audit**: Test at 320px, 768px, 1024px, 1440px widths.

5. **Animation audit**: AOS scroll, Swiper carousel, GLightbox, custom transitions.

6. **Print styles**: Ensure itinerary print view matches original.

## Acceptance Criteria
- Side-by-side comparison shows no visual differences.
- Dark mode is visually complete.
- All responsive breakpoints work.
- All animations are smooth.
- No layout shifts during page load.
```

### Prompt 14: Backup, Restore & Settings

```
You are building the backup/restore and settings functionality for TripViewer. This is Phase 14.

## Context
The original app has backup/restore features and account settings. Port these to React.

## Files to Reference
- `public/assets/js/main/backup.js` — Backup logic.
- `public/assets/js/main/restore.js` — Restore logic.
- `public/index.html` (settings-box section) — Settings UI.

## Task

### Backup Functionality
- Triggered from account settings or trip view.
- Gathers all user data (trips, destinations, listings, expenses).
- Handles PIN-protected data.
- Generates JSON download.
- Shows progress.

### Restore Functionality
- File upload (JSON).
- Validates JSON structure.
- Merges data into Firestore.
- Handles PIN-protected data.
- Shows progress and results.

### Settings Page
- Accessible from home page menu.
- Options: Language, Theme, Backup, Restore, Sign Out.
- About section with version info.

## Acceptance Criteria
- Backup downloads valid JSON with all user data.
- Restore uploads and processes a backup file.
- PIN-protected data handled correctly.
- Settings page shows all options.
- Sign out works from settings.
```

### Prompt 15: Final Integration & Cleanup

```
You are performing the final integration and cleanup for TripViewer's React migration. This is Phase 15.

## Task

1. **Route audit**: Verify all routes, redirect old URL patterns.
2. **Firebase security**: Test all operations with auth states.
3. **Error handling**: Test network errors, permission errors, user-friendly messages.
4. **Performance**: Run Lighthouse, check bundle size, verify code splitting.
5. **Console audit**: Fix all errors and warnings, remove debug logging.
6. **TypeScript audit**: `tsc --noEmit` must pass with zero errors. Check for `any` types.
7. **Build**: `npm run build` succeeds. Test production preview.
8. **Documentation**: Update README with setup instructions.

## Acceptance Criteria
- Zero TypeScript errors.
- Zero build errors.
- All routes work.
- Lighthouse score ≥ 80 (Performance), ≥ 90 (Accessibility), ≥ 90 (Best Practices).
- No console errors.
- Firebase operations work in production build.
```

---

## 5. Final Validation Checklist

### Feature Parity

- [ ] User can sign in with email and password
- [ ] User can sign out
- [ ] Home page shows login form (unauthenticated)
- [ ] Home page shows trip/destination/listing lists (authenticated)
- [ ] User can create a new trip
- [ ] User can edit an existing trip
- [ ] User can create a new destination
- [ ] User can edit an existing destination
- [ ] User can create a new listing
- [ ] User can edit an existing listing
- [ ] Trip view shows all sections (hero, keypoints, expenses, transport, accommodation, schedule, destinations, gallery)
- [ ] Trip view respects module visibility settings
- [ ] Trip view countdown works for upcoming trips
- [ ] Destinations page shows categories and items
- [ ] Destinations page filter and sort work
- [ ] Destinations page MyMaps embed works
- [ ] Expenses page shows overview, pre-trip, during-trip, travelers tabs
- [ ] Expenses page charts render correctly
- [ ] Expenses page currency switching works
- [ ] Itinerary page shows day-by-day timeline
- [ ] Itinerary export and print work
- [ ] PIN-protected data requires PIN to view
- [ ] Backup downloads all user data as JSON
- [ ] Restore uploads and merges JSON data
- [ ] Account settings page is functional
- [ ] Notification bar shows current/next trip
- [ ] Attribution/credits modal works

### Visual Parity

- [ ] Fonts match original (Open Sans, Raleway, Poppins, Chelos)
- [ ] Colors match original in light mode
- [ ] Colors match original in dark mode
- [ ] Spacing and layout match original
- [ ] Animations match original (AOS, Swiper, custom transitions)
- [ ] Responsive behavior matches original (320px, 768px, 1024px, 1440px)
- [ ] Logo renders correctly (light and dark variants)
- [ ] Bootstrap components styled consistently
- [ ] Mobile drawer matches original behavior
- [ ] Preloader matches original
- [ ] Toast notifications match original
- [ ] Modals match original style

### Type Safety

- [ ] `tsc --noEmit` passes with zero errors
- [ ] No `any` types in the codebase (or justified with comments)
- [ ] All service functions have explicit return types
- [ ] All component props have explicit interfaces/types
- [ ] All hooks have explicit return types
- [ ] All context values have explicit types
- [ ] Firestore document types cover all collections

### Build Success

- [ ] `npm run build` completes without errors
- [ ] Production bundle size is reasonable (< 500 KB gzipped for initial load)
- [ ] Firebase tree-shaking reduces SDK size
- [ ] Code splitting works (lazy-loaded routes)
- [ ] `npm run preview` serves the production build correctly

### Lint Success

- [ ] ESLint passes with zero errors
- [ ] ESLint passes with zero warnings (or justified exceptions)
- [ ] Prettier formatting is consistent

### Performance

- [ ] Lighthouse Performance score ≥ 80
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Lighthouse Best Practices score ≥ 90
- [ ] Lighthouse SEO score ≥ 90
- [ ] No layout shifts during page load (CLS < 0.1)
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s

### Maintainability

- [ ] Folder structure is clean and intuitive
- [ ] Components are small and focused (< 200 lines each)
- [ ] No duplicated code across features
- [ ] CSS is scoped to components (no global style leaks)
- [ ] All naming is in English (files, folders, variables, functions, components, types)
- [ ] Database field names preserved from original (Portuguese names in Firestore)
- [ ] README describes project setup and architecture
- [ ] New developer can understand the codebase within a day

---

*This migration plan was generated after thorough analysis of the existing codebase on 2026-06-02. It should be treated as a living document — update it as discoveries are made during implementation.*
