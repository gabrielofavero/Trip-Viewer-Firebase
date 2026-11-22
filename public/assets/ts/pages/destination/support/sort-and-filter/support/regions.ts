// ======= Destination entry regions =======
// Normalizes a destination entry's regions into a clean list of names.
//
// Entries store `regions: string[]` (migration 19); the legacy single
// `region` string is still accepted so documents exported by older app
// versions keep filtering correctly. Blank/whitespace entries are dropped so
// an entry with only blank strings counts as "no region defined".

export interface RegionEntry {
	item: any;
}

/**
 * The region names of a single destination entry (never `undefined`).
 */
export function getEntryRegions(item: any): string[] {
	const list = Array.isArray(item?.regions) ? item.regions : [];
	const raw = list.length > 0 ? list : item?.region ? [item.region] : [];

	return raw
		.filter((region) => typeof region === 'string')
		.map((region) => region.trim())
		.filter(Boolean);
}

/**
 * True when at least one of the given entries has no region defined — i.e.
 * the "no region defined" filter would have something to show.
 */
export function hasEntriesWithoutRegion(entries: RegionEntry[]): boolean {
	return entries.some((entry) => getEntryRegions(entry.item).length === 0);
}
