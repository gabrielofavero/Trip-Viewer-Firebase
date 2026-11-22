---
name: mymaps-editing
description: 'Use when the user asks to add, remove, rename or move places in a Google My Maps map that is linked from a destination document (`destinations/{id}.myMaps`), or asks what is in that map. The agent cannot edit the user''s Google account, so this skill fetches the map KML, edits it with a dependency-free helper, validates it, and returns a ready-to-import .kml (plus per-layer KML/CSV) with exact instructions for replacing/adding the information in My Maps.'
---

# Editing Google My Maps (KML round-trip)

My Maps is the map linked to a destination (`destinations/{id}.myMaps`). The agent has **no
Google session and no My Maps API**, so it cannot change the map directly. The working loop is:

```
destination doc ──myMaps url──▶ fetch KML ──▶ edit KML ──▶ validate ──▶ give the user the file
                                                                        + how to import it
```

Never claim the map was edited. The deliverable is the **file** and the **steps**.

---

## 1. Find the map

| Target | How to read `destinations/{id}` |
|---|---|
| Local emulator (default) | `query-firestore` skill → `--collection destinations --doc <id> --json` |
| Production (only if the user asks) | `node .github/skills/destination-feeding/scripts/firestore-rest.mjs get destinations/<id>` |

Fields that matter:

```ts
myMaps: string          // "https://www.google.com/maps/d/viewer?mid=<MID>&usp=sharing"  or ""
myMapsImported?: boolean // true after the app's "Update with Maps → My Maps" import ran
```

- The user may also paste a My Maps URL directly — that is enough, skip Firestore.
- `mid` identifies **the map**; editing layers never changes it. Only a **new map** produces a
  new `mid` (then `myMaps` must be updated — see §7).
- The `lid` param (when present) is a single layer; it is not required to fetch the whole map.

## 2. Fetch the KML

```bash
node .github/skills/mymaps-editing/scripts/mymaps.mjs mid  "<myMaps url>"
node .github/skills/mymaps-editing/scripts/mymaps.mjs fetch "<myMaps url|mid>" --out tmp/mymaps/<dest>-<change>.kml
```

`fetch` calls `https://www.google.com/maps/d/kml?mid=<MID>&forcekml=1`, follows
`<NetworkLink>` layers (multi-layer maps) and writes one `Folder` per layer.
No auth is needed **as long as the map is public**: *Share → Anyone with the link → Viewer*.

> Below, `node …` means `node .github/skills/mymaps-editing/scripts/mymaps.mjs`.

- Fetched/edited files go under `tmp/` (gitignored scratch — no backlog ticket, never commit).
- If the map is private the endpoint returns HTML — the script says so. Fallback in §6C.
- Timeout is 15 s per request, mirroring `workers/places-api` (`MYMAPS_FETCH_TIMEOUT_MS`).
- Without `--out`, `fetch` writes `tmp/mymaps/<map-name>-<YYYYMMDD-HHmm>.kml`.

## 3. Read what is in the map

```bash
node .github/skills/mymaps-editing/scripts/mymaps.mjs list  tmp/mymaps/x.kml            # layers + counts
node .github/skills/mymaps-editing/scripts/mymaps.mjs list  tmp/mymaps/x.kml --names    # + place names/coords
node .github/skills/mymaps-editing/scripts/mymaps.mjs show  tmp/mymaps/x.kml --folder "Turismo"
node .github/skills/mymaps-editing/scripts/mymaps.mjs show  tmp/mymaps/x.kml --name "izakaya"
```

KML facts (all verified against a real export):

- `<Folder>` = **My Maps layer** (`Restaurantes`, `Saídas`, `Turismo`, …). Free text — folder
  names are *not* category ids; the app maps them with an alias table when importing.
- A placemark is only `<name>` + `<styleUrl>` + `<Point><coordinates>lng,lat,0</coordinates></Point>`.
  **No place id, no address, no description** — those are resolved by the app's enrichment.
- Icon/colour styles live once at `<Document>` level and are referenced by `styleUrl="#id"`.
- Names with `&`, `<` or `>` are wrapped in `CDATA` by Google — the helper reproduces that.

## 4. Edit

```bash
# add (folder must exist unless --create-folder; new folder = new layer on import)
node … add    tmp/mymaps/x.kml --folder "Turismo" --name "Museu do Amanhã" --lat -22.8949 --lng -43.1796
node … add    tmp/mymaps/x.kml --folder "Cafés" --name "Café X" --lat … --lng … --create-folder

# change / delete
node … rename tmp/mymaps/x.kml --folder "Turismo" --name "Old name" --to "New name"
node … coords tmp/mymaps/x.kml --folder "Turismo" --name "Place" --lat … --lng …
node … remove tmp/mymaps/x.kml --folder "Turismo" --name "Place" [--match] [--all]
```

Rules:

1. **Never invent coordinates.** Take them from the user, a Google Maps link (`@lat,lng` or
   `!3d…!4d…`), the app's Places API/scraper enrichment, or ask. If the user gives only a name,
   say what you need — do not guess.
2. `add` copies the **most common `styleUrl` of the target folder** so the pin looks native
   (`--style "#icon-…"` to force another).
3. `add` refuses duplicates in the same folder; chains repeat (e.g. `Dunkin'` ×8) — use
   `--force` only when the user really wants another copy.
4. Touch only the requested placemark(s). Do not rename/reorder folders, do not drop styles, do
   not "clean up" unrelated entries.
5. Lines/polygons (`<LineString>`, `<Polygon>`) are preserved but not editable by the helper —
   if the user wants one changed, edit the XML by hand with the same preservation rules.
6. For anything the helper cannot express (`<description>` HTML, `ExtendedData`, new geometry),
   edit the XML directly, then **always** run `validate`.

## 5. Validate

```bash
node … validate tmp/mymaps/x.kml
```

Checks: balanced XML, every Point placemark has a usable name and in-range coordinates,
`styleUrl` targets exist, no raw `&`, no BOM, and warns when a map exceeds My Maps' 10-layer limit.
Exit code 1 = do not hand the file over.

## 6. Deliver the file + import instructions

Write/copy the final file to a descriptive path, e.g.
`tmp/mymaps/japao-add-osaka-cafes.kml`, and give the user the **absolute path** plus the
matching procedure:

### A. Add places (non-destructive)

1. Open the map in **My Maps** (edit mode).
2. Layer pane → **Import** (or the map's ⋮ → *Import*).
3. Upload the `.kml`; when Google lists the folders, tick the ones to import.
4. Imported folders become **new layers** — rename/restyle them as needed (10-layer cap applies).

### B. Replace a layer

KML import **always adds** a layer; it never overwrites one. So either:

- **KML path:** import the file → confirm the new layer is correct → delete the old layer
  (layer ⋮ → *Delete layer*). Keeps icons/styles from the KML.
- **CSV path (recommended when the layer already has custom styles):** `csv` exports
  `Name,Latitude,Longitude` per layer; re-importing a CSV/Sheets layer offers
  **Replace all items / Update map data in a layer / Add more items / Merge matching items**.

```bash
node … split tmp/mymaps/x.kml --out-dir tmp/mymaps/x-layers   # one .kml per layer
node … csv   tmp/mymaps/x.kml --out-dir tmp/mymaps/x-csv      # one .csv per layer
```

> Google documents that KML imports may drop *Folders* and other data (HTML balloons, tours,
> time-based elements, overlays, MultiGeometries, 3D models). That is why `split`/`csv` produce
> **one file per layer** — importing a bundle of folders into one layer is not reliable.

### C. Map is private / fetch failed

Ask the user to export it (My Maps → ⋮ → *Export to KML/KMZ*), then:

```bash
# .kml → use directly; .kmz → unzip first (KMZ is a zip)
Expand-Archive -Path map.kmz -DestinationPath tmp/mymaps/kmz
node … expand tmp/mymaps/kmz/doc.kml --out tmp/mymaps/x.kml
```

## 7. After the user imports

- **Same map edited** → `mid` unchanged → nothing to update in Firestore. The destination keeps
  pointing at the map.
- **New map created instead** → the `mid` changed. Update `destinations/{id}.myMaps`:
  - preferred: the app's **edit/destination → map link** field;
  - or a merge-only REST patch (`destination-feeding` helper), e.g.
    `{"myMaps":"https://www.google.com/maps/d/viewer?mid=<NEW>&usp=sharing"}`.
- The KML edit does **not** touch destination entries. To push the new placemarks into the app's
  cards, the user runs **edit/destination → Update with Maps → My Maps**; that import reads the
  map and writes `restaurants/snacks/nightlife/tourism/shopping` (and sets `myMapsImported`).
- Offer a **round-trip check**: after the user confirms the import, `fetch` again and compare
  counts/names (`list`) to prove Google kept everything.

## 8. Failure modes

| Symptom | Cause / fix |
|---|---|
| `returned no KML` / HTML response | Map not public → §6C, or the URL has no `mid` |
| `HTTP 404` | Wrong/deleted `mid`, or layer `lid` invalid |
| Timeout | Google slow/private map → retry once, then use the export fallback |
| `Folder not found` | Use the exact path from `list` (`"A / B"` for nested folders) |
| Coordinates rejected | lat must be −90..90, lng −180..180 — and KML stores **lng,lat** |
| Import "too many layers" | My Maps caps a map at **10 layers**; merge layers or split maps |
| Pins in the wrong place | Check the triple order (`lng,lat,0`), not `lat,lng` |

## 9. Examples

- *"Add these 4 restaurants to the Japan map"* → read `myMaps` → `fetch` → `add` ×4 (correct
  layers, native style) → `validate` → hand back the `.kml` + §6A steps.
- *"Remove the closed ramen place from Turismo"* → `fetch` → `show --folder Turismo --name ramen`
  → `remove` → `validate` → §6B (replace the layer).
- *"What's in our Osaka map?"* → `fetch` → `list --names` / `show` → answer from the KML.

## 10. Do not

- Do not edit `destinations` documents as a shortcut for map edits.
- Do not touch production Firestore unless the user explicitly asks for production work.
- Do not commit, push, sync or deploy anything.
- Do not create a backlog ticket for a KML round-trip (data/scratch work) — only for changes to
  the skill itself.
