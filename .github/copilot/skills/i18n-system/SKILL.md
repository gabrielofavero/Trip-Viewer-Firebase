---
name: i18n-system
description: 'Use when you need to add, modify, or understand translations, the internationalization system, language switching, or the dot-path key resolution. Covers the JSON language packs, translate() function, translatePage() for static HTML, and language detection.'
---

# i18n System

TripViewer supports **English (en)** and **Portuguese (pt)** via JSON language packs and a custom dot-path translation function. All user-facing strings go through the i18n system.

---

## Language Files

```
public/assets/json/languages/
├── en.json    ← English translations
└── pt.json    ← Portuguese translations
```

Each file is a nested JSON object where keys use **dot-path notation**:

```json
{
    "trip": {
        "document": "Trip",
        "delete": {
            "title": "Delete trip",
            "message": "Are you sure you want to delete the trip \"{{name}}\"?"
        },
        "basic_information": {
            "subtitle": "Add the main information about your trip here",
            "title_placeholder": "Enter the trip title"
        }
    }
}
```

---

## Translation Function (`translate()`)

```typescript
import { translate } from '../i18n/translation.js';

// Simple lookup
translate('trip.document');                    // → "Trip"

// With replacements ({{placeholder}})
translate('trip.delete.message', { name: 'Eurotrip' });
// → 'Are you sure you want to delete the trip "Eurotrip"?'

// Strict mode (default: true) — warns on missing keys
translate('nonexistent.key');                   // console.warn + returns the key itself
translate('nonexistent.key', {}, false);        // silent fallback to key
```

### Behavior
- Resolves dot-path by splitting on `.` and traversing the language object
- If a key is missing in **strict mode**, logs a warning with the caller's stack trace and adds it to a `MISSING_TRANSLATIONS` Set
- If the resolved value is not a string, logs an error and returns `''`
- Supports `{{placeholder}}` replacements via regex

---

## Static HTML Translation (`translatePage()`)

For static HTML content (section titles, labels, button text), use `translatePage()`:

```typescript
import { translatePage } from '../i18n/translation.js';

// Called once in main() after config loads
translatePage();
```

This scans the DOM for elements with `data-translate` attributes:
```html
<h2 data-translate="trip.document">Trip</h2>
<span data-translate="account.settings">Settings</span>
```

The attribute value is the translation key. The function replaces `textContent` with the translated value.

---

## Language Detection

```typescript
import { getUserLanguage, getLanguagePackName } from '../i18n/translation.js';

// Returns the user's language code ('en' or 'pt')
getUserLanguage();     // Checks localStorage, falls back to navigator.language

// Returns the language pack filename ('en' or 'pt')
getLanguagePackName(); // Validates against LANGUAGES = ['en', 'pt'], defaults to 'en'
```

### Detection flow:
1. Check `localStorage.getItem('userLanguage')`
2. If not set, use `navigator.language` (first part before `-`)
3. Store result in `localStorage`
4. Validate against `['en', 'pt']` — default to `'en'` if unsupported

---

## Language Switching

```typescript
import { updateUserLanguage } from '../i18n/translation.js';

// Switch language and reload the page
updateUserLanguage('pt');
```

The language selector is a `<select>` populated by `loadLangSelectorSelect()`. Switching triggers `updateUserLanguage()` which:
1. Saves the new language to `localStorage`
2. Reloads the page (`location.reload()`)

---

## Loading Flow

In `app/config.ts`:
```typescript
const lang = getLanguagePackName();  // 'en' or 'pt'
const langData = await fetch(`assets/json/languages/${lang}.json`);
window.LANGUAGE = await langData.json();
```

The loaded language pack is stored on `window.LANGUAGE` and accessed by `translate()` via `getLanguage()`.

---

## Translation Key Conventions

| Pattern | Example | Meaning |
|---|---|---|
| `{domain}.{section}.{key}` | `trip.delete.title` | Hierarchical by feature |
| `{domain}.{section}` | `trip.document` | Leaf-level simple strings |
| `labels.{name}` | `labels.entertainment` | Shared labels/categories |
| `messages.{type}.{action}` | `messages.documents.get.error` | Error/success messages |
| `account.{section}.{key}` | `account.backup.title` | Account-related UI |

### Current top-level domains:
`account`, `trip`, `destination`, `listing`, `expenses`, `itinerary`, `transportation`, `accommodation`, `labels`, `messages`, `edit`, `settings`, `traveler`, `gallery`, `links`, `modules`, `home`

---

## Adding a New Translation Key

1. Add the key to **both** `en.json` and `pt.json` at the same path:
```json
// en.json
"trip": {
    "new_feature": {
        "label": "New Feature",
        "description": "This is a new feature"
    }
}

// pt.json
"trip": {
    "new_feature": {
        "label": "Nova Funcionalidade",
        "description": "Esta é uma nova funcionalidade"
    }
}
```

2. Use in TypeScript:
```typescript
translate('trip.new_feature.label');
```

3. Use in HTML (static):
```html
<span data-translate="trip.new_feature.label">New Feature</span>
```

---

## Debugging Missing Translations

Missing keys in strict mode are logged to the console with:
- The missing key
- The caller's file and line number (from stack trace)

The `MISSING_TRANSLATIONS` Set accumulates all missing keys during a session. Check it in the browser console:
```javascript
// In browser console
window.__missingTranslations  // if exposed
```

---

## Design Notes

- **No i18n library** — custom implementation, lightweight
- **Two languages only** — EN and PT, hardcoded in `LANGUAGES = ['en', 'pt']`
- **Page reload on switch** — changing language triggers `location.reload()`, not dynamic re-render
- **JSON loaded at startup** — the entire language pack is fetched and cached on `window.LANGUAGE`
- **Placeholder format** — `{{name}}` with double braces, replaced via regex
