// ======= Destination Folders =======
//
// User-level organization for destination documents. The folder list lives
// inside the signed-in user's document (`users/{uid}.destinationFolders`) —
// only destinations can be filed; trips and listings are not part of it.
//
// Stored shape:
//   destinationFolders: [
//     { id: string, name: string, destinationIds: string[] }
//   ]
//
// A destination belongs to at most one folder. Folder order in the array is
// the display order. Destination order inside a folder is the display order of
// the cards inside that folder.

import { get, update, COLLECTION } from '../firebase/database.js';
import { getUID, USER_DATA, setUserData } from '../firebase/auth.js';

export interface DestinationFolder {
	id: string;
	name: string;
	destinationIds: string[];
}

/** Folders cached for the current page session (seeded from the user doc). */
let CACHED_FOLDERS: DestinationFolder[] = [];

/** Coerce raw Firestore data into a clean, deduplicated folder array. */
export function normalizeDestinationFolders(raw: any): DestinationFolder[] {
	if (!Array.isArray(raw)) return [];

	const seenFolderIds = new Set<string>();
	const seenDestinationIds = new Set<string>();
	const folders: DestinationFolder[] = [];

	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const id = String(entry.id ?? '').trim();
		if (!id || seenFolderIds.has(id)) continue;
		seenFolderIds.add(id);

		const name = String(entry.name ?? '').trim() || id;
		const destinationIds: string[] = [];
		const rawIds = Array.isArray(entry.destinationIds) ? entry.destinationIds : [];
		for (const value of rawIds) {
			const destinationId = String(value ?? '').trim();
			if (!destinationId || seenDestinationIds.has(destinationId)) continue;
			seenDestinationIds.add(destinationId);
			destinationIds.push(destinationId);
		}

		folders.push({ id, name, destinationIds });
	}

	return folders;
}

/** Seed the session cache from an already-fetched user document. */
export function seedDestinationFolders(raw: any): DestinationFolder[] {
	CACHED_FOLDERS = normalizeDestinationFolders(raw);
	return CACHED_FOLDERS;
}

/** Folder list for the current page session (no network read). */
export function getCachedDestinationFolders(): DestinationFolder[] {
	return CACHED_FOLDERS;
}

/** Read `users/{uid}.destinationFolders` from Firestore and cache it. */
export async function loadDestinationFolders(): Promise<DestinationFolder[]> {
	const uid = await getUID();
	if (!uid) return seedDestinationFolders([]);
	const userData = await get(`${COLLECTION.USERS}/${uid}`);
	return seedDestinationFolders(userData?.destinationFolders);
}

/** Persist the folder list to `users/{uid}` and refresh the session cache. */
export async function saveDestinationFolders(
	folders: DestinationFolder[],
): Promise<boolean> {
	const uid = await getUID();
	if (!uid) return false;

	const normalized = normalizeDestinationFolders(folders);
	CACHED_FOLDERS = normalized;

	const result = await update(`${COLLECTION.USERS}/${uid}`, {
		destinationFolders: normalized,
	});

	// Keep the in-memory user profile in sync so later reads of USER_DATA
	// (e.g. when opening the folders dialog again) see the saved folders.
	if (USER_DATA) {
		setUserData({ ...USER_DATA, destinationFolders: normalized });
	}

	return result?.success !== false;
}

/** Id for a newly created folder (unique within the user's folder list). */
export function createDestinationFolderId(): string {
	return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Folder that currently contains the destination, or null when it is loose. */
export function getDestinationFolderOf(
	folders: DestinationFolder[],
	destinationId: string,
): DestinationFolder | null {
	for (const folder of folders) {
		if (folder.destinationIds.includes(destinationId)) return folder;
	}
	return null;
}

/**
 * Split a destination list into folder groups (folder order preserved, items
 * ordered as stored) and the loose destinations that are not filed anywhere.
 *
 * Destinations missing from `destinations` (e.g. stale ids left in a folder)
 * are ignored in both outputs.
 */
export function groupDestinationsByFolder<T extends { id: string }>(
	destinations: T[],
	folders: DestinationFolder[],
): { groups: { folder: DestinationFolder; items: T[] }[]; loose: T[] } {
	const byId = new Map(destinations.map((destination) => [destination.id, destination]));
	const filedIds = new Set<string>();
	const groups: { folder: DestinationFolder; items: T[] }[] = [];

	for (const folder of folders) {
		const items: T[] = [];
		for (const destinationId of folder.destinationIds) {
			const destination = byId.get(destinationId);
			if (!destination) continue;
			filedIds.add(destination.id);
			items.push(destination);
		}
		groups.push({ folder, items });
	}

	const loose = destinations.filter((destination) => !filedIds.has(destination.id));
	return { groups, loose };
}
