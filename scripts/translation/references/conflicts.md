# Translation Conflicts

The same Portuguese word maps to **different** English translations depending on context (parent object, field vs. value, etc.).

---

## 1. `destinos`

| English | Context | Source |
|---------|---------|--------|
| `destinations` | Global field name (TripModules, etc.) | `FIELD_MAP` |
| `destination` | String value (ItineraryItemType enum) | `VALUE_MAP` |
| `destinationRefs` | Trip root (slim ID references) | `CONTEXT_FIELD_MAP._root_viagens` |
| `showDestinations` | Inside `titulo` (ItineraryTitle boolean flag) | `CONTEXT_FIELD_MAP.titulo` |

**Guidance:** `destinos` as a field name → `destinations`; as a ref-only array at trip root → `destinationRefs`; as a string enum value → `destination`; inside itinerary title → `showDestinations`.

---

## 2. `partida`

| English | Context | Source |
|---------|---------|--------|
| `origin` | Inside `pontos` (transport origin location name) | `CONTEXT_FIELD_MAP.pontos` |
| `departure` | Inside `datas` (departure date/time) | `CONTEXT_FIELD_MAP.datas` |

**Guidance:** `partida` in a **points/location** object → `origin`; in a **dates** object → `departure`.

---

## 3. `chegada`

| English | Context | Source |
|---------|---------|--------|
| `destination` | Inside `pontos` (transport destination location name) | `CONTEXT_FIELD_MAP.pontos` |
| `arrival` | Inside `datas` (arrival date/time) | `CONTEXT_FIELD_MAP.datas` |

**Guidance:** `chegada` in a **points/location** object → `destination`; in a **dates** object → `arrival`.

---

## 4. `inicio`

| English | Context | Source |
|---------|---------|--------|
| `start` | Trip-level date field | `FIELD_MAP`, `new-schema.ts` (Trip.start) |
| `startTime` | PeriodItem time-of-day field | `new-schema.ts` JSDoc (PeriodItem.startTime) |

**Guidance:** `inicio` on a trip/whole-day object → `start`; inside an itinerary period entry → `startTime`.

> ⚠️ Not captured in `CONTEXT_FIELD_MAP` of the migration script. The migration uses `FIELD_MAP.inicio → "start"` globally, which would incorrectly rename PeriodItem `inicio` fields to `start` instead of `startTime`.

---

## 5. `fim`

| English | Context | Source |
|---------|---------|--------|
| `end` | Trip-level date field | `FIELD_MAP`, `new-schema.ts` (Trip.end) |
| `endTime` | PeriodItem time-of-day field | `new-schema.ts` JSDoc (PeriodItem.endTime) |

**Guidance:** `fim` on a trip/whole-day object → `end`; inside an itinerary period entry → `endTime`.

> ⚠️ Same issue as `inicio` — not captured in `CONTEXT_FIELD_MAP`.

---

## 6. `valor`

| English | Context | Source |
|---------|---------|--------|
| `price` | PlaceItem monetary cost field | `FIELD_MAP`, `new-schema.ts` (PlaceItem.price) |
| `value` | Inside `titulo` (ItineraryTitle string value) | `CONTEXT_FIELD_MAP.titulo` |

**Guidance:** `valor` on a place/venue → `price`; inside an itinerary title → `value`.

---

## 7. `programacao`

| English | Context | Source |
|---------|---------|--------|
| `label` | PeriodItem field (the activity name/description) | `FIELD_MAP` |
| `itinerary` | Inside `modulos` (boolean module flag) | `CONTEXT_FIELD_MAP.modulos` |

**Guidance:** `programacao` as a standalone field in an itinerary entry → `label`; inside the modules object → `itinerary`.

---

## 8. `transporte`

| English | Context | Source |
|---------|---------|--------|
| `transportation` | String value (ItineraryItemType enum) | `VALUE_MAP` |
| `type` | Field name on TransportLeg | `FIELD_MAP` |

**Guidance:** `transporte` as a field name → `type`; as a string value → `transportation`.

---

## 9. `data` vs `dados`

| Portuguese | English | Context | Source |
|------------|---------|---------|--------|
| `dados` | `data` | General field name (e.g., `transportes.dados`) | `FIELD_MAP` |
| `data` | `date` | Inside `programacoes` (ItineraryDay date) | `CONTEXT_FIELD_MAP.programacoes` |

**Guidance:** These are distinct Portuguese words: `dados` = data (plural noun), `data` = date (singular). The migration correctly handles them separately — `dados` → `data` via FIELD_MAP, `data` → `date` via CONTEXT_FIELD_MAP only under parent `programacoes`.

---

## 10. `hospedagens` (singular vs. plural)

| English | Context | Source |
|---------|---------|--------|
| `accommodations` | Field name (array of accommodations) | `FIELD_MAP` |
| `accommodation` | String value (ItineraryItemType singular enum) | `VALUE_MAP` |

**Guidance:** `hospedagens` as a field name → `accommodations` (plural); as a string enum value → `accommodation` (singular).

---

## 11. `ativo` (multiple contexts, same translation)

| English | All Contexts | Source |
|---------|-------------|--------|
| `active` | Field name, string value, JSDoc | `FIELD_MAP`, `VALUE_MAP`, `new-schema.ts` |

**No conflict.** `ativo` → `active` in all contexts.

---

## 12. `claro` / `escuro` (multiple contexts, same translation)

| Portuguese | English | All Contexts | Source |
|-----------|---------|-------------|--------|
| `claro` | `light` | Field name, string value, theme mode | `FIELD_MAP`, `VALUE_MAP`, `new-schema.ts` |
| `escuro` | `dark` | Field name, string value, theme mode | `FIELD_MAP`, `VALUE_MAP`, `new-schema.ts` |

**No conflict.** Both are consistent across all contexts.

---

## 13. `preco` / `valor` → `price` (duplicate English target)

| Portuguese | English | Source |
|-----------|---------|--------|
| `preco` | `price` | `FIELD_MAP` |
| `valor` | `price` | `FIELD_MAP` (primary); also `value` in titulo context |

**Guidance:** Both `preco` and `valor` can mean "price" in Portuguese. `preco` unambiguously maps to `price`. `valor` maps to `price` in PlaceItem context but `value` in ItineraryTitle context. See conflict #6.

---

## Summary Table

| PT-BR | Primary EN | Also means (context-dependent) |
|-------|-----------|-------------------------------|
| `destinos` | `destinations` | `destination`, `destinationRefs`, `showDestinations` |
| `partida` | `departure` | `origin` (in pontos) |
| `chegada` | `arrival` | `destination` (in pontos) |
| `inicio` | `start` | `startTime` (in PeriodItem) |
| `fim` | `end` | `endTime` (in PeriodItem) |
| `valor` | `price` | `value` (in titulo) |
| `programacao` | `label` | `itinerary` (in modulos) |
| `transporte` | `transportation` | `type` (as field name) |
| `hospedagens` | `accommodations` | `accommodation` (as enum value) |
