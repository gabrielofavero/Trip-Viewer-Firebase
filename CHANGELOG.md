# Changelog

## [2.28.0] - 2026-08-29

- 🐞 **B201:** Hide the "Import Account" settings button on production (real Firebase — deployed or `dev:prd`); it stays available while connected to the local emulators
- 🐞 **B202:** Fix export triggering a spurious "Leave site?" prompt — suspend the refresh/close guard during the programmatic download click (Chrome fires `beforeunload` on download init), while keeping it active during the actual data loading
- ⚔️ **E053:** Maps import/enrichment overhaul

## [2.27.1] - 2026-08-26

- 🐞 **B198:** Hide Local import source on PRD
- 🏆 **F198:** Add check animation for edit mobile saving
- 🐞 **B199:** Minor fixes for Maps integrations
- 🐞 **B200:** Fix error on creating itinerary item

## [2.27.0] - 2026-08-26

- 🐞 **B194:** Tab bar icons too small on mobile
- 📈 **M208:** Static export picker: searchable cards, mobile dialog fix
- 📈 **M209:** Visual polish: unify tab bar pills
- 📈 **M210:** Expenses copy: dual WhatsApp/Notes format with values
- 🐞 **B195:** Fix static export mobile rendering and encoding
- 📈 **M211:** Static export ZIP uses chosen app name
- 📈 **M212:** Backlog skill: no ticket re-adds, sub-taskless epics
- 📈 **M213:** [DEV] Add implementation-plans skill
- 📈 **M214:** Shorten long backlog ticket titles
- ⚔️ **E052:** Import from MyMaps
- 🏆 **F197:** Copy accommodation name and address
- 📈 **M215:** My Maps import review dialog polish
- 🐞 **B196:** [DEV] Fix dev:prd
- 🐞 **B197:** Login input not matching button size on mobile
- 📈 **M216:** My Maps import: manual KML download link

## [2.26.0] - 2026-08-25

- 🐞 **B182:** Auto dark mode: fix UTC->local hour bug and switch to timezone-based sunrise/sunset detection (offline, session-cached)
- 🐞 **B183:** Footer not reaching the bottom of the page on mobile (view page)
- 📈 **M191:** Auto-hide top bar when scrolling down on view page (immersive PWA reading)
- 🐞 **B184:** Fix visual quality in F192/F194 import dialogs (dark mode, plane icon, import button styling) + F065 payment status color
- 📈 **M192:** Expenses: people view as a select (View-by "People" option) instead of an extra tab; hide it for a single traveler or when all expenses are unspecified; drop the non-specified bucket from the per-person breakdown
- 🐞 **B185:** Fix transportation card not showing departure/arrival locations (points key mismatch) + soften flight line in dark mode
- 🐞 **B186:** Save-success dialog buttons (Edit/Home/View) cropped on mobile edit pages — make the dialog full-screen on mobile with the actions stacked full-width at the bottom (desktop unchanged)
- 📈 **M193:** Expenses (view page): drop the container-level auto-scroll so the page grows with content; a single category box scrolls internally only when it has many items
- 📈 **M194:** Minor front-end adjustments: left-align edit-page time inputs (transportation + accommodation), move accommodation payment status to the bottom of the view card, neutral border on destination dialog link buttons
- 📈 **M195:** Index: replace the greeting content with the account card while on the Settings tab (single box, content fades in on tab switch instead of two duplicate boxes)
- 🏆 **F195:** Add a dedicated "Active trips" section on top of the index when a trip is currently happening (was merged into Upcoming before)
- 📈 **M196:** View page: replace the dominant/wide-glowing card shadows with a light, diffuse shadow (count-box, expenses lock card + expenses card, transport/hotel/flight/itinerary boxes, tabs, testimonial items) in light and dark mode
- 📈 **M197:** [DEV] Make npm run dev and dev:prd launch kill-ports instead of just checking ports
- 📈 **M198:** Index: style the "Active trips" section with the same neutral styling as Upcoming/Finished (no green accent)
- 📈 **M199:** [DEV] Add a color rule to the CSS skill + project instructions: use only theme/neutral colors, and request user authorization before adding any non-theme/non-neutral color
- 📈 **M200:** Settings (Advanced): block page refresh/close with a confirmation prompt while a backup, restore, document import/export, or static-export operation is in progress; on account import, drop the loading spinner shown over the native file picker's backdrop blur (progress starts only after a file is selected)
- 🐞 **B187:** Edit trip: dragging an expense between groups doesn't update its group (keeps the old type on click and reverts on save) — update the expense type when dropped into another group
- 🐞 **B188:** Edit trip: transportation legs without a valid direction all collapse into "While traveling" (and missing direction could crash loading) — guard the direction on load so legs stay distributed across Departure/During/Return
- 🐞 **B189:** Edit trip: remove leftover broken accommodation import HTML and the duplicate import-button IDs
- 📈 **M201:** Edit trip: restyle "Reuse another traveler's transportation" and accommodation import as a top-right themed button with icon + short label (like destination's "Fetch Info With Maps"), always visible with a friendly empty-state toast
- 📈 **M202:** Edit trip: add a separator border to the image-picker card label
- 📈 **M203:** [DEV] Consolidate emulator backups to a single source of truth — `backup.js` prunes stray `firebase-export-*` folders (from ad-hoc `firebase emulators:export` runs without a target); `.emulator-data/` + `.emulator-data-backups/` are the only backup locations
- 📈 **M204:** Edit trip: hide the expense "Paid by" and "Split with" fields when the trip has zero or only one named traveler (including when no traveler name was defined)
- 📈 **M205:** Edit trip: accommodation import dialog improvements
- 🐞 **B190:** View page transportation tabs flicker
- 📈 **M206:** Edit trip: itinerary destination cards match destinations-checkboxes layout
- 🐞 **B191:** Edit trip: destination cards overflow the destinations box
- 🐞 **B192:** Edit trip: itinerary "Set the title"/"Set start and end time" only apply start/end
- 🏆 **F196:** Add a "Partially prepaid" option to the accommodation payment status (edit + view)
- 📈 **M207:** Make the zoom hover overlay more subtle (more transparency) with a dark-gray tint in dark mode and a neutral adaptive icon (view gallery, destination media, accommodations)
- 🐞 **B193:** Edit trip: expense subtotals now convert mixed-currency expenses to the trip currency (modularized the shared currency conversion API)
- 🐞 **B193:** Edit trip: expense subtotals convert mixed currencies to the trip currency (modularized shared currency conversion API)

## [2.25.1] - 2026-08-24

- 🐞 **B179:** Fix transportation accordion titles not refreshing (edit trip)
- 🐞 **B180:** Fix transportation visual issues + recent features side effects
- 🐞 **B181:** Migrations already run in PRD still offered as deploy options (backfill completed state)

## [2.25.0] - 2026-08-24

- 📈 **M182:** [DEV] Kill dev env
- 📈 **M188:** [DEV] Add mandatory end-of-task backlog check to readme skill
- 📈 **M189:** [DEV] initLocalDb skips seeding when the database already has data
- 🏆 **F190:** Use LocalStorage logic for detecting new versions (cache refreshing)
- 🏆 **F191:** Expenses: exclusive shopping-bag icon for the Shopping type + copy list to iOS Notes (native checkboxes)
- 📈 **M190:** Expand wallpaper import to trip gallery, accommodation and destination place images
- 🏆 **F065:** Show if accommodation was prepaid or not
- 🏆 **F192:** Import accommodation from previous trips
- 🏆 **F193:** Seed an empty light or dark logo from the first logo selected
- 🏆 **F194:** Reuse transportation between travelers

## [2.24.0] - 2026-08-23

- ⚔️ **E014:** Implementation: Shopping List
  - *[🏆F188] Group transportation by traveler (select from trip travelers instead of free text)*
  - *[🏆F071] Multi-person expenses*
- 🐞 **B176:** Order upcoming trips on index from closest to furthest from now
- 📈 **M185:** [DEV] Make emulator exit backup opt-in (not automatic on npm run dev exit)
- 🏆 **F189:** Import destination images from edit trip + link improvements
- 🐞 **B177:** [DEV] Fix backup and on ready dev env issues
- 🐞 **B178:** Fix pin dialog issues
- 📈 **M186:** Improve expenses visualization and protected data
- 📈 **M183:** [DEV] Auto run migration scripts after deployment
- 📈 **M184:** [DEV] Remove double deployment
- 📈 **M187:** [DEV] Run migrations via local functions emulator after deploy (no billing prompt)

## [2.23.0] - 2026-08-16

- 📈 **M169:** [DEV] Improve cache busting
- 🏆 **F177:** Add app version on footers
- 📈 **M170:** Improve import/export icons on index
- ⚔️ **E045:** Add Maps integration into edit page (dev only poc)
- ⚔️ **E017:** Optimize firebase operations usage
- ⚔️ **E027:** New Front-End: view.html
- 🐞 **B174:** Issue with transportation duration card on edit trip
- 🐞 **B173:** Fix issues with index cards closing and not reopening
- 📈 **M172:** Minor visual improvements on index.html (search, order, image loading)
- 📈 **M178:** [DEV] Reorganize docs
- 📈 **M177:** Make tab selector on index mobile friendly
- ⚔️ **E016:** New Front-End: destination.html
- 🏆 **F182:** Add new dialogs into all itinerary items for view
- 📈 **M163:** [DEV] Improve live reload functionality
- ⚔️ **E043:** Export as static web page (Offline Mode)
- 🏆 **F187:** [DEV] Add support for AI mobile push notification (ntfy)
- 📈 **M181:** Remove PIN typing need on index.html

## [2.22.2] - 2026-08-08

- 🐞 **B167:** Edit trip labels on customization not showing
- 🐞 **B166:** Can't save new transportations
- 🐞 **B168:** We can close the dialog on saved document and it doesnt refresh the page
- 🐞 **B169:** Account restore giving "Access Denied"
- 🐞 **B170:** Fix mismatched color preset pairs on edit trip
- 🐞 **B171:** Image dialog not transitioning when user clicks on add image button
- 📈 **M167:** [DEV] Auto restart if emulator functions failed
- 🏆 **F176:** Add custom colors on trip cards

## [2.22.1] - 2026-08-05

- 📈 **M167:** Add database profile info since auth data is not always filled

## [2.22.0] - 2026-08-04

- ⚔️ **E048:** Database overhaul (TypeScript migration)
- ⚔️ **E044:** New Front-End: edit pages
- ⚔️ **E034:** Frontend code refactoring
- ⚔️ **E049:** Code translation (PT → EN)
- ⚔️ **E050:** Proper dev environment (emulators, data scripts)
- 🏆 Backup/restore improvements, single-document export/import, AI skills, destination images, and more

## [2.21.0] - 2026-06-06

- ⚔️ **E018:** New Front-End: index.html
- ⚔️ **E026:** Google Maps (Places API) partial implementation / POC
- ⚔️ **E042:** During-Trip Automations (load on closest next itinerary item)
- 🏆 Environment tag on title when running locally (F148), disable image uploads (F166), scripts folder refactor (F165)
- 📈 M143–M148 (itinerary spacing, tags, trip categories, epic detection) and 🐞 B152–B160 fixes
- 📄 Migration plan, offline-mode and Maps integration planning docs

## [2.20.6] - 2026-02-08

- 🐞 Fix pack: document changes, visibility, destination/view pages not loading (B127, B147–B151)
- 📈 Minor visibility improvements for view page (M144)

## [2.20.5] - 2026-01-30

- 🏆 Itinerary page embed to view page (F145), mobile drawer for itinerary (F146)
- 📈 Embed visibility refactoring (M141); 🐞 B123, B127 fixes
- 📄 Modernization plan docs

## [2.20.4] - 2026-01-26

- 🏆 Company name for transportation in itinerary (F147)
- 🐞 PIN duplication, destination description fixes (B144–B146)

## [2.20.3] - 2026-01-24

- 🏆 Keyboard navigation for message modals (F143), git sync script for master/develop (F144)
- 📈 URL/embed refactors (M141, M142); 🐞 B143 fix

## [2.20.2] - 2026-01-22

- Docs / redeploy (no code changes)

## [2.20.1] - 2026-01-21

- 🐞 Embed hotfix, view visibility auto-switch (B142); minor improvements

## [2.20.0] - 2026-01-19

- ⚔️ **E041:** Full Itinerary page (PIN logic, data formatting, print/PDF and notes export)
- 🏆 Link full itinerary with button in view (F142)
- 📈 Dark-mode loading/detection improvements (M136–M140); 🐞 B136–B139 fixes

## [2.19.0] - 2026-01-15

- ⚔️ **E040:** Integrate Expenses page directly into view (embed/lightbox logic, PIN & visibility)
- 🏆 Pre-commit actions + readme script (F132), setup script (F133), destination page improvements (F139–F141)
- 🐞 B133, B135 fixes

## [2.18.4] - 2026-01-10

- 🐞 Fix pack: itinerary reload, expenses mobile clipping, trip creation, theme colors (B113, B129–B132)
- 📈 Expenses tablet responsiveness (M129); 🏆 share button / destination redirects (F121, F122)

## [2.18.3] - 2026-01-08

- 📈 Deploy & cache-busting management (M128), readme script (F125)
- 🐞 Itinerary select fix on edit trip page (B122)

## [2.18.2] - 2026-01-07

- 🐞 Timezone fixes (B121); 📈 traveler destinations as checkboxes (M127)

## [2.18.1] - 2026-01-06

- 🏆 Destination title on destination page (F124), eurostar transportation (M132)
- 🐞 Sensitive-box visibility fixes (B126)

## [2.18.0] - 2026-01-05

- ⚔️ **E039:** Destinations Overhaul (object structure migration, embed improvements, quick edit/create)
- 🏆 Planned date and time in destination (F123)

## [2.17.0] - 2026-01-02

- ⚔️ **E038:** Filtering and sorting options for destinations page
- 🐞 Destinos-select order fix (B120)

## [2.16.0] - 2025-12-31

- ⚔️ **E036:** Expenses Overhaul (expense types on edit trip, custom tab, traveler names, icons fixes)
- 🏆 F108–F110; 🐞 B116–B119 fixes

## [2.15.2] - 2025-12-29

- 🐞 Fix pack: backup/restore, change detection, destination data mixing, auto-scroll (B102, B108, B111–B115)
- 📈 Dark-mode highlights, transportation expense type, draggable expense types (M092, M121, M122, M125)

## [2.15.1] - 2025-12-16

- Docs / redeploy (no code changes)

## [2.15.0] - 2025-12-15

- ⚔️ **E037:** Reduce Firestore document calls (user-data migration, batch sets, backup/restore adaptation)
- 🐞 Destinations checkbox column and array fixes

## [2.14.3] - 2025-12-12

- 🐞 Fix pack: dragging transportations, adding people to itinerary, PIN in logs, translations (B103–B107)

## [2.14.2] - 2025-12-11

- 🏆 Disable image uploads / Firebase Storage (F107)
- 📈 Sensitive-box visibility (M125); 🐞 B104 fix

## [2.14.1] - 2025-12-06

- 🐞 Fix pack: expenses update/loading, backup/restore, sensitive-box animation (B099–B101)

## [2.14.0] - 2025-11-30

- ⚔️ **E035:** Protect sensitive trip data (PIN-protected storage, import/export buttons, data structure migration)

## [2.13.1] - 2025-11-22

- 📈 Async config/load of main data (M118); 🐞 destination descriptions mixing fix (B095)

## [2.13.0] - 2025-11-21

- 🏆 Reorder transportation/accommodation (F078), traveler IDs & names in itinerary (F096, F098), custom selects (F099)
- 📈 Map redirect to destination page (M117), destinos select component (M091); 🐞 B091

## [2.12.7] - 2025-11-17

- 🐞 Fix pack: itinerary title, destination mixing, pills, edit-page returns (B090–B094)
- 📈 Native functions replacing JSONs (M115, M116), link validation toasts (M113)

## [2.12.6] - 2025-11-06

- 🏆 Switch between destination categories within a page (F060)

## [2.12.5] - 2025-11-01

- 📈 Calendar navigation improvements (M112); 🐞 calendar/attribution fixes (B087, B089)

## [2.12.4] - 2025-10-28

- 🐞 Fix pack: calendar navigation, attributions, translations, transportation swiper (B079–B089)
- 📈 Itinerary titles translated (M111), edit-trip auto color (M110)

## [2.12.3] - 2025-08-25

- 📈 Highlights 2/2 on tablet/mobile (M109); 🐞 daily schedule scroll, app version loading (B077, B078)

## [2.12.2] - 2025-08-15

- 🐞 Image shrinking fix

## [2.12.1] - 2025-08-14

- 🐞 General fixes

## [2.12.0] - 2025-08-04

- 🏆 Multi-language descriptions (F094), traveler names in edit (F095/F096), auto-suggest itinerary automations (F097)
- 📈 Translation migration + README translated to EN-US

## [2.11.1] - 2025-06-28

- 🐞 Edit/trip.html opening fix; version and readme update

## [2.11.0] - 2025-06-25

- 🏆 Multi-person tickets (F072) + people view and edit general select

## [2.10.0] - 2025-06-23

- ⚔️ **E033:** Create language system + EN-US (multi-language support)
- 🏆 Account export all / import all (F086) + expenses translations

## [2.9.0] - 2025-05-26

- 🏆 Versioning (F082) + cache busting (F083) system introduced
- 🐞 Timezone implementation fixes (B075)

## [2.8.3] - 2025-05-19

- 🐞 Fix pack: gallery dark mode, timezone conversions, menu icon (B072–B074)

## [2.8.2] - 2025-04-19

- 📈 Improved save message on edit pages (M103)

## [2.8.1] - 2025-04-15

- 📈 Scroll fixes (M094) and partial improvements (M097)

## [2.8.0] - 2025-04-10

- ⚔️ **E029:** Refactor storage methods
- 🏆 Multiple images for the same accommodation (F080)
- 📈 Toast on invalid link (M099), scrolls (M094)

## [2.7.2] - 2025-04-06

- 🐞 Fix pack: shift auto-update, calendar bullets, site icon, change detection (B068–B071)

## [2.7.1] - 2025-04-04

- Docs / redeploy (no code changes)

## [2.7.0] - 2025-04-03

- 🏆 Tab system for transports (F079)
- 🐞 Dark-mode and menu fixes (B023, B024)

## [2.6.0] - 2025-04-02

- 🏆 Pages renamed to English (F061), confirm leaving page if changes (F077)
- ⚔️ **E017** + 📈 save-optimization (M042); 🐞 B022, B067 fixes

## [2.5.1] - 2025-03-26

- 📈 Toast copy-paste improvements (M088); PR #4 merge

## [2.5.0] - 2025-03-23

- 🏆 "Current Trip" top bar (F068), "Today's Schedule" (F073), toast notifications (F075), copy-paste reservation codes (F074), Instagram Reels embeds (F051), swiper arrows (F076)
- 📈 M020, M095; 🐞 B058, B062, B066 fixes

## [2.4.1] - 2025-03-22

- 🐞 Fix pack: dark mode persistence, timezone, share button, dynamic select (B057, B060, B061, B063–B065)

## [2.4.0] - 2025-01-22

- 🏆 Custom trip light/dark mode (F062), switch Google login to user/password (F066)

## [2.3.3] - 2024-11-09

- 🐞 Expenses table/calendar work (B057)

## [2.3.2] - 2024-10-20

- 📈 Itinerary improvements (M085); 🏆 disable webview zoom (F064)
- 🐞 Dynamic select and loading fixes (B056, B057, B059)

## [2.3.1] - 2024-10-07

- 🐞 Hotfix pack: trip saving, expenses icons, sortable.js loading, customization switches (B055)

## [2.3.0] - 2024-09-09

- ⚔️ **E021:** Lineup removal/rework
- 📈 Destination checkboxes display (M084), date select based on trip period (M083); 🐞 B054 fix

## [2.2.0] - 2024-09-05

- 📈 Drag & drop itinerary accordions (M023), dynamic select rework (M081), switch buttons (M074/M080), login-by-redirect (M079)
- 🏆 Direct destination viewing (F057/F059); 📈 pre-prod improvement pack (M082); 🐞 B047–B053 fixes

## [2.1.1] - 2024-08-05

- 🏆 Previous-trips item on index (F058), larger/reordered trip list (M070), Instagram templates
- 🐞 Itinerary dark-mode fix (B048); hotfixes

## [2.1.0] - 2024-07-21

- ⚔️ **E022:** Migration functions (Cloud Functions)
- 🐞 Hotfix pack: login popup, destination display, new trip creation (B046); 📈 M069

## [2.0.0] - 2024-06-26

- ⚔️ **E013:** Project Migration — dev/prd environments, develop branch, custom domain for PRD
- ⚔️ **E015:** Expenses feature (rates API, categories, auto-import, templates)
- ⚔️ **E022:** Migration functions
- 📈 M019 (customizable itinerary), M048, M056–M068; 🏆 F050 (TikTok link API), F056 (change detection)
- 🐞 B042–B045 fixes
