// ======= People Registry =======
//
// Account-level list of people (name + photo) stored inside the signed-in
// user's document (`users/{uid}.people`):
//
//   people: [
//     { id: string, name: string, photo: string }
//   ]
//
// Only registered people can carry a photo — trips copy it into their
// `travelers` entries when saved, so shared viewers (who cannot read the
// owner's user document) still see the avatars.

import { get, update, COLLECTION } from '../firebase/database.js';
import { getUID, USER_DATA, setUserData } from '../firebase/auth.js';

export interface Person {
	id: string;
	name: string;
	photo: string;
}

/** People cached for the current page session (seeded from the user doc). */
let CACHED_PEOPLE: Person[] = [];
let LOADED = false;

/** Coerce raw Firestore data into a clean, deduplicated people array. */
export function normalizePeople(raw: any): Person[] {
	if (!Array.isArray(raw)) return [];

	const seenIds = new Set<string>();
	const people: Person[] = [];

	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;

		const id = String(entry.id ?? '').trim();
		const name = String(entry.name ?? '').trim();
		if (!id || !name || seenIds.has(id)) continue;
		seenIds.add(id);

		people.push({
			id,
			name,
			photo: String(entry.photo ?? entry.photoURL ?? '').trim(),
		});
	}

	return people;
}

/** Seed the session cache from an already-fetched user document. */
export function seedPeople(raw: any): Person[] {
	CACHED_PEOPLE = normalizePeople(raw);
	LOADED = true;
	return CACHED_PEOPLE;
}

/** People list for the current page session (no network read). */
export function getCachedPeople(): Person[] {
	return CACHED_PEOPLE;
}

/** Read `users/{uid}.people` from Firestore and cache it. */
export async function loadPeople(force = false): Promise<Person[]> {
	if (LOADED && !force) return CACHED_PEOPLE;

	const uid = await getUID();
	if (!uid) return seedPeople([]);

	const userData = await get(`${COLLECTION.USERS}/${uid}`);
	return seedPeople(userData?.people);
}

/** Persist the people list to `users/{uid}` and refresh the session cache. */
export async function savePeople(people: Person[]): Promise<boolean> {
	const uid = await getUID();
	if (!uid) return false;

	const normalized = normalizePeople(people);
	CACHED_PEOPLE = normalized;
	LOADED = true;

	const result = await update(`${COLLECTION.USERS}/${uid}`, { people: normalized });

	// Keep the in-memory user profile in sync for later reads of USER_DATA.
	if (USER_DATA) {
		setUserData({ ...USER_DATA, people: normalized });
	}

	return result?.success !== false;
}

/** Registered person matching `id`, or undefined when not registered. */
export function getPerson(id: string): Person | undefined {
	return CACHED_PEOPLE.find((person) => person.id === id);
}

/** Registered person matching a display name (case-insensitive). */
export function getPersonByName(name: string): Person | undefined {
	const normalized = String(name ?? '').trim().toLowerCase();
	if (!normalized) return undefined;
	return CACHED_PEOPLE.find((person) => person.name.toLowerCase() === normalized);
}

/** Id for a newly registered person (unique within the cached list). */
export function createPersonId(): string {
	const pool = CACHED_PEOPLE.map((person) => person.id);
	let id = '';
	do {
		id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
	} while (pool.includes(id));
	return id;
}

/**
 * People waiting to be registered when the current save flow succeeds.
 * The trip editor queues them when the "save for future trips" checkbox is
 * used, because the person should only exist account-wide once the trip that
 * introduced them is actually saved.
 */
let QUEUED_PEOPLE: Person[] = [];

/** Queue a person to be appended to the registry on the next flush. */
export function queuePersonRegistration(person: Person): void {
	if (!person?.id || !person.name) return;
	QUEUED_PEOPLE.push(person);
}

/**
 * Append the queued people to `users/{uid}.people` (names already registered
 * are skipped). Returns false when the write fails.
 */
export async function flushQueuedPeople(): Promise<boolean> {
	if (QUEUED_PEOPLE.length === 0) return true;

	const registered = getCachedPeople();
	const registeredNames = new Set(registered.map((person) => person.name.toLowerCase()));
	const additions = QUEUED_PEOPLE.filter(
		(person) => !registeredNames.has(person.name.toLowerCase()),
	);
	QUEUED_PEOPLE = [];

	if (additions.length === 0) return true;
	return savePeople([...registered, ...additions]);
}

/**
 * Enrich a trip traveler list with the registry's current name/photo.
 * Travelers that are not in the current user's registry are returned
 * untouched — a shared-trip editor has their own (possibly empty) registry and
 * must not strip the owner's denormalized photos.
 */
export function applyPeopleToTravelers(travelers: any[]): any[] {
	if (!Array.isArray(travelers)) return [];

	return travelers.map((traveler) => {
		if (!traveler || typeof traveler !== 'object') return traveler;

		const person = getPerson(traveler.id);
		if (!person) return traveler;

		const result: Record<string, any> = {
			...traveler,
			name: person.name || traveler.name || '',
		};

		if (person.photo) {
			result.photo = person.photo;
		} else {
			delete result.photo;
		}

		return result;
	});
}
