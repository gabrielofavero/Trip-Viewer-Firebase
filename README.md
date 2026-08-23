![alt text](https://i.imgur.com/vejNzOv.png)

# Description

A web application for planning, managing, and viewing trips, destinations, expenses, and itineraries.
# How it works

## Stack
- Vanilla web application
- Modularized HTML with partials injection for reutilization
- Modularized CSS 
- TypeScript that is compiled into ESM modularized JavaScript
- Built to be ran with Google's Firebase (Firestore for data and Authenticarion for account management. Storage and Functions disabled to stay on free tier)
- API integration with Places API
- Customized dev environment with AI tooling to speed development / debugging

## Build Instructions

```bash
# Install dependencies
npm install

# One-shot prod build (copies public/ → dist/, injects HTML partials, content-hashes assets)
npm run build

# Watch mode (dev mode — rebuilds on file changes with live reload)
npm run watch

# Clean build output
npm run clean

# Serve locally (requires Firebase CLI)
npm run serve

# Full dev mode (frontend watch + live reload, emulators, auto-open browser)
npm run dev

# Real-data dev (NO emulators — reads/writes the real Firebase project)
npm run dev:dev    # firebase use dev first (trip-viewer-dev)
npm run dev:prd    # firebase use prd first (trip-viewer-prd)
```

# Tasks

| Icon | Title       | Code | Total | Done | Cancelled | Pending |
| ---- | ----------- | ---- | ----- | ---- | --------- | ------- |
| 🐞   | Bug         | B000 | 176   | 172  | 4         | 0       |
| 🏆   | Feature     | F000 | 188   | 172  | 16        | 0       |
| 📈   | Improvement | M000 | 184   | 158  | 22        | 4       |
| ⚔️   | Epic        | E000 | 51    | 42   | 5         | 4       |

## Backlog

### High Priority

### Medium Priority

### Low Priority

- 📈 **M182:** [DEV] Kill dev env
- 📈 **M183:** [DEV] Auto run migration scripts after deployment
- 📈 **M184:** [DEV] Remove double deployment
- ⚔️ **E047:** [DEV] Implement Unit Tests
- ⚔️ **E019:** [DEV] Implement Sonarqube
- ⚔️ **E046:** [DEV] Implement Playwright
- ⚔️ **E051:** Encryption-at-Rest for Firestore & Offline JSONs
- 📈 **M171:** Safeguard unauthenticated access message

## Done

### August 2026

- 🏆 **F159:** [DEV] Add AI skill for browsing pages
- 📈 **M161:** [DEV] Improve AI skills detection
- 🏆 **F155:** Add images for each destination item
- 🐞 **B164:** Cannot add new itinerary post migration
- 📈 **M164:** Improve bulletpoints for trip cards on index
- 🏆 **F174:** Block edit trip page for unauthenticated users and non-owners
- 📈 **M165:** Improve itinerary modal
- 📈 **M166:** Improve input boxes animation and visibility
- 🏆 **F170:** Create progress bar loading (restore operations)
- 🐞 **B165:** Fix dark mode backup/restore elements and dialog visual issues
- 🏆 **F175:** Add real versioning
- 📈 **M167:** Add database profile info since auth data is not always filled
- 🐞 **B167:** Edit trip labels on customization not showing
- 🐞 **B166:** Can't save new transportations
- 🐞 **B168:** We can close the dialog on saved document and it doesnt refresh the page
- 🐞 **B169:** Account restore giving "Access Denied"
- 🐞 **B170:** Fix mismatched color preset pairs on edit trip
- 🐞 **B171:** Image dialog not transitioning when user clicks on add image button
- 📈 **M168:** [DEV] Auto restart if emulator functions failed
- 🏆 **F176:** Add custom colors on trip cards
- 📈 **M169:** [DEV] Improve cache busting
- 🏆 **F177:** Add app version on footers
- 📈 **M170:** Improve import/export icons on index
- ⚔️ **E045:** Add Maps integration into edit page (dev only poc)
  - *[🏆F172] Get place information*
  - *[🏆F173] Update integrated places*
  - *[🏆F178] Add local scraper for testing*
  - *[🏆F179] Add dev stats*
- ⚔️ **E017:** Optimize firebase operations usage
- ⚔️ **E027:** New Front-End: view.html
  - *[📈M173] Extract expenses/itinerary/destination render logic into shared mount components*
  - *[📈M174] No more iframe/embeds. Use html injection instead*
  - *[📈M175] No more need to read destination on view.html*
  - *[📈M176] Normalize visuals: header, cards, buttons, calendar should match*
- 🐞 **B174:** Issue with transportation duration card on edit trip
- 🐞 **B173:** Fix issues with index cards closing and not reopening
- 📈 **M172:** Minor visual improvements on index.html (search, order, image loading)
- 📈 **M178:** [DEV] Reorganize docs
- 📈 **M177:** Make tab selector on index mobile friendly
- ⚔️ **E016:** New Front-End: destination.html
  - *[🏆F181] New destination page look (cards, hero background, lazy load, search, tab bar)*
  - *[🏆F180] Reuse destination dialogs on itinerary view*
  - *[🐞B163] Fix color and destination image issues*
  - *[🏆F063] Allow adding multiple regions to a destination*
- 📈 **M163:** [DEV] Improve live reload functionality
- 🐞 **B175:** Fix saving issues for trips and destinations
- 🏆 **F182:** Add new dialogs into all itinerary items for view
- 📈 **M153:** Minor visual improvements on itinerary.html
- ⚔️ **E043:** Export as static web page (Offline Mode)
  - *[🏆F183] Static-mode runtime seam (render from local data.json, no Firebase SDK)*
  - *[📈M179] Build-time asset graph + static-export manifest*
  - *[🏆F184] Static export Settings dialog (type, doc, PIN, mode, title/icon)*
  - *[🏆F185] Export ZIP builder (HTML transform + manifest fetch + download)*
  - *[🏆F186] PWA customization (app title + icon in the export)*
  - *[📈M180] Self-hosted icons & web fonts (drop dead gapi)*
- 🏆 **F187:** [DEV] Add support for AI mobile push notification (ntfy)
- 📈 **M181:** Remove PIN typing need on index.html
- ⚔️ **E014:** Implementation: Shopping List
  - *[🏆F188] Group transportation by traveler (select from trip travelers instead of free text)*
  - *[🏆F071] Multi-person expenses*
- 🐞 **B176:** Order upcoming trips on index from closest to furthest from now

### July 2026

- ⚔️ **E048:** Database ovehaul
- 🐞 **B161:** Fix page issues post migration
- 📈 **M155:** Load dark/light mode as soon as page starts (no flicker)
- 📈 **M156:** Export useful dev scripts into npm run
- ⚔️ **E049:** Code translation (PT -> EN)
- ⚔️ **E050:** [DEV] Create proper dev env (emulators, data preparation scripts, easy config)
- 🏆 **F169:** Add option to import only a single trip document
- 🏆 **F171:** Add single document export
- 📈 **M157:** Expand single document import/export features by allowing all types
- 🏆 **F152:** Add firestore rules into deployment
- 📈 **M158:** Optimize user data + user permissions
- 🏆 **F153:** [DEV] Auto open dev browser on npm run dev
- 🏆 **F154:** [DEV] Add AI skills for project
- 📈 **M159:** [DEV] Improve skills behavior
- 🐞 **B162:** People-view transportation wrapper not loading on initial page load
- 📈 **M160:** [DEV] Improve emulator data backup actions
- 🏆 **F156:** Add support for legacy trips
- 🏆 **F158:** Add default color options for trips
- 🏆 **F168:** Add image for destination documents
- 🏆 **F157:** Add destination images on index.html

### June 2026

- 🐞 **B158:** When clicking on last item of transportation tab, nothing happens
- 📈 **M145:** If "long loading" pop up shows, close it if loading finishes
- 🐞 **B157:** Trip being considered as finished on last day (index only)
- 🐞 **B156:** Reservation being copied with # in it
- 🐞 **B154:** Itinerary title showing as "[object object]" on newer trips
- ⚔️ **E042:** During Trip Automations
  - *[🐞B152] Todays itinerary button not opening calendar item*
  - *[🐞B153] Today itinerary button should go to calendar item, not calendar*
  - *[🏆F149] If multiple transportations, page should load on closest next one instead of first*
  - *[🏆F150] If multiple accommodations, page should load on closest next one instead of first*
  - *[🏆F151] If multiple destinations and itinerary is set with destinations, page should load on closest next one instead of first*
- 📈 **M143:** Improve spacing for full itineray
- 🐞 **B155:** Incorrect translation key in gallery causing exception (translation module should handle without errors)
- 🏆 **F166:** Disable image uploads in edit trip page
- 🏆 **F165:** Refactor folder structure for scripts and pocs
- 📈 **M146:** Improve epic detections on readme script
- ⚔️ **E026:** Google Maps (Places API) partial implementation (Dev Only, POC)
  - *[🏆F160] Add example files (Places API, Pleper Extension)*
  - *[🏆F161] Map emoji conversion layers*
  - *[🏆F162] Python Script*
  - *[🏆F163] edit/destination.html functions for import*
  - *[🏆F164] destination.html single function for import*
- 🐞 **B160:** Fix page tag for local envs
- 📈 **M147:** Improve tags
- 🐞 **B096:** Fix Gallery module
- 📈 **M148:** Improve trip categories in index.html
- ⚔️ **E018:** New Front-End: index.html
  - *[📈M021] Improve "My Trips / Destinations / Listings" in index.html*
- ⚔️ **E034:** Frontend code refactoring
  - *[📈M106] Use require in js files + single entrypoint for scripts in html files*
  - *[📈M098] Change js folder structures to EN-US*
  - *[📈M135] Proper separation of shared elements*
  - *[📈M105] Remove CONFIG and reduce use of global variables*
  - *[📈M058] Modularize CSS files to reduce redundancy*
  - *[📈M046] Clean unused properties in application CSS*
  - *[📈M149] Better file/folder architecture + separation of concerns*
  - *[📈M150] All functions and variables in EN-US*
  - *[📈M151] Better folder structure for js files*
  - *[📈M152] All ids, classes and html comments in EN-US (+ better naming)*
- 🏆 **F167:** Add dev mode for easy debugging
- ⚔️ **E044:** New Front-End: edit pages
- 📈 **M162:** Minor visual improvements on expenses.html

### May 2026

- 🐞 **B159:** Fix travelers saving action

### February 2026

- 🏆 **F148:** Add environment tag on page title if running locally
- 🐞 **B151:** Visibility change causing exception for index
- 🐞 **B127:** Document changes not working
- 📈 **M144:** Minor visibility improvements for view page
- 🐞 **B150:** View page for listing not working
- 🐞 **B149:** View page for destinations not working
- 🐞 **B147:** Index notification bar not showing for active trip and not opening current

### January 2026

- 🐞 **B123:** Main try catchs for pages are failing because main is not async
- 🏆 **F146:** Add drawer for itinerary page when on mobile
- 🏆 **F145:** Make itinerary page embed to view page
- 🏆 **F147:** Add company name for transportation in itinerary page
- 🐞 **B146:** Destination description not trimming on edit
- 🐞 **B145:** Destination description language not loading properly on add
- 🐞 **B144:** Duplicated pin keydown functionality causing crashes
- 🏆 **F144:** Add git sync script (master/develop branches)
- 🐞 **B143:** Inner itinerary message for edit page closes on confirm if no data
- 🏆 **F143:** Add keyboard navigation for message modal actions
- 📈 **M142:** Increase EMBED_TIMEOUT from 4000 to 10000 milliseconds
- 📈 **M141:** Refactor _getPageURL to remove visibility parameter
- 🐞 **B142:** View visibility not auto-switching on embed destination visibility change
- 🐞 **B141:** Custom itinerary title not showing
- 🐞 **B140:** Edit button being shown on view page
- 📈 **M140:** If no itinerary, do not show title on export
- 📈 **M136:** Improve Notes export for itinerary
- 📈 **M139:** Improve print export for itinerary
- 🐞 **B138:** Itinerary should only stop loading when content is loaded
- 🐞 **B136:** Destination edit modules showing every time
- 📈 **M138:** Improve dark mode loading time
- 📈 **M137:** Improve dark mode detection
- 🐞 **B139:** Destination custom colors not working when detached but with trip id
- 🐞 **B137:** Destination should only stop loading when content is loaded
- 🏆 **F142:** Link full itinerary with button in view
- ⚔️ **E041:** Full Itinerary page
  - *[🏆F134] Create HTML and CSS*
  - *[🏆F135] Implement PIN logic*
  - *[🏆F136] Read and format data from itinerary*
  - *[🏆F137] Print / PDF Export*
  - *[🏆F138] Notes export*
- 🏆 **F141:** Plan destination from destination page
- 🏆 **F140:** Fetch trip data instead of relying on localhost for destination page
- 🐞 **B135:** Destination minor fixes
- 🏆 **F139:** Only display trip related info on destination if linked
- 🏆 **F132:** Add pre-commit actions (formatting and read-me)
- 🏆 **F133:** Add setup script
- ⚔️ **E040:** Integrate Expenses page directly into view
  - *[🏆F127] Add expenses category in view (+ lightbox)*
  - *[📈M134] Modify css for view resolution*
  - *[🏆F128] Make embed (lightbox) logic generic*
  - *[🏆F129] Adjust expenses iframe height according to content*
  - *[🏆F130] Pin back and forth for expenses lighbox*
  - *[🏆F131] Visibility back forth for expenses lighbox*
  - *[🐞B134] Fix visibility issues for expenses page*
- 🐞 **B133:** Single trip destination not loading
- 📈 **M133:** Add color indicators for when a filter-sort destination button is active
- 🐞 **B126:** Double filter selected on mobile destination drawer
- 🏆 **F121:** Add share button to destination page (when not on lightbox)
- 🐞 **B129:** Expenses tab clipping when on mobile
- 📈 **M129:** Improve expenses responsiviness for tablets
- 🐞 **B131:** Cannot create new trip
- 🐞 **B132:** Wrong destination secondary color for default color
- 🐞 **B130:** Wrong theme color secondary being shown when on light mode for view page
- 🏆 **F122:** Redirect destination to destination page, not view
- 🐞 **B128:** Transportation select not loading existing data properly if option is not flight
- 🐞 **B113:** Function to reload itinerary breaking on edit trip page
- 🐞 **B122:** Multiple values of same transportation/accommodation on edit trip itinerary select
- 🏆 **F125:** Create readme script for formatting and utils
- 📈 **M128:** Improve deploy management and cache busting
- 🐞 **B121:** Fix timezone issues
- 📈 **M127:** Show traveler destinations as checkbox, not select
- 🏆 **F124:** Add destination title to destination page
- 📈 **M132:** Add eurostar transportation
- 🐞 **B125:** Sort button being shown when there is only 1 destination
- 🐞 **B124:** Add button being show in destination page
- 🏆 **F123:** Add planned date and time in destination
- ⚔️ **E039:** Destinations Overhaul
  - *[🏆F117] Adjust destination object strucute (migration)*
  - *[🏆F118] Adjust destination object strucute (pages)*
  - *[🏆F119] Refactor destination page to fetch data from firestore / configs*
  - *[🏆F120] Improve how embed is loaded + tiktok photo support + fallback for errors*
  - *[🏆F114] Add option to quickly edit / delete destination on main page (if owner)*
  - *[🏆F126] Add option to quickly create destination on main page (if owner)*
- 🐞 **B120:** Fix destinos-select options order
- ⚔️ **E038:** Add filtering and sorting options to destinations page

### December 2025

- ⚔️ **E036:** Expenses Overhaul
  - *[🏆F108] Add expense type on edit trip page + saving*
  - *[🏆F110] Add traveler name into expense name*
  - *[🐞B118] Expenses dynamic icons not showing*
  - *[🐞B119] Expenses values sometimes breaking lines*
  - *[🏆F109] Add custom tab on expenses page*
  - *[🐞B116] Fix expenses currency API*
- 🐞 **B117:** Translation issue on expenses page
- 🏆 **F115:** Put visual indication if destination is planned for the trip*
- 🐞 **B110:** Backup and Restore functions not working
- 📈 **M122:** Put each expense type as draggable
- 🐞 **B115:** Change detection not working for edit pages
- 📈 **M121:** Add "transportation" expense type
- 📈 **M092:** Title in dark mode with more highlight
- 🐞 **B114:** When moving destinations, content visibility and toggle are not auto-changed
- 🐞 **B102:** When moving destinations, description view does not reload
- 📈 **M125:** Improve sensitive box visibility
- 🐞 **B108:** When returning a destination, view page auto scrolls up
- 🐞 **B112:** Destination select animation not working
- 🐞 **B111:** Destination data mixing between categories
- 🐞 **B109:** Traveler-exclusive itinerary not working
- ⚔️ **E037:** Reduce Firestore document calls
  - *[🏆F111] Create migration for adding document/trip/listing minimal data into user data*
  - *[📈M123] Reduce document calls for index*
  - *[📈M130] Reduce document calls for edit pages*
  - *[🏆F113] Update set method to be in batches for Firestore (either updates everything or nothing)*
  - *[🏆F112] Adapt backup and restore functions with new user data structure*
- 🐞 **B103:** When dragging transportations and accommodations, new transportation button glitches out
- 🐞 **B105:** Can't add people into itinerary
- 🐞 **B106:** PIN being exposed on logs
- 🐞 **B107:** "Last updated on" not being properly translated on index
- 🐞 **B104:** Missing type causes select to show previous destination.html data
- 🐞 **B099:** Fix Expenses update / loading
- 🐞 **B101:** Fix Backup/Restore functions
- 🐞 **B100:** sensitive-box not animating when inside of accommodations
- 🏆 **F107:** Disable image uploads / Firebase Storage (free plan limitation)
- 📈 **M120:** Add Vueling company logo
- 📈 **M124:** Make edit-trip transportation select to fetch from json file

### November 2025

- ⚔️ **E035:** Protect sensitive trip data (reservation codes)
  - *[📈M131] Remove all mentions of editors and sharing options (legacy)*
  - *[🏆F100] Move HTML elements from expenses into general data (pin)*
  - *[🏆F101] Change how set system works so that it can record protected data*
  - *[🏆F102] Implement new "protected" document logic in js*
  - *[📈M126] Remove can-edit logic*
  - *[🐞B098] Fields validation and custom checks not working on sets (edit/\*.html)*
  - *[🏆F103] Create database migrations for new structures*
  - *[🐞B076] Import backup function not getting sensitive data*
  - *[🏆F104] Create Import/Export buttons account settings*
  - *[🏆F105] Add PIN component to view.html and senstive data box (with eye icon)*
  - *[🏆F106] Adapt existing trip data loading for new structure (view.html)*
- 📈 **M118:** Improve config/async load of main data
- 🐞 **B095:** Destination Descriptions getting mixed up
- 📈 **M090:** Load logo inside pre loader
- 🏆 **F098:** Include traveler names in view.html (Itinerary)
- 🏆 **F096:** Add ID into travelers
- 🏆 **F099:** Replace all selects with custom selects
- 📈 **M117:** Redirect map page to destination.html
- 📈 **M091:** Refactor destionations.html custom select to be a component
- 🏆 **F078:** Ability to reorder transportation / accommodations
- 🐞 **B092:** Pill colors not loading when switching calendar page
- 📈 **M115:** Replace set.json with native functions
- 🐞 **B094:** Edit Trip page not going to home after deleting a trip
- 🏆 **F060:** Allow switching between destination categories within a page
- 🐞 **B093:** Trip without itinerary data is not loading on edit trip pages
- 📈 **M116:** Replace call-sync-order.json with native functions
- 📈 **M113:** Update all link validations from pop-ups to toasts.
- 🐞 **B091:** fields.js and destination modal are not being translated
- 📈 **M107:** Edit "Confirm" at accommodation images to return to previous instead of closing pop-up
- 🐞 **B090:** Itinerary title now showing if single destination (edit-trip)

### October 2025

- 🐞 **B089:** Fix calendar title and loading issues
- 📈 **M112:** Disable calendar navigation buttons if nothing present on following month
- 🐞 **B088:** Fix date calculation when in daylight saving time
- 🐞 **B087:** Fix Attributions
- 🐞 **B086:** Fix Calendar navigation being hidden after clicking on it
- 🐞 **B085:** Fix destination default price being shown without translation
- 🐞 **B084:** Share social message fix
- 📈 **M111:** Itinerary titles now being translated
- 🐞 **B083:** Transportation title fix
- 🐞 **B082:** View transportation swiper fix
- 📈 **M110:** Edit trip auto color improvement
- 🐞 **B081:** Edit Destination move fix
- 🐞 **B080:** Edit Trip Description fixes
- 🐞 **B079:** Edit Destination fixes

### August 2025

- 📈 **M109:** Make highlights display 2/2 when screen width is tablet/mobile
- 🐞 **B077:** Daily schedule not scrolling to table
- 🐞 **B078:** App version not loading due to CONFIG async nature

### July 2025

- 🏆 **F094:** Multi-language description (destinations)
- 🏆 **F097:** Auto suggest automations for itinerary in edit/trip.html
- 🏆 **F095:** Include traveler names in edit/trip.html (General / Itinerary)

### June 2025

- 🏆 **F072:** Multi-person tickets
- 🏆 **F086:** Account Export All + Import all (Functions Only)
- ⚔️ **E033:** Create language system + EN-US

### May 2025

- 🏆 **F083:** Cache Busting
- 🏆 **F082:** Versioning
- ❗️🐞 **B075:** Timezone implementation causes issues
  - *Saving dates (still saving in firestore date)*
  - *Countdown*
- 🐞 **B074:** Menu "x" becomes invisible in light mode
- 🐞 **B073:** Timezone implementation causes conversion issues

### April 2025

- 🐞 **B072:** Gallery does not respect dark mode
- 📈 **M103:** Improve save message on edit pages
- 📈 **M094:** Fix scrolls (destination checkboxes in edit)
- 🏆 **F080:** Multiple images for the same accommodation
- ⚔️ **E029:** Refactor storage methods
- Test accommodation
- Test Gallery
- 📈 **M099:** Implement Toast on invalid link in edit pages
- 🐞 **B071:** Shift does not auto-update when schedule time is imported
- 🐞 **B070:** Itinerary calendar bullets not displaying correctly
- 🐞 **B069:** Destination does not show site icon if no maps link
- 🐞 **B068:** Trip save does not detect changes when only itinerary is edited
- 🐞 **B024:** Menu button appears between 1199px and 993px width in view.html
- 🐞 **B023:** Dark-mode adjustment
- 🏆 **F079:** Tab system for transports
- 📈 **M042:** Improve save on edit pages to not call firebase if no changes
- 🐞 **B022:** Fix error where not all hrefs go to categories (edit screens)
- 🐞 **B067:** Fixes in loading expenses and editing
- 🏆 **F061:** Rename all html pages to English names
- 🏆 **F077:** Confirm leaving page if there are changes

### March 2025

- 📈 **M093:** Improve automatic date detection
- 📈 **M088:** Improve copy-paste feature with toast
- 🏆 **F075:** Create toast notification
- 🏆 **F076:** Swiper with arrows in desktop mode
- 🏆 **F074:** Copy-paste feature for reservation codes
- 🏆 **F073:** "Today's Schedule" on trip cover
- 🏆 **F051:** Instagram Reels embed in destinations
- 🐞 **B058:** Current trip showing as previous (index.html)
- 🏆 **F068:** "Current Trip" top bar
- 🐞 **B062:** Fix tiktok embed
- 📈 **M095:** Items in index.html open in new tab
- 📈 **M020:** More automated transportation module
- 🐞 **B066:** Fix hiding lineup items
- 🐞 **B065:** Fix update of Dynamic Select
- 🐞 **B064:** Extra destination when moving destination

### February 2025

- 🐞 **B061:** Adjust dark mode persistence
- 🐞 **B057:** Dark mode fixes
- 🐞 **B063:** Share button fixes
- 🐞 **B060:** Timezone fix

### January 2025

- 🏆 **F066:** Switch Google Login to user-password login
- 🏆 **F062:** Allow customizing trip to only show in dark or light mode

### October 2024

- 🐞 **B056:** Dynamic Select errors:
  - *Error when trying to transfer destination*;
  - *Sorting error (not ascending)*
  - *Too many refreshes causing slow initial load*
- 🐞 **B055:** Hotfixes
  - *Error saving trip (lineup module called even after discontinued)*
  - *Titles and icons in Expenses not appearing*
  - *Error loading sortable.min.js*
  - *Customization switches not loading correctly*
- 🏆 **F064:** Disable zoom in webview
- 📈 **M085:** Itinerary improvement
  - *Automate start and end times*
  - *Better display of associated item*
- 🐞 **B059:** Slow load in index.html not showing elements correctly

### September 2024

- 📈 **M071:** Include reservation code in Accommodations
- 📈 **M073:** If only one destination, rename view.html from "destinations" to destination name
- 🐞 **B049:** Itinerary in view.html does not show start time if end is missing
- 🏆 **F059:** Allow direct viewing of destinations (without listings)
- 🏆 **F057:** Isolated destination view in trip page (rename trip page to view)
- 📈 **M023:** Drag Accordions (Itinerary)
- 📈 **M075:** Adjustments index.html
  - *Remove "View Trip"*
  - *Add "Account Settings" + Different animations for each route*
  - *Adjust menu text width to align icons*
- 📈 **M079:** Login by redirect
- 📈 **M078:** Checkbox "Change activity name to ***" in "Associate Item"
- 📈 **M074:** Itinerary switch button (trip.html)
- 🐞 **B051:** Fix disabled destination not auto-deleting empty template
- 📈 **M080:** Destination switch button (edit/trip.html)
- 📈 **M081:** Reimplement Dynamic Select for easier maintenance
- 📈 **M035:** Dynamic Region Select in edit-destination.html is general, not by category
- 🐞 **B047:** Deleting item in edit page breaks "Other" region listener
- 📈 **M066:** Auto logo size in view.html
- 🐞 **B053:** Errors in get and set functions from database
- 🐞 **B050:** Destination list in "destination.html" not sorting correctly after item "?"
- 🐞 **B052:** Cannot disable expenses in trip.html
- 📈 **M061:** Replace delete modal in edit page with native message
- 📈 **M082:** Improvements and fixes pack 09/24 (pre prod deploy)
  - *View Destination on save (edit/trip.html)*
  - *Trip data uncentered (view.html)*
  - *Accommodation responsiveness fix (view.html)*
  - *Value not showing in new destination (edit/trip.html)*
  - *Cancel does not return to home (edit/trip.html)*
  - *Handle trips and trip to ignore non-existent destination*
  - *Existing listing not loading (edit/list.html)*
  - *First set not working due to "User Not Authenticated" (edit/trip.html)*
- 📈 **M084:** Better display of destination checkboxes (trip.html and edit/list.html)
- 📈 **M083:** Date uses select based on trip period (trip.html)
- 🐞 **B054:** Fix lineup display (trip.html)

### August 2024

- 📈 **M070:** Increase list size in index.html + reorder for nearest trips first
- 🏆 **F058:** Add previous trips item in index.html
- 🐞 **B048:** Itinerary not loading correctly in dark mode

### July 2024

- 🐞 **B046:** Hot fixes pack 07/2024
  - *Popup login on new domain (temporary)*
  - *Fix destination display errors*
  - *Fix errors creating new trips*

### June 2024

- 🐞 **B042:** Fix listeners in trip (start, end, reloadProgramacao) not working
- 📈 **M019:** More customizable itinerary module
  - *Include Time*
  - *Automate Title*
  - *Dynamic item quantity*
  - *New design for daily itinerary in view.html*
  - *Open associated itinerary item in view.html (destination, accommodation or transportation)*
- 📈 **M048:** Better indicator for multiple cities in itinerary calendar
- 🐞 **B043:** Incorrect hero in dark mode + disproportionate margins in view.html
- 📈 **M022:** Improve calendar in view.html to avoid duplicate borders
- 🐞 **B044:** Edit screen fixes (simplified transportation, trip without itinerary and end listener)
- 🐞 **B045:** Dark Mode fixes (Logo in view.html and background image in index.html)
- 📈 **M056:** File reorganization + local config files (remove unnecessary Firestore call)
- 📈 **M057:** Improve itinerary calendar to include multiple colors
- 🏆 **F050:** Create API / Cloud Function to convert TikTok mobile link to desktop link
- 📈 **M059:** Backend improvements: Support functions (Cors, Users, get/set data) and formatting
- 🏆 **F056:** Check for changes on edit pages
- 📈 **M062:** Load config inside main
- 📈 **M060:** Improve set methods in edit
- ⚔️ **E015:** Implementation: Expenses
  - *Front-End Template*
  - *API for real-time tourism exchange rates*
  - *Add value field in transportation and Accommodation (Edit Trip)*
  - *Add Expenses category in Edit Trip*
    - *Pre-trip and During-trip Expenses*
    - *Separate by category*
    - *Auto import from transportation and Accommodation (listener if changed on either side)*
  - *Apply template in trip page*
- 🐞 **B025:** Fix switching visibility in lightbox not persisting after exit
- 📈 **M063:** Firebase performance improvement (CLI version update)
- 📈 **M064:** Error message handling adjustment
- 📈 **M065:** Expenses now show currency in all table values
- 📈 **M067:** Improvements to pages using lightbox (expenses.html and destination.html)
- *Pages loaded outside lightbox will not show back button*
- *Conditional page redirection*
- 📈 **M068:** Improve accordions and media in destination.html
- *Page now only shows one accordion at a time*
- *Media no longer overlap (simultaneous playback)*
- ⚔️ **E022:** Migration functions (Cloud Functions)
- ⚔️ **E013:** Project Migration
  - *Create dev and prd environments*
  - *Create develop branch*
  - *Deprecate trip-viewer-tcc (redirect to prd)*
  - *Create custom domain for prd*

### May 2024

- 📈 **M028:** Improve share function to show adapted text (trip/listing)
- 🐞 **B029:** Fix lists in index.html showing "No data" even when loading not finished
- 🏆 **F048:** Dynamic Select for "Value" in edit-destination.html
- 📈 **M029:** Optimize destination.html to get only necessary data from localStorage
- 🐞 **B030:** Fix errors in new trips in edit-trip.html
- 🏆 **F049:** Dynamic Select for "Region" in edit-destination.html
- 📈 **M024:** Improve: if user deletes all items in a category, it is automatically disabled
- ⚔️ **E020:** Create accommodation view box in view.html
- 📈 **M032:** When a new category item is added, category accordions are closed
- 🐞 **B032:** Fix edit pages not displaying/importing dynamic select data correctly
- 🐞 **B033:** Fix users freely accessing another user's edit
  - *System (firestore rules) already blocked saving, but front-end should pre-check*
- 🐞 **B034:** Fix new items with dynamic selects (Gallery, Lineup, Region) not loading select
- 📈 **M038:** Improve pop-up messages to include both common (closable) and error messages
- 🏆 **F053:** Implement Firestore and Firestore Rules to enable/disable user registration
- 📈 **M039:** Improve open/close user registration system to implement custom message
- 🏆 **F045:** Create custom error message for image upload
- 📈 **M030:** Instead of duration field in trip.html, have timezone field and calculate duration automatically
- 🐞 **B036:** Fix transportation module automations in trip.html not loading on first load
- 📈 **M033:** Add buttons in message modals
  - *Info closes and error goes to home*
- 📈 **M040:** Validate Link and Embed input in edit-destination.html
- 📈 **M017:** Input validation in edit pages
  - *Emojis, Generic Links, Image Links, Playlist Links, Video Links*
- 📈 **M031:** Improve zoom option on accommodation card in view.html
- 📈 **M026:** New "New" icon in destination.html
- 📈 **M044:** Improve spacing in edit pages
- ⚔️ **E023:** Destinations v1.1
- 📈 **M043:** Visual improvement in destination.html and destinations.js
- 🐞 **B039:** Fix function applying custom colors to classes not working more than once for some properties
- 🐞 **B040:** Remove accordion drag function
  - *Did not work as expected on Desktop and not on Mobile*
  - *Reimplement later*
- 🐞 **B035:** Fix itinerary in trip.html not showing full title on load
- 📈 **M050:** Improve destinations module (edit)
  - *Switch selects to checkboxes*
  - *Search function*
- 📈 **M049:** Add dark-mode for accommodation/gallery zoom
- 🏆 **F052:** Create attributions button in footer that puts all credits in a modal
- 🐞 **B027:** Fix destination data not saving if category is disabled
- 📈 **M051:** Reorganize destinations to store data in objects
- 📈 **M052:** Reduce media box size on mobile in destination page for better desktop view
- 🐞 **B038:** Fix custom error message not showing on list load (index.html)
- 🐞 **B037:** Visual fixes in edit pages
  - Scroll bar not clickable
  - Save button not accessible on mobile (browser)
- 🐞 **B041:** Fix trip save returning NaN in itinerary date
  - *Full title only appears when user edits input (listener)*
- 📈 **M053:** Allow more than one location for same itinerary day
- 🏆 **F054:** Implement ID system for transportation and accommodation, to be used as reference in itinerary
- 📈 **M036:** Improve destination CSS so table does not break at zooms below 100%
- 📈 **M108:** Change USER_DATA in index to only get necessary data

### April 2024

- 🐞 **B021:** Fix public trips showing as private (Firestore Rules)
- 📈 **M013:** Upload block / Security improvement
  - *Create permissions system in database and storage rules*
  - *Interactive HTML display based on permission*
  - *Smart upload system, deleting unused images*
  - *Insert custom images by page (accommodations and gallery for edit-trip)*
  - *Adjust trip page to receive new image structure*
- 📈 **M014:** Trip improvements
  - *Dynamic selects for user to choose from already registered data (Gallery and Lineup)*
  - *Automations to facilitate data entry and viewing*
- 📈 **M015:** Improve Destinations in view.html
  - *If odd number of categories, center items (better desktop visibility)*
  - *If only destinations for one city and one category, hide title*
- 🐞 **B020:** Fix loading sometimes loading forever
- 🐞 **B019:** Fix delete button size in edit-x.html
- ⚔️ **E012:** Create transportation view box in view.html
- 🏆 **F041:** Create share button for view.html
- 📈 **M016:** Refactor: use getID method and optimize edit files
- 🏆 **F042:** Create customizable currency for Destinations
- 📈 **M025:** New "New" icon in edit-destination.html
- 🐞❗️**B028:** Fix list loading
- 🐞 **B026:** Fix loading in trips not getting custom color
  - Applied, but color only shows in loadings after initial
  - Most loading is to get Firestore data. Only with them can you get custom color
- 📈 **M027:** Improve responsiveness of trip bars in index.html

### March 2024

- 🐞 **B018:** Fix login bug in safari (probably related to animation in index)
- 🏆 **F038:** Create option to drag accordions (Desktop)
- 🐞 **B017:** Fix ":" when title not filled
- 🐞 **B016:** Fix lineup loading issue
- 📈 **M011:** Performance improvement in destination.html
  - *Restrict embed loading to only when accordion is open*
- 🐞 **B015:** TripViewer icon in destination.html going to home and inside lightbox
- 📈 **M012:** Better organization of JavaScript related to destination.html
- 🐞 **B014:** Fix CSS errors caused by unifying edit CSSs
- 🏆 **F039:** Create triple buttons in modal when saving
  - *Re-edit (no background)*
  - *Home (gray)*
  - *View (purple)*
- 🏆 **F040:** Create "Private Document" message
- 🐞 **B013:** Fix embeds in destination.html out of order

### February 2024

- 📈 **M006:** Minor mobile front improvement
- 🏆 **F032:** Create way to delete destinations / trips
- 🏆 **F033:** Create Gallery Module
- 🐞 **B012:** Fix data loss on trip load when user does not keep data active
- 🐞 **B011:** Adjust night mode position in trip and edit-destination
- 🏆 **F034:** Create back arrow in edit-trip and edit-destination
- 🐞 **B010:** Fix modal title formatting
- 📈 **M007:** Increased transparency in mobile background
- 📈 **M008:** Improve Re-edit button not returning home if save error
- ⚔️ **E010:** General testing and bug fixes
- 📈 **M009:** Condense trip and edit-destination CSS into single CSS (editar.css and editar-dark.css)
- 📈 **M010:** Input validation in Add Destination (Remove already filled)
- ⚔️ **E011:** Rename "Passeios" to "Destinations"
- 🐞 **B009:** transportation link should not be required
- 🐞 **B008:** transportation image not loading correctly (Example: Lolla 2024)
- 🏆 **F035:** Create Destination List function
- 🏆 **F036:** Migrate Lineup to Trips (Remove from Destinations)
- 🐞 **B007:** Image title also changes in accordion
- 🏆 **F037:** Create animations in index.html

### January 2024

- ⚔️ **E009:** Migrate Project to Spark Plan
- 🏆 **F027:** Create upload size limit + backend method for more security
- 🐞 **B006:** Fix Loading in index finishing before loading trip/destination list
- 🏆 **F028:** Option to provide image link instead of upload
- 🏆 **F029:** Support for customizable links
- 🏆 **F030:** Create Set for customizable links
- 🏆 **F031:** Create active/inactive mode for links, images and colors
  - *So user does not lose data if only wants to change display*
- 📈 **M004:** Reduce dark mode CSS
- 📈 **M005:** Edit profile box in index to handle very long strings
- 🐞 **B005:** Fix Links to home
  - *Only tripviewer text is clickable on some pages. Missing logo*

### December 2023

- 🐞 **B004:** Fix transportation select position in trip
- 🏆 **F021:** Create front-end functions for editing trips and destinations
- 🏆 **F022:** Create image system
- 🏆 **F023:** Share trips via button in view.html
- 🏆 **F024:** Get images in view.html
- 🏆 **F025:** Block editing of trips and destinations
- 🏆 **F026:** Implement interactive Night Mode for user
- 📈 **M003:** Improve linking and validating backend functions for editing trips and destinations
- ⚔️ **E007:** Simplify DB structure
- ⚔️ **E008:** Reimplement application security

### November 2023

- 📈 **M002:** Automate user-defined theme colors
- 🐞 **B003:** Fix dark mode bugs
- 🏆 **F013:** Create Login Page
- 🏆 **F014:** Create Logged-in User Page
- 🏆 **F015:** Share trips via link
  - *URL of view.html and button in index.html*
- 🏆 **F016:** "My Trips" feature
- 🏆 **F017:** Edit/create trips page
- 🏆 **F018:** Edit/create destinations page
- 🏆 **F019:** Settings page
- 🏆 **F020:** Front-end functions for index.html

### October 2023

- 🏆 **F003:** Migrate 'transportation' to Firestore
- 🏆 **F004:** Create transportation/accommodation artwork
- 🏆 **F005:** Migrate config JSONs to Firestore
- 🏆 **F006:** Migrate 'Accommodation' to Firestore
- 📈 **M001:** Remove discontinued methods
- 🏆 **F007:** Migrate 'Summary' (Keypoints) to Firestore
- 🏆 **F008:** Handle database connection failure
- 🏆 **F009:** Add dynamic calendar (swiper)
- 🐞 **B002:** Various bug fixes
- 🏆 **F010:** Interactive Logo based on user-defined color
- 🏆 **F011:** Skeleton for Home Page (Login)
- 🐞 **B001:** Fix dark mode bugs
- 🏆 **F012:** Add authentication to backend and frontend

### September 2023

- 🏆 **F001:** Migrate 'Destinations' to Firestore
- 🏆 **F002:** Migrate 'Itinerary' to Firestore

### Previously

- ⚔️ **E001:** Create project Git
- ⚔️ **E002:** Create Firebase project
- ⚔️ **E003:** Create Firestore database
- ⚔️ **E004:** Import static project HTML, CSS, JS
- ⚔️ **E005:** Backend structure via Cloud Functions (NodeJS with TypeScript)
- ⚔️ **E006:** Main backend read functions (get.ts)

### Duplicated (Already Done)

- 🏆 **F047:** Firebase Firestore Rules in Front-End
- ⚔️ **E030:** Account Import/Export
  - 🏆 **F088:** *Export Selected (Functions Only)*
  - 🏆 **F089:** *Import Selected (Functions Only)*
  - 🏆 **F090:** *Account Import/Export: Interface*
- 📈 **M086:** Improved error pop-up
- 📈 **M154:** Reduce firestore calls on index
- ⚔️ **E028:** Places API Text Search

### Discarded

- 🐞 **B031:** Fix gallery image from twitter opening with wrong proportions in GLightbox
- 📈 **M072:** Improve automatic date adjustment in edit trips
- 📈 **M076:** Automate PRD to DEV data restore (weekly) + Manual Function
- 📈 **M077:** Weekly PRD Backups + oldest backup exclusion (3 weeks only)
- ⚔️ **E031:** Document History
  - 🏆 **F084:** Store copies within the document itself
  - 🏆 **F091:** Restore function + compatibility check
  - 🏆 **F092:** Document History: Interface
- ⚔️ **E032:** Local export of trips
  - 🏆 **F085:** Create printable trip/destination page
  - 🏆 **F093:** Automatic PDF export + Interface
- 🏆 **F087:** Single load of destinations
- 📈 **M096:** Mobile and webview adjustments
- 📈 **M097:** Itinerary automations (edit/trip.html)
- 🏆 **F069:** Tab for selecting destinations within the page
- 🏆 **F065:** Show if accommodation was prepaid or not
- ⚔️ **E021:** Implementation: Lineup in view.html
  - *Instead of being in Destinations, it's a new category*
  - *Displays list of artists as a festival lineup (Example: RiR site)*
  - *Interactive schedule board (Example: Lollapalooza App)*
  - *Lineup and Schedules separated by Tab similar to expenses.html*
  - *Select with festival days, but default is general*
  - *Editing similar to itinerary, but date is customizable*
- 🏆 **F046:** Create reordering options for destinations
  - *On edit and trip pages*
  - *Order by rating and by name (↑↓)*
- 📈 **M104:** All external links should open via window.open
- 📈 **M087:** Destination loads everything immediately
- 🏆 **F070:** Add to calendar component
- 📈 **M100:** Storage size limit for document (10MB)
- 📈 **M101:** Put Swiper inside accommodation image box when accommodation has more than one image
- 📈 **M102:** Instead of opening accommodation/transportation pop-up, scroll page to position and auto-click item
- ⚔️ **E025:** iOS and Android implementation
- 🏆 **F043:** Create customizable keypoints
- 📈 **M018:** Improve centering of demo-box element on edit screens in tablet mode
- 🏆 **F044:** Create animations throughout the site
- 📈 **M034:** Move Back button (←) to left corner of screen in index.html
- 📈 **M037:** Increase spacing in destination boxes in view.html
- 📈 **M041:** Improve validation of missing fields in edit pages to show item title (when available)
- 📈 **M045:** Show rating inside edit-destinations accordion and order by Rating + title
- 📈 **M054:** Improve getJs functions for more scenarios
- 🏆 **F055:** Implement getKs function + Rename functions for clarity
- 📈 **M055:** Improve all dark mode changes to be applied via js
- 📈 **M069:** Loading timer disabled by default
- 📈 **M047:** Change modal messages to bottomsheet messages
- 📈 **M089:** Replace color values with environment variables in CSS
- 🏆 **F067:** OneDrive integration
- 🏆 **F081:** Embed map when there is no video in the destination
- 📈 **M114:** Make button / select outlines theme color (view.html)
- 🐞 **B097:** Fix Image upload module
- 🏆 **F116:** Destinations data refactoring
- 📈 **M119:** Instead of pop-ups, scroll to item (if not destination)
- 🐞 **B148:** Full itinerary page giving multiple blank pages
- ⚔️ **E024:** Migrate project to React
- 🐞 **B172:** Fix error when switching a destination category