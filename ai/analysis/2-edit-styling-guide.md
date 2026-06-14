# Edit Pages — Styling & UX Modernization Guide

> **Target pages:** `public/edit/trip.html`, `public/edit/destination.html`, `public/edit/listing.html`
> **Goal:** Modern look consistent with `index.html`, horizontal category tabs (no long scroll), mobile-optimized, dark-mode preserved.
> **Status:** Specification — AI will execute implementation from this document.

---

## 1. Current Architecture Overview

### 1.1 HTML Structure (all 3 edit pages share the same skeleton)

```
<section id="hero" class="loadable">
  <div class="edit-page">                          ← flex container
    <div class="edit-page-navigation">              ← LEFT sidebar nav (category links)
      <nav><ul><li><a href="#section-id">…</a></li>…</ul></nav>
    </div>
    <main class="edit-page-content">                ← RIGHT content area
      <section>                                     ← one per category
        <div class="href-target" id="dados-basicos"></div>
        <h1>…</h1>
        <p>…</p>
        <div class="nice-form-group">…</div>        ← form fields
        <div class="item-box accordion …" id="…-box"><!-- JS-rendered accordion items --></div>
        <div class="button-box-formatted">…</div>   ← add button row
      </section>
      …
    </main>
  </div>
</section>
```

### 1.2 CSS Files Involved

| File | Role |
|---|---|
| `public/assets/css/main.css` | Imports base variables, reset, layout, dark-mode, components |
| `public/assets/css/edit/edit.css` | **All** edit-page-specific styles (~1190 lines) |
| `public/assets/css/base/variables.css` | CSS custom properties (light theme) |
| `public/assets/css/base/dark-mode.css` | `[data-theme="dark"]` overrides (~760 lines, includes edit section at L663-L735) |
| `public/assets/css/base/layout.css` | Top-bar, back-to-top, shared layout |
| `public/assets/css/components/accordion.css` | Shared accordion structural styles |

### 1.3 JS Files That Render Edit Content Dynamically

| Page | Entry Point | Key Category Files |
|---|---|---|
| Trip | `public/assets/ts/pages/edit-trip/trip-entry.ts` → `edit-trip.ts` | `categories/expenses.ts`, `categories/accommodation.ts`, `categories/transportation.ts`, `categories/destination.ts`, `categories/travelers.ts`, `categories/itinerary-module/…`, `categories/gallery.ts`, `categories/customization.ts` |
| Destination | `public/assets/ts/pages/edit-destination/destination-entry.ts` → `edit-destination.ts` | `categories/price.ts`, `categories/description.ts` (plus restaurants/snacks/nightlife/tourism/shopping/map rendered inline) |
| Listing | `public/assets/ts/pages/edit-listing/listing-entry.ts` → `edit-listing.ts` | `support/event-listeners.ts` |

**Key JS rendering patterns:**
- Accordion items are built via `document.createElement` and appended to `.item-box` divs
- Event listeners use `getID()` helper (which calls `document.getElementById`)
- Category data flows through `FIRESTORE_*_DATA` global variables
- Bootstrap's Collapse widget is used for accordion open/close (`$().collapse("show"/"hide")`)

---

## 2. Design Specifications

### 2.1 Overall Layout — Horizontal Category Tabs

**Replace** the left sidebar nav (`.edit-page-navigation`) with a **horizontal tab bar** at the top, inspired by `index.html`'s `.category-tabs`:

```
┌──────────────────────────────────────────────┐
│  Tab 1  │  Tab 2  │  Tab 3  │ … │  Save     │  ← sticky/fixed horizontal bar
├──────────────────────────────────────────────┤
│                                              │
│  [Active category content area]              │  ← only ONE section visible at a time
│                                              │
└──────────────────────────────────────────────┘
```

**Specs:**
- Tabs are horizontally laid out, wrapping on very narrow screens
- Active tab has highlighted style (matching `index.html`'s `.category-tab.active`)
- Clicking a tab shows its corresponding `<section>` and hides all others
- A "Save" tab/button is always visible (currently `#double-buttons` section)
- The tab bar should be **sticky** at the top (below the top-bar) so it's always accessible
- On mobile (≤768px): tabs become a horizontally scrollable row with smaller text

### 2.2 Tab Bar CSS (New Component)

Create this either as a new component CSS file (`public/assets/css/components/category-tabs.css`) or inline in the edit CSS. Target classes:

```css
.edit-tab-bar {
  display: flex; gap: 4px; margin-bottom: 24px;
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: var(--radius-lg); padding: 4px;
  border: 1px solid var(--border-color);
  position: sticky; top: 68px; /* below top-bar (60px + gap) */
  z-index: 10;
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* hide scrollbar on Firefox */
}
.edit-tab-bar::-webkit-scrollbar { display: none; }

.edit-tab {
  flex: 0 0 auto; /* don't stretch, allow scroll */
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px; border-radius: var(--radius-md);
  font-size: 13px; font-weight: 600; font-family: inherit;
  border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; transition: all var(--transition-normal);
  white-space: nowrap;
}
.edit-tab:hover { color: var(--text-primary); background: rgba(0,0,0,0.03); }
.edit-tab.active {
  background: #fafafa; color: var(--theme-color);
  box-shadow: var(--shadow-sm);
}

/* Save tab — distinct style */
.edit-tab.save-tab {
  color: #fff; background: var(--theme-color);
  box-shadow: 0 2px 8px rgba(var(--theme-color-rgb),0.3);
  margin-left: auto; /* push to right */
}
.edit-tab.save-tab:hover { background: var(--theme-secondary); }
```

### 2.3 Section Visibility Behavior

Each `<section>` inside `<main class="edit-page-content">` gets a `data-category` attribute matching its tab:

```html
<section data-category="dados-basicos">…</section>
<section data-category="customizacao">…</section>
<section data-category="gastos" id="double-buttons">…</section> <!-- Save section -->
```

**JS behavior:**
- On page load, show only the first section (`dados-basicos`)
- Clicking a tab: hide all sections, show the matching `[data-category]` section
- The save section (`#double-buttons`) is special — it always acts as the save action, not a content panel
- Sections use `display: none` / `display: block` for toggling (no animation needed, keeps it simple)

### 2.4 Form Field Modernization

**Replace** hardcoded `nice-form-group` CSS custom properties with project variables. The current `nice-form-group` uses its own variable system (`--nf-*`). We should:

1. **Keep** the `nice-form-group` class name (JS code references it indirectly via DOM structure, but doesn't target it by class)
2. **Override** the `--nf-*` variables to use our design tokens
3. **Add** modern input styling (frosted glass, better focus states, larger touch targets)

```css
/* In the edit page context, override nice-form variables */
.edit-page-content .nice-form-group {
  --nf-input-size: 1rem;
  --nf-input-font-size: 0.9375rem;
  --nf-input-color: var(--text-primary);
  --nf-input-border-radius: var(--radius-md);
  --nf-input-placeholder-color: var(--text-muted);
  --nf-input-border-color: var(--border-color);
  --nf-input-background-color: var(--bg-secondary);
  --nf-input-focus-border-color: var(--theme-color);
  --nf-label-color: var(--text-primary);
  --nf-label-font-weight: 600;
  --nf-label-font-size: 0.8125rem;
}

/* Input fields — modern look */
.edit-page-content .nice-form-group > input[type="text"],
.edit-page-content .nice-form-group > input[type="url"],
.edit-page-content .nice-form-group > input[type="email"],
.edit-page-content .nice-form-group > input[type="number"],
.edit-page-content .nice-form-group > input[type="date"],
.edit-page-content .nice-form-group > input[type="time"],
.edit-page-content .nice-form-group > select,
.edit-page-content .nice-form-group > textarea {
  padding: 12px 16px;
  height: auto;
  min-height: 48px;
  font-size: 15px;
  font-family: inherit;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  transition: border var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}
.edit-page-content .nice-form-group > input:focus,
.edit-page-content .nice-form-group > select:focus,
.edit-page-content .nice-form-group > textarea:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.12);
}
```

### 2.5 Section Cards

Each `<section>` should look like a clean card, matching the index aesthetic:

```css
.edit-page-content section {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  line-height: 1.6;
  font-size: 0.9375rem;
}

/* Section heading */
.edit-page-content section h1 {
  font-size: 1.25rem; font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.edit-page-content section h1 svg {
  width: 1.25em; height: 1.25em;
  color: var(--theme-color); flex-shrink: 0;
}
.edit-page-content section p {
  color: var(--text-muted);
  margin: 0 0 20px 0;
  font-size: 0.875rem;
}
```

### 2.6 Accordion Items (JS-Rendered)

The accordion items inside `.item-box` divs are rendered by JS. The CSS for these is in `public/assets/css/components/accordion.css` and dark-mode overrides in `dark-mode.css`. Update these to use variables:

```css
/* Accordion — updated */
.accordion-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  overflow: hidden;
}
.accordion-header {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}
.accordion-button {
  background: transparent;
  color: var(--text-primary);
  font-weight: 600; font-size: 14px;
  padding: 14px 16px;
}
.accordion-button[aria-expanded="true"] {
  background: var(--bg-tertiary);
}
.accordion-body {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 16px;
}
```

### 2.7 Buttons

All buttons inside edit pages should use the same `.btn` system from `index.html`:

```css
/* Already defined in index.css — these classes are available project-wide */
.btn { … }
.btn-primary-theme { … }   /* filled accent */
.btn-outline-theme { … }   /* outlined accent */
.btn-secondary-theme { … } /* neutral */
.btn-danger { … }          /* danger (red) */
.btn-sm { … }              /* smaller */
```

**Current edit page buttons to update:**
- `.btn-theme` → `.btn-primary-theme` (add buttons)
- `.input-botao` → `.btn-secondary-theme` (input-trigger buttons)
- Save button → `.btn-primary-theme`

### 2.8 Dark Mode

**All dark mode styles MUST continue to work.** The existing `[data-theme="dark"]` rules in `dark-mode.css` (lines ~663-735 for the edit section) should be reviewed and updated to match new class names. Key rules:

```css
[data-theme="dark"] .edit-tab-bar {
  background: rgba(28,28,30,0.6);
  border-color: var(--border-color);
}
[data-theme="dark"] .edit-tab.active {
  background: var(--bg-tertiary); color: var(--theme-color);
}
[data-theme="dark"] .edit-tab.save-tab {
  background: var(--theme-color); color: #fff;
}
[data-theme="dark"] .edit-page-content section {
  background: rgba(44,44,46,0.7);
  border-color: var(--border-color);
}
[data-theme="dark"] .edit-page-content section h1 {
  color: var(--text-primary);
}
[data-theme="dark"] .edit-page-content section h1 svg {
  color: var(--theme-color);
}
[data-theme="dark"] .edit-page-content section p {
  color: var(--text-muted);
}
```

---

## 3. Mobile Optimization

### 3.1 Tab Bar on Mobile (≤768px)

- Tabs become a **horizontally scrollable strip** with hidden scrollbar
- Font size reduces to 12px, padding to 8px 10px
- Icons remain but text is abbreviated or hidden on very small screens (≤400px)
- The "Save" tab always stays visible (use `flex-shrink: 0` and `order` to keep it at end)

```css
@media (max-width: 768px) {
  .edit-tab-bar {
    top: 60px; border-radius: 0;
    margin-left: -16px; margin-right: -16px;
    padding: 6px 8px;
  }
  .edit-tab {
    font-size: 12px; padding: 8px 10px; gap: 4px;
  }
  .edit-tab svg { width: 16px; height: 16px; }
}

@media (max-width: 400px) {
  .edit-tab span { display: none; }  /* icon-only tabs */
  .edit-tab.save-tab span { display: inline; } /* always show Save text */
}
```

### 3.2 Section Cards on Mobile

- Full-width, reduced padding
- Remove horizontal margin so content uses full screen width
- Form inputs remain at comfortable touch target sizes (min 48px height)

```css
@media (max-width: 768px) {
  .edit-page-content {
    padding: 16px 12px;
  }
  .edit-page-content section {
    padding: 16px;
    border-radius: var(--radius-md);
  }
}
```

### 3.3 Form Layout on Mobile

- Side-by-side fields (`.side-by-side-box`) collapse to stacked
- File upload buttons get full width

---

## 4. HTML Structural Changes

### 4.1 Remove Sidebar Navigation

Remove the entire `.edit-page-navigation` div from all 3 HTML files.

### 4.2 Add Tab Bar

Insert the tab bar **inside** `<main class="edit-page-content">`, **before** the first `<section>`:

```html
<main class="edit-page-content">
  <div class="edit-tab-bar" id="edit-tab-bar">
    <!-- Tabs will be generated by JS or defined statically -->
  </div>
  <section data-category="dados-basicos">…</section>
  …
</main>
```

### 4.3 Add `data-category` Attributes

Each `<section>` needs a `data-category` attribute. The mapping (trip.html example):

| Section | `data-category` |
|---|---|
| Basic Info | `dados-basicos` |
| Customization | `customizacao` |
| Expenses | `gastos` |
| Transportation | `meios-de-transporte` |
| Accommodation | `hospedagens` |
| Destinations | `destinos` |
| Itinerary | `programacao` |
| Gallery | `galeria` |
| Save | `double-buttons` |

The `href-target` divs should be kept (they don't hurt and removing them is unnecessary risk), but they won't be used for scrolling anymore.

### 4.4 Update CSS Link

The `edit.css` will be substantially rewritten. Keep the same path (`../assets/css/edit/edit.css`) but replace its contents.

---

## 5. JavaScript Changes Required

### 5.1 New Tab Switching Logic

Create a new file or add to existing JS:

```typescript
// public/assets/ts/ui/edit-tabs.ts (new file)
export function initEditTabs() {
  const tabBar = document.getElementById("edit-tab-bar");
  if (!tabBar) return;

  const tabs = tabBar.querySelectorAll(".edit-tab");
  const sections = document.querySelectorAll(".edit-page-content section[data-category]");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const category = tab.dataset.tab;

      // Handle save tab specially
      if (category === "double-buttons") {
        // Trigger save — existing save button click
        document.querySelector("#double-buttons .btn")?.click();
        return;
      }

      // Update active tab styling
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      // Show/hide sections
      sections.forEach(section => {
        section.style.display = section.dataset.category === category ? "block" : "none";
      });
    });
  });
}
```

### 5.2 Files That Need Imports Updated

Each edit page's entry point needs to call `initEditTabs()`:

- `public/assets/ts/pages/edit-trip/edit-trip.ts` — add `import { initEditTabs } from "../../ui/edit-tabs.js";` and call it in `loadEditTripPage()`
- `public/assets/ts/pages/edit-destination/edit-destination.ts` — same
- `public/assets/ts/pages/edit-listing/edit-listing.ts` — same

### 5.3 JS Files That Reference `.edit-page-navigation`

Search for any JS that references the old sidebar nav classes:
- `.edit-page-navigation` — no JS references found (only CSS)
- `.edit-page` — only CSS references

**No JS changes needed for the sidebar removal.**

### 5.4 Accordion JS — No Changes Needed

The accordion logic (`public/assets/ts/ui/accordion.ts`) works purely on IDs and Bootstrap's Collapse API. It does not depend on the sidebar navigation. No changes needed.

### 5.5 Section Visibility & JS-Rendered Content

**Important:** Some sections contain content rendered by JS after page load (accordion items, dynamic fields). The tab switching must NOT interfere with this. Since we're using `display: none/block` (not removing DOM elements), JS-rendered content inside hidden sections is preserved. This is safe.

---

## 6. Implementation Steps (for AI execution)

### Phase 1: CSS Rewrite

1. **Backup** current `public/assets/css/edit/edit.css` (rename to `edit.css.bak`)
2. **Create new** `edit.css` with:
   - Tab bar styles (Section 2.2)
   - Section card styles (Section 2.5)
   - Form field overrides (Section 2.4)
   - Button styles (Section 2.7)
   - Accordion updates (Section 2.6)
   - Mobile breakpoints (Section 3)
   - Dark mode rules (Section 2.8)
3. **Update** `public/assets/css/base/dark-mode.css` edit section (lines ~663-735) to match new class names
4. **Update** `public/assets/css/components/accordion.css` to use CSS variables

### Phase 2: HTML Changes

5. **Edit** `public/edit/trip.html`:
   - Remove `.edit-page-navigation` div
   - Add `.edit-tab-bar` with tabs inside `.edit-page-content`
   - Add `data-category` attributes to all `<section>` elements
6. **Edit** `public/edit/destination.html`: same changes
7. **Edit** `public/edit/listing.html`: same changes

### Phase 3: JavaScript

8. **Create** `public/assets/ts/ui/edit-tabs.ts` with tab switching logic
9. **Update** `public/assets/ts/pages/edit-trip/edit-trip.ts` — import and call `initEditTabs()`
10. **Update** `public/assets/ts/pages/edit-destination/edit-destination.ts` — same
11. **Update** `public/assets/ts/pages/edit-listing/edit-listing.ts` — same

### Phase 4: Verification

12. Test all 3 pages in light mode — tabs switch sections correctly
13. Test dark mode toggle — all elements respond to `[data-theme="dark"]`
14. Test mobile viewport (375px, 414px, 768px) — tabs scroll horizontally, forms are touch-friendly
15. Test that JS-rendered accordion content still works inside hidden/shown sections
16. Test Save tab triggers the existing save logic

---

## 7. CSS Variables Reference

These are the key design tokens from `variables.css` to use throughout:

| Variable | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--theme-color` | `#5859a7` | `#7f75b6` | Accent color, active states |
| `--theme-color-rgb` | `88, 89, 167` | `127, 117, 182` | For rgba() shadows |
| `--theme-secondary` | `#7172b4` | `#9b91d4` | Hover accent |
| `--bg-primary` | `#ffffff` | `#1c1c1e` | Card backgrounds |
| `--bg-secondary` | `#f7f8f9` | `#2c2c2e` | Input backgrounds |
| `--bg-tertiary` | `#f0f0f5` | `#3a3a3c` | Hover states |
| `--text-primary` | `#1a1a2e` | `#f2f2f2` | Headings, body text |
| `--text-secondary` | `#4f5051` | `#c7c6c6` | Secondary text |
| `--text-muted` | `#8a8a8e` | `#8e8e93` | Placeholders, hints |
| `--border-color` | `#e5e5ea` | `#38383a` | Borders |
| `--radius-sm` | `8px` | — | Small rounding |
| `--radius-md` | `12px` | — | Default rounding |
| `--radius-lg` | `16px` | — | Card rounding |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | darker | Subtle elevation |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | darker | Card elevation |
| `--transition-fast` | `0.15s ease` | — | Micro-interactions |
| `--transition-normal` | `0.25s ease` | — | Standard transitions |

---

## 8. Tab Configurations Per Page

### 8.1 Trip Edit Tabs

| Tab Label Key | Icon | `data-category` |
|---|---|---|
| `labels.basic_information` | `feather-tool` | `dados-basicos` |
| `labels.customization.title` | `feather-sliders` | `customizacao` |
| `trip.expenses.title` | (currency icon) | `gastos` |
| `trip.transportation.title` | (compass icon) | `meios-de-transporte` |
| `trip.accommodation.title` | (bed icon) | `hospedagens` |
| `destination.title` | (pin icon) | `destinos` |
| `trip.itinerary.title` | `feather-calendar` | `programacao` |
| `trip.gallery.title` | (gallery icon) | `galeria` |
| `labels.save` | (save icon) | `double-buttons` |

### 8.2 Destination Edit Tabs

| Tab Label Key | Icon | `data-category` |
|---|---|---|
| `labels.basic_information` | `feather-tool` | `dados-basicos` |
| `destination.restaurants.title` | (restaurant icon) | `restaurantes` |
| `destination.snacks.title` | (coffee icon) | `lanches` |
| `destination.nightlife.title` | (drink icon) | `saidas` |
| `destination.tourism.title` | (globe icon) | `turismo` |
| `destination.shopping.title` | (shop icon) | `lojas` |
| `destination.map.title` | (map icon) | `mapa` |
| `labels.save` | (save icon) | `double-buttons` |

### 8.3 Listing Edit Tabs

| Tab Label Key | Icon | `data-category` |
|---|---|---|
| `labels.basic_information` | `feather-tool` | `dados-basicos` |
| `labels.customization.title` | `feather-sliders` | `customizacao` |
| `destination.title` | (pin icon) | `destinos` |
| `labels.save` | (save icon) | `double-buttons` |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Bootstrap Collapse breaks when section is `display:none` | Bootstrap Collapse uses its own `.show` class for visibility; `display:none` on the parent section won't affect it once the section becomes visible. Test thoroughly. |
| JS-rendered content references `getID()` on hidden elements | `getElementById` works on hidden elements. No issue. |
| Existing dark mode rules become stale | Review and update all `[data-theme="dark"]` rules for edit pages during Phase 1, step 3. |
| Translation keys break in tab bar | Reuse existing `data-translate` attributes on tabs, same as the current sidebar nav links. |
| "Save" tab accidentally submits empty data | The save tab should trigger the existing save button's click handler, which already validates required fields. |

---

*Guide version: 1.0 — Last updated: 2026-06-13*
