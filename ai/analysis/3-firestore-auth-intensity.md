# Firestore/Auth Request Intensity Analysis

**Date:** 2026-06-13  
**Scope:** `public/assets/ts/` (client-side), `dev/functions/` (cloud functions)  
**Methodology:** Static code analysis of all Firestore read/write paths and Firebase Auth listener registrations.

---

## Severity Scale

| Level | Criteria |
|-------|----------|
| 🔴 **Critical** | Can cause noticeable latency, hit Firestore quotas, or block the UI. Should be fixed ASAP. |
| 🟠 **High** | Inefficient pattern that scales poorly with data size. Should be addressed in next iteration. |
| 🟡 **Medium** | Suboptimal but tolerable for small data volumes. |
| 🟢 **Low** | Minor concern; code hygiene issue. |

---

## 🔴 Critical: Sequential N+1 Destination Reads

**File:** `public/assets/ts/data/firebase/database.ts` — `getTripDataWithDestinations()` (line ~267)

```ts
for (let i = 0; i < tripData?.destinos?.length; i++) {
    place = await get(`destinos/${tripData.destinos[i].destinosID}`, false);
    // ...
}
```

**Problem:** Each destination is fetched **sequentially** with `await` inside a `for` loop. For a trip with 10 destinations, this is 1 (trip) + 10 (destinations) = **11 sequential Firestore reads**, each with network round-trip latency (~50-200ms). Total wait: 0.5–2 seconds of cumulative blocking.

**Affected pages:** `view.html` (trip detail), `edit/trip.html` (edit trip)

**Triggered by:** Opening any trip or listing that has linked destinations. Also triggered when editing an existing trip.

**Fix:** Use `Promise.all()` to fetch all destinations in parallel:
```ts
const destinations = await Promise.all(
    tripData.destinos.map(async (d) => {
        d.destinos = await get(`destinos/${d.destinosID}`, false);
        return d;
    })
);
```

---

## 🔴 Critical: Backup — Unbounded Parallel Firestore Reads

**File:** `public/assets/ts/backup/backup.ts` — `loadJobsConcurrently()` (line ~195)

```ts
const promises = jobList.map(async (job) => {
    const result = await get(path, true, false);
    // ...
});
await Promise.allSettled(promises);
```

**Problem:** For a user with, say, 10 trips, 20 destinations, 5 listings, and each trip having gastos + protegedo data, this fires **~50+ parallel Firestore reads simultaneously**. No throttling or batching. While `Promise.allSettled` is used (so one failure doesn't block others), this can:
- Hit Firestore's concurrent connection limits
- Cause client-side memory pressure
- Result in rate limiting from Firestore

**Affected pages:** `index.html` (home page — settings panel)

**Triggered by:** User clicking "Backup Account" in the settings panel on the home page.

**Fix:** Implement chunked throttling (e.g., 10 concurrent max using `p-limit` or a simple semaphore).

---

## 🟠 High: Account Deletion — Sequential Protected Data Reads (N+1)

**File:** `public/assets/ts/data/firebase/database.ts` — `deleteAccountDocuments()` (line ~313)

```ts
for (const tripID of userData.viagens) {
    // ...
    protSnap = await protRef.get();  // Sequential read per trip
    // ...
}
```

**Problem:** For each trip, a `protegido/{tripID}` document read is done **sequentially** to determine if there's a PIN. For 20 trips, that's 20 sequential reads before any deletion starts. The deletes are parallelized (good), but the reads bottleneck the start of the operation.

**Affected pages:** `index.html` (home page — settings panel)

**Triggered by:** User clicking "Delete Account" in the settings panel on the home page.

**Same pattern in:** `restore.ts` `collectDeleteOps()` (line ~180)

**Fix:** Read all `protegido` documents in parallel first, then delete:
```ts
const protSnaps = await Promise.allSettled(
    userData.viagens.map(id =>
        firebase.firestore().collection("protegido").doc(id).get()
    )
);
```

---

## 🟠 High: Restore — Massive Batch Writes with Sequential Reads

**File:** `public/assets/ts/backup/restore.ts` — `restoreAccount()` (line ~140)

**Problem:** The restore flow does:
1. **Sequential protected reads** for all trips (N+1) to collect delete ops
2. **Batch commit** of all deletes (up to 500 per batch)
3. **Batch commit** of all creates (hundreds of documents)
4. **User document update**

For a large backup, step 2-3 could involve **multiple batches of 450 operations each**, totalling potentially 500+ Firestore writes. While batches themselves are efficient, the cumulative cost in a single user action is high. Also, step 1's sequential reads add avoidable latency.

**Affected pages:** `index.html` (home page — settings panel)

**Triggered by:** User selecting a backup JSON file and clicking "Restore" in the settings panel on the home page.

**Fix:** Parallelize the protected reads in step 1. Consider showing progress to the user for long restores.

---

## 🟠 High: Redundant `onAuthStateChanged` Listeners

**File:** `public/assets/ts/data/firebase/auth.ts` and `public/assets/ts/pages/home/support/data.ts`

Three separate `onAuthStateChanged` listeners are registered:

| Location | Purpose |
|----------|---------|
| `auth.ts` `getUID()` (line 104) | Resolves UID promise |
| `auth.ts` `getUser()` (line 126) | Resolves user promise |
| `home/support/data.ts` `loadUserIndex()` (line 18) | Loads home page data |

**Problem:** On the home page, all three fire. The first two unsubscribe immediately (they're one-shot promises), so they're fine **if** called once. But `getUID()` is called from many places (`getUserData`, `deleteUserObjectDB`, `addToUserArray`, `newUserObjectDB`, `getPermissoes`, etc.), meaning each call chain potentially sets up a new listener that immediately unsubscribes. Auth state changes are **not** free — each `onAuthStateChanged` triggers a token verification check against Firebase Auth servers.

**Affected pages:** All pages (global, but most impactful on `index.html`)

**Triggered by:** Every page load. `getUID()` is called from `getUserData`, `deleteUserObjectDB`, `addToUserArray`, `newUserObjectDB`, `getPermissoes`, `deleteAccountDocuments`, `registerIfUserNotPresent`, and others — each call chain potentially spawns a new `onAuthStateChanged` listener.

**Fix:** Consolidate to a single `onAuthStateChanged` in the app bootstrap that stores both `user` and `UID` as module-level variables synchronously, and have all consumers read the cached values.

---

## 🟡 Medium: Home Page — Large User Document Read

**File:** `public/assets/ts/pages/home/support/data.ts` — `loadUserIndex()`

```ts
setUserData(await getUserData(user.uid));
// USER_DATA contains full nested objects for all trips, destinations, listings
```

**Problem:** The `usuarios/{uid}` document stores nested summary objects for ALL trips, destinations, and listings the user owns (`USER_DATA.viagens`, `USER_DATA.destinos`, `USER_DATA.listagens`). Each contains `titulo`, `cores`, `imagem`, `versao`, `modulos`, `pin`, `inicio`, `fim`, etc. For a power user with 50+ trips, this is a large document read.

This is actually an **architectural concern**: the user document grows unboundedly. Firestore documents have a 1 MiB limit.

**Affected pages:** `index.html` (home page)

**Triggered by:** User signing in and landing on the home page. Fires on every home page load after auth.

**Fix:** Consider moving trip/destination/listing summaries to a subcollection (`usuarios/{uid}/summary/{type}`) and querying with limits, or paginating the user document with only recent/active trips.

---

## 🟡 Medium: View Page — `getSingleData` Triggers Full N+1 Chain

**File:** `public/assets/ts/pages/trip-detail/view.ts` — `loadViewPage()` (line ~70)

```ts
const firestoreData = await getSingleData(TYPE);
```

**Call chain:** `getSingleData` → `get` (trip) → `getTripDataWithDestinations` (N destinations, **sequential**).

**Affected pages:** `view.html` (trip detail), `destination.html` (destination detail)

**Triggered by:** Any visitor opening a shared trip link (`view.html?v=...`) or destination link (`destination.html?d=...`). Also triggered when opening a listing (`view.html?l=...`). This is the highest-traffic path in the app.

**Problem:** Already covered under the Critical N+1 issue, but specifically here: the view page is the **most visited page** (trip viewers), so every visitor hits this sequential chain.

---

## 🟡 Medium: Edit Trip — Three Sequential Read Chains

**File:** `public/assets/ts/pages/edit-trip/edit-trip.ts` — `loadTrip()` (line ~87)

```ts
FIRESTORE_PROTECTED_DATA = await get(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`);
// Then based on result:
setState(await getTripDataWithDestinations(...));  // N+1 destinations
// Then later in existing-trip.ts:
setGastosData(await get(getPath, true, true));  // Separate expenses read
```

**Problem:** Editing a trip triggers at least 3 Firestore document reads (protected, trip+destinations, expenses), with the trip read being the expensive N+1 chain. These are all sequential.

**Affected pages:** `edit/trip.html` (edit trip)

**Triggered by:** Trip owner clicking "Edit" on a trip from the home page or view page, which opens the edit trip form.

**Fix:** Fire all three in parallel (they're independent), and fix the N+1 in `getTripDataWithDestinations`:
```ts
const [protectedData, tripRaw, expenses] = await Promise.all([
    get(`viagens/protected/${PIN.current}/${DOCUMENT_ID}`, true, true),
    get(`viagens/${DOCUMENT_ID}`),
    get(getPath, true, true)
]);
// Then resolve destinations in parallel
```

---

## 🟡 Medium: No Firestore Offline Persistence

**Files:** All — no `enablePersistence()` or `enableIndexedDbPersistence()` calls found.

**Problem:** Without offline persistence, every page navigation that triggers a read goes over the network. Firestore's built-in cache (`enableIndexedDbPersistence`) would cache reads locally and serve subsequent requests from disk. This is especially impactful for the view page (read-heavy) and the home page (revisited often).

**Affected pages:** All pages (global)

**Triggered by:** Every page navigation. Since the app does full page reloads (not SPA), every visit to a new page re-initializes Firestore without a local cache.

**Fix:** Call `firebase.firestore().enablePersistence()` during app initialization.

---

## 🟡 Medium: `getUserData` Cache-Bypass Pattern

**File:** `public/assets/ts/data/firebase/auth.ts` — `getUserData()` (line ~10)

```ts
export async function getUserData(uid?) {
    if (USER_DATA) { return USER_DATA; }
    if (!uid) { uid = await getUID(); }
    return await get(`usuarios/${uid}`);
}
```

**Problem:** The cache check (`if (USER_DATA)`) works, but callers frequently pass an explicit `uid` (e.g., `getUserData(user.uid)`), bypassing the intention. Also, `setUserData()` is called after `getUserData()` completes — there's a race window where concurrent `getUserData()` calls could both trigger reads.

**Affected pages:** All pages that read user data (`index.html`, `edit/trip.html`, `edit/destination.html`, `edit/listing.html`)

**Triggered by:** Multiple near-simultaneous calls to `getUserData()` during page initialization — for example, `edit-trip.ts` calls it directly while `getPermissoes()` also calls it.

**Fix:** Use a promise-based deduplication pattern:
```ts
let userDataPromise = null;
export async function getUserData() {
    if (USER_DATA) return USER_DATA;
    if (!userDataPromise) {
        userDataPromise = (async () => {
            const uid = await getUID();
            return await get(`usuarios/${uid}`);
        })();
    }
    USER_DATA = await userDataPromise;
    userDataPromise = null;
    return USER_DATA;
}
```

---

## 🟢 Low: Expenses Page — localStorage as Makeshift Cache

**File:** `public/assets/ts/pages/expenses/expenses.ts` — `loadExpensesPage()` (line ~60)

```ts
const gastosExport = localStorage.getItem("gastos")
    ? JSON.parse(localStorage.getItem("gastos"))
    : "";
```

**Problem:** Trip data (whether expenses are active, and the PIN type) is passed via `localStorage` from the view page to the expenses iframe. This is fragile and adds a `localStorage` parse on every load. The expenses page then does its own Firestore read anyway.

**Affected pages:** `expenses.html` (embedded iframe from `view.html`)

**Triggered by:** User clicking the "Expenses" tab/section on the view page, which opens `expenses.html` in an iframe. Also triggered when navigating directly to `expenses.html?g=...`.

**Fix:** Pass data via `postMessage` API (already used for embed communication) or URL parameters.

---

## 🟢 Low: `getDestination` Cache is In-Memory Only

**File:** `public/assets/ts/data/firebase/database.ts` — `getDestination()` (line ~443)

```ts
if (DESTINOS_ATIVOS[id]) return DESTINOS_ATIVOS[id];
// ... fetch and cache
DESTINOS_ATIVOS[id] = await get(`destinos/${id}`);
```

**Problem:** The `DESTINOS_ATIVOS` cache is a simple object in memory. It doesn't survive page navigation (each page is a full reload with the current architecture). On the view page, `getTripDataWithDestinations` fetches all destinations, but then individual components might call `getDestination` again for the same data.

**Affected pages:** `view.html` (trip detail), `edit/trip.html` (edit trip) — any page that calls `getDestination()` after `getTripDataWithDestinations` has already loaded the same data.

**Triggered by:** Rendering destination cards on the view page or loading destination selectors on the edit trip page. The cache is lost on every page navigation.

**Fix:** Since destinations are already embedded in the trip object by `getTripDataWithDestinations`, components should read from `getState().destinos[i].destinos` instead of calling `getDestination` again.

---

## 📊 Summary Table

| # | Issue | Severity | Reads/Writes | Affected Pages | Triggered By | Location |
|---|-------|----------|--------------|----------------|--------------|----------|
| 1 | Sequential N+1 destination reads | 🔴 Critical | N+1 reads | `view.html`, `edit/trip.html` | Opening any trip/listing with destinations; editing a trip | `database.ts:getTripDataWithDestinations` |
| 2 | Unbounded parallel backup reads | 🔴 Critical | 50+ parallel reads | `index.html` (settings) | Clicking "Backup Account" | `backup.ts:loadJobsConcurrently` |
| 3 | Sequential protected reads on delete | 🟠 High | N sequential reads | `index.html` (settings) | Clicking "Delete Account" | `database.ts:deleteAccountDocuments` |
| 4 | Restore massive batch + sequential reads | 🟠 High | Hundreds of writes | `index.html` (settings) | Selecting backup file & clicking "Restore" | `restore.ts:restoreAccount` |
| 5 | Redundant `onAuthStateChanged` listeners | 🟠 High | Auth token checks | All pages (global) | Every page load; many DB operations | `auth.ts` + `data.ts` |
| 6 | Large user document (unbounded growth) | 🟡 Medium | 1 large read | `index.html` | User sign-in / home page load | `data.ts:loadUserIndex` |
| 7 | View page hits N+1 chain | 🟡 Medium | N+1 reads | `view.html`, `destination.html` | Any visitor opening a shared trip/destination link | `view.ts:loadViewPage` |
| 8 | Edit trip — 3 sequential reads | 🟡 Medium | 3+ reads | `edit/trip.html` | Trip owner clicking "Edit" on a trip | `edit-trip.ts:loadTrip` |
| 9 | No offline persistence | 🟡 Medium | Every read over network | All pages (global) | Every page navigation (full reload) | Global |
| 10 | `getUserData` race condition | 🟡 Medium | Duplicate reads | `edit/trip.html`, `edit/destination.html`, `edit/listing.html` | Multiple init calls during page load | `auth.ts:getUserData` |
| 11 | localStorage as cache for expenses | 🟢 Low | N/A | `expenses.html` (iframe) | Opening expenses tab from view page | `expenses.ts` |
| 12 | In-memory destination cache | 🟢 Low | Duplicate reads | `view.html`, `edit/trip.html` | Rendering destination cards/selectors | `database.ts:getDestination` |

---

## 🔧 Recommended Priority Order

1. **Fix sequential N+1 in `getTripDataWithDestinations`** — impacts every trip view and edit. Use `Promise.all()`.
2. **Consolidate `onAuthStateChanged` listeners** — reduces Auth server calls on every page load.
3. **Add throttling to backup reads** — prevent Firestore rate limiting.
4. **Parallelize protected reads in `deleteAccountDocuments` and restore** — reduce latency for destructive operations.
5. **Enable Firestore offline persistence** — improves repeat-visit performance.
6. **Address user document unbounded growth** — architectural change to avoid hitting 1 MiB limit.
