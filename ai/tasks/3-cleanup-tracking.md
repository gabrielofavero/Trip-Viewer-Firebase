# HTML/JS/CSS Cleanup Tracking
## Started: 2026-06-05

## Naming Conventions Applied
- Portuguese → English for comments, IDs, classes
- Semantic naming: class names reflect actual purpose
- camelCase for IDs, kebab-case for classes

## Changes Log

### view.html
| Old | New | Reason |
|-----|-----|--------|
| `class="resume"` | `class="itinerary resume"` | Semantic: calendar section, not a CV |
| `id="subtitulo"` | `id="hero-subtitle"` | Portuguese→English |
| `id="programacao-hoje"` | `id="todays-itinerary-btn"` | Portuguese→English |
| `id="sobre"` | `id="accommodation-about"` | Portuguese→English |
| `id="dados"` | `id="keypoints-grid"` | Portuguese→English |
| `id="dado1"`-`dado4` | `id="keypoint1"`-`keypoint4` | Portuguese→English |
| `id="transporte-titulo"` | `id="transportation-title"` | Portuguese→English |
| `id="transporte-select"` | `id="transportation-select"` | Portuguese→English |
| `id="tabs-container-transportes"` | `id="tabs-container-transportation"` | Portuguese→English |
| `id="tab-transporte"` | `id="tab-transportation"` | Portuguese→English |
| `id="transporte-box-container"` | `id="transportation-box-container"` | Portuguese→English |
| `id="transporte-ida"` | `id="transportation-outbound"` | Portuguese→English, semantic |
| `id="transporte-durante"` | `id="transportation-internal"` | Portuguese→English, semantic |
| `id="transporte-volta"` | `id="transportation-return"` | Portuguese→English, semantic |
| `id="transporte-custom-container"` | `id="transportation-custom-container"` | Portuguese→English |
| `id="transporte-*-content"` | `id="transportation-*-content"` | Portuguese→English |
| `id="hospedagens-box"` | `id="accommodations-box"` | Portuguese→English |
| `id="dTitle"` | `id="destinations-title"` | Cryptic→clear |
| `id="dUpdate"` | `id="destinations-update"` | Cryptic→clear |
| `id="dDescription"` | `id="destinations-description"` | Cryptic→clear |
| `id="destinosNav"` | `id="destinationsNav"` | Portuguese→English |
| `id="destinosNavText"` | `id="destinationsNavText"` | Portuguese→English |
| `id="destinos"` (section) | `id="destinations"` | Portuguese→English |
| `id="destinosTitleContainer"` | `id="destinationsTitleContainer"` | Portuguese→English |
| `id="destinosBox"` | `id="destinationsBox"` | Portuguese→English |
| `id="destinos-select"` | `id="destinations-select"` | Portuguese→English |
| `id="progDescription"` | `id="itinerary-description"` | Abbreviation→clear |
| `id="pTotal"` | `id="itinerary-total"` | Cryptic→clear |
| `id="pAjuste"` | `id="itinerary-adjustment"` | Cryptic+Portuguese→clear |
| `id="dadosBackup"` | `id="backupData"` | Portuguese→English |
| `id="tabela"` | `id="calendar-table-card"` | Portuguese→English |
| `id="tabHeader"` | `id="calendar-table-header"` | Abbreviation→clear |
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |
| `<!-- Galeria -->` | `<!-- Gallery -->` | Portuguese→English comment |

### destination.html
| Old | New | Reason |
|-----|-----|--------|
| `id="destinos-select"` | `id="destinations-select"` | Portuguese→English |
| `id="subtitulo-destinos"` | `id="destinations-subtitle"` | Portuguese→English |
| `id="adicionar"` | `id="add-button"` | Portuguese→English |
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |

### expenses.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |

### itinerary.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |

### index.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |
| `id="cancelar"` | `id="cancel-btn"` | Portuguese→English |
| `id="apagar"` | `id="delete-btn"` | Portuguese→English |

### edit/trip.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |
| `id="cancelar"` | `id="cancel-btn"` | Portuguese→English |
| `id="salvar"` | `id="save-btn"` | Portuguese→English |

### edit/destination.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |
| `id="cancelar"` | `id="cancel-btn"` | Portuguese→English |
| `id="salvar"` | `id="save-btn"` | Portuguese→English |

### edit/listing.html
| Old | New | Reason |
|-----|-----|--------|
| `class="atribuicoes"` | `class="attributions"` | Portuguese→English |
| `id="cancelar"` | `id="cancel-btn"` | Portuguese→English |
| `id="salvar"` | `id="save-btn"` | Portuguese→English |

### JS Files Updated
- `summary.js`: dado1-4 → keypoint1-4
- `view.js`: subtitulo, dUpdate, dDescription, dTitle, destinos*, etc.
- `itinerary-module.js`: programacao-hoje → todays-itinerary-btn
- `destination.js` (trip-detail): destinos* → destinations*
- `transportation-module.js`: transporte-* → transportation-* (static IDs)
- `destination.js` (destination page): destinos-select → destinations-select
- `edit-listing.js`, `edit-destination.js`, `edit-trip/support/event-listeners.js`: cancelar/salvar → cancel-btn/save-btn
- `home/support/event-listeners.js`: apagar → delete-btn

### CSS Files Updated
- `view/view.css`: Added `.itinerary` alongside `.resume`; Added `.attributions` alongside `.atribuicoes`
- `index/index.css`: Added `.attributions` alongside `.atribuicoes`
- `destination/destination.css`: Added `.attributions` alongside `.atribuicoes`
- `edit/edit.css`: Added `.attributions` alongside `.atribuicoes`
- `base/dark-mode.css`: Added `.attributions` alongside `.atribuicoes`

### Intentionally NOT Changed
- `programacao-*` family in view.html, inner-itinerary.js, itinerary-module.js, edit-trip JS: internally consistent, deeply embedded across 10+ files, matches database field names
- `transporte-nav` in messages.js: misnamed home button icon (separate bug, not cleanup)
- Firestore collection names (gastos, destinos, viagens, listagens): database identifiers
- CSS classes `.transporte-box`, `.destinos-*`, `.gastos-*`: used by JS-generated elements, kept for backward compat
