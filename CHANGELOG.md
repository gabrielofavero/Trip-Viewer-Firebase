# Changelog

## [2.22.0]

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

---

*Changelog generated from Firebase Hosting release history (`trip-viewer-prd`) + git history. 135 releases → 57 logical deployments (2024-06-26 → 2026-06-06). Version numbering starts at 2.0.0; minor = significant deployment, patch = partial deployment.*
