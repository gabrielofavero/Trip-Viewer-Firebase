---
name: css-ui-patterns
description: 'Use when you need to understand or modify CSS, UI components, styling conventions, dark mode, CSS variables, or visual patterns. Covers the modular CSS architecture, component styles, theme system, and per-page organization.'
applyTo: 'public/assets/css/**; public/assets/ts/theme/**; public/assets/ts/ui/**'
---

# CSS & UI Patterns

TripViewer uses **modular vanilla CSS** (no preprocessor, no framework) alongside Bootstrap for base styles. The CSS is organized by concern into `base/`, `components/`, and per-page folders.

---

## CSS Architecture

```
public/assets/css/
├── main.css              ← Entry point: @imports all base + component styles
├── base/
│   ├── variables.css     ← CSS custom properties (colors, shadows, radii, transitions)
│   ├── reset.css         ← Normalize/reset
│   ├── fonts.css         ← @font-face declarations
│   ├── layout.css        ← Grid, header, nav, footer, section layouts
│   ├── preloader.css     ← Loading screen spinner
│   └── dark-mode.css     ← All [data-theme="dark"] overrides
├── components/
│   ├── accordion.css     ← Expandable sections (used in editors)
│   ├── modal.css         ← Overlay modals
│   ├── custom-select.css ← Styled <select> replacement
│   ├── toast.css         ← Toast notification popups
│   ├── sensitive-box.css ← PIN-protected data display
│   └── swiper-overrides.css ← Swiper.js gallery customizations
├── index/                ← Home/dashboard page styles
├── view/                 ← Trip detail viewer styles
├── destination/          ← Destination page styles
├── expenses/             ← Expenses page styles
├── itinerary/            ← Itinerary calendar styles
└── edit/                 ← Editor page styles (trip, destination, listing)
```

### Import order matters
`main.css` imports base first, then components. Per-page CSS is linked directly in each HTML page's `<head>` (via the `head.html` partial).

---

## CSS Variables (Design Tokens)

### Light Theme (`:root`)

```css
--theme-color: #5859a7;          /* Primary brand */
--theme-color-hover: #505197;
--bg-primary: #ffffff;
--bg-secondary: #f7f8f9;
--bg-tertiary: #f0f0f5;
--text-primary: #1a1a2e;
--text-secondary: #4f5051;
--text-muted: #8a8a8e;
--border-color: #e5e5ea;
--box-color: #f1f1f1;
--box-color-hover: rgb(236, 235, 235);
--shadow-sm/md/lg/xl: ...        /* 4 shadow levels */
--radius-sm/md/lg/xl: 8/12/16/24px
--transition-fast/normal/slow    /* 0.15s / 0.25s / 0.4s */
```

### Dark Theme (`[data-theme="dark"]`)

All variables are redefined under `[data-theme="dark"]`. Theme toggling works by setting `data-theme="dark"` on `<html>`, which cascades all variable overrides at once. No class-per-element approach.

### Dynamic Theme Colors

Trip-specific colors can override the default theme. The `theme/colors.ts` module dynamically sets CSS variables via `setCSSVariable()`:
```typescript
setCSSVariable('theme-color', trip.colors.light);
setCSSVariable('theme-color-hover', darkerShade);
```

---

## Dark Mode System

Toggle via `theme/theme.ts`:
- `loadDarkMode()` — sets `[data-theme="dark"]` on `<html>`, updates logo colors
- `loadLightMode()` — removes the attribute
- `applyThemeAttribute(mode)` — `"dark"` or `"light"`
- Persisted in `localStorage`

The dark mode CSS file (`base/dark-mode.css`) is **comprehensive** — it overrides every component and page in one file using `[data-theme="dark"]` prefix selectors. This avoids scattered dark mode styles.

---

## Key Component Patterns

### Accordion (`components/accordion.css`)
Used heavily in the trip editor for collapsible sections (accommodations, transportation, itinerary items, etc.). Driven by `ui/accordion.ts`.

### Modal (`components/modal.css`)
Overlay modal dialogs for confirmations, prompts, and messages. Used by `utils/messages.ts` (`displayPrompt`, `displayMessage`, `displayError`).

### Custom Select (`components/custom-select.css`)
Replaces native `<select>` with styled dropdowns. Used for currency selection, theme colors, category pickers. Driven by `ui/custom-select.ts`.

### Toast (`components/toast.css`)
Non-intrusive notifications (success, error, info). Bottom-center positioned. Auto-dismiss with animation.

### Sensitive Box (`components/sensitive-box.css`)
PIN-protected data display. Shows a lock icon and requires PIN input to reveal reservation codes and booking links.

---

## Bootstrap Coexistence

Bootstrap provides the base grid system, utility classes, and some components. Custom CSS overrides Bootstrap where needed:
- Custom CSS is loaded **after** Bootstrap
- Use CSS variables instead of Bootstrap's default colors
- Custom components (accordion, modal) replace Bootstrap equivalents
- Bootstrap JS is loaded as a vendor script (via `<script>` tag)

---

## Per-Page CSS Organization

Each page has its own CSS folder. These are linked in the page's HTML:
```html
<link href="assets/css/index/style.css" rel="stylesheet">
```

### Common page patterns:
- **Section titles:** `.section-title h2` with `::before`/`::after` decorative lines
- **Cards/boxes:** `.box` class with shadow, border-radius, and hover states
- **Category tabs:** Horizontal tab bar (used in `index.html` and `edit/trip.html`)
- **Loading skeleton:** Animated placeholder blocks during data fetch

---

## Responsive Design

- **Mobile-first** approach with Bootstrap breakpoints
- **Sidebar nav** collapses to a drawer on mobile (`< 1200px`)
- **Category tabs** scroll horizontally on narrow screens
- **Grid layouts** use CSS Grid with `auto-fill`/`minmax` for card grids

---

## When to Edit CSS

| Change | Where |
|---|---|
| New color/theme variable | `base/variables.css` + `base/dark-mode.css` |
| New shared component | `components/new-component.css` + import in `main.css` |
| Page-specific styling | `{page}/style.css` |
| Dark mode for new styles | `base/dark-mode.css` |
| Font changes | `base/fonts.css` |
| Layout/header/nav | `base/layout.css` |
