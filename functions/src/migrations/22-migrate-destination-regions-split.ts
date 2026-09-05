import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================
// MIGRATION 22: Split combined region values on destination entries
//
// The multi-region feature (F063) stores one neighborhood per `regions`
// array element. But many entries were created while the region input was a
// single free-text box, so several neighborhoods got typed into ONE value,
// separated by a comma or semicolon:
//
//   regions: ["Jardins, Pinheiros"] → regions: ["Jardins", "Pinheiros"]
//   regions: ["Jardins; Pinheiros"] → regions: ["Jardins", "Pinheiros"]
//   regions: ["Jardins,Pinheiros"]  → regions: ["Jardins", "Pinheiros"]
//   regions: ["Shopping Morumbi, Shopping Pátio Paulista", "Itaim Bibi"]
//                                     → ["Shopping Morumbi", "Shopping Pátio
//                                        Paulista", "Itaim Bibi"]
//
// This migration splits every such combined element into separate array
// elements (trimmed + de-duplicated). It also converts any leftover legacy
// single-string `region` into a split `regions` array and removes the legacy
// field, mirroring migration 19. Clean values (incl. multi-word names with no
// separator, e.g. "Ipanema", "Shopping Pátio Paulista") are left untouched.
//
// Idempotent — safe to re-run. Supports ?dryRun=true.
// ============================================================

const DESTINATION_CATEGORIES = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/** Comma or semicolon used to pack several regions into one string. */
const SEPARATOR_RE = /[,;]/;

interface SplitRegionsReport {
	destinationsScanned: number;
	entriesScanned: number;
	entriesUpdated: number;
	entriesAlreadyClean: number;
	errors: string[];
}

// ============================================================
// BATCH MANAGER
// ============================================================

class BatchManager {
	private batches: FirebaseFirestore.WriteBatch[] = [];
	private current: FirebaseFirestore.WriteBatch;
	private count = 0;

	constructor() {
		this.current = admin.firestore().batch();
		this.batches.push(this.current);
	}

	update(
		ref: FirebaseFirestore.DocumentReference,
		data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
	) {
		this.current.update(ref, data);
		this.rotate();
	}

	private rotate() {
		this.count++;
		if (this.count >= 500) {
			this.current = admin.firestore().batch();
			this.batches.push(this.current);
			this.count = 0;
		}
	}

	async commitAll() {
		console.log(`  Committing ${this.batches.length} batch(es)...`);
		for (const batch of this.batches) {
			await batch.commit();
		}
	}
}

// ============================================================
// Helpers
// ============================================================

/** Split one string on ","/";" into trimmed, non-empty parts. */
function splitRegionString(value: string): string[] {
	return value
		.split(SEPARATOR_RE)
		.map((part) => part.trim())
		.filter(Boolean);
}

/** Split + trim + de-duplicate region tokens (array elements or legacy string). */
function normalizeRegionTokens(tokens: string[]): string[] {
	const regions: string[] = [];
	const seen = new Set<string>();
	for (const token of tokens) {
		for (const part of splitRegionString(token)) {
			if (!seen.has(part)) {
				seen.add(part);
				regions.push(part);
			}
		}
	}
	return regions;
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';

	console.log(
		`[migration-22] Starting destination region split${dryRun ? ' (DRY RUN)' : ''}...`,
	);

	const report: SplitRegionsReport = {
		destinationsScanned: 0,
		entriesScanned: 0,
		entriesUpdated: 0,
		entriesAlreadyClean: 0,
		errors: [],
	};

	try {
		const db = admin.firestore();
		const destSnap = await db.collection('destinations').get();
		console.log(`[migration-22] Found ${destSnap.size} destination document(s).`);

		const batch = new BatchManager();

		for (const destDoc of destSnap.docs) {
			report.destinationsScanned++;
			const data = destDoc.data();
			const patch: Record<string, any> = {};

			for (const category of DESTINATION_CATEGORIES) {
				const entries = data[category];
				if (!entries || typeof entries !== 'object') continue;

				for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
					if (!entry || typeof entry !== 'object') continue;
					report.entriesScanned++;

					const hasRegions = Array.isArray(entry.regions);
					const regionFieldPresent =
						entry.region !== undefined && entry.region !== null;

					let newRegions: string[] | null = null;
					let deleteRegion = false;

					if (hasRegions) {
						// `regions` array is authoritative (migration 19 semantics) —
						// split any combined values. A leftover legacy string is
						// dropped, never merged.
						const current = (entry.regions as string[]).filter(
							(r): r is string => typeof r === 'string',
						);
						const normalized = normalizeRegionTokens(current);
						const unchanged =
							current.length === normalized.length &&
							current.every((region, i) => region === normalized[i]);
						if (!unchanged) newRegions = normalized;
						if (regionFieldPresent) deleteRegion = true;
					} else if (regionFieldPresent) {
						// No `regions` array yet — build it from the legacy `region`
						// value (split) and drop the legacy field.
						const tokens = typeof entry.region === 'string' ? [entry.region] : [];
						newRegions = normalizeRegionTokens(tokens);
						deleteRegion = true;
					}

					if (newRegions === null && !deleteRegion) {
						report.entriesAlreadyClean++;
						continue;
					}

					if (newRegions !== null) {
						patch[`${category}.${entryId}.regions`] = newRegions;
					}
					if (deleteRegion) {
						patch[`${category}.${entryId}.region`] = FieldValue.delete();
					}
					report.entriesUpdated++;
				}
			}

			if (Object.keys(patch).length === 0) continue;

			const noun = Object.keys(patch).length === 1 ? 'field' : 'fields';
			if (dryRun) {
				console.log(
					`  destinations/${destDoc.id}: would update ${Object.keys(patch).length} ${noun}.`,
				);
				continue;
			}

			console.log(
				`  destinations/${destDoc.id}: updating ${Object.keys(patch).length} ${noun}.`,
			);
			batch.update(destDoc.ref, patch);
		}

		if (!dryRun) {
			await batch.commitAll();
		}

		console.log('[migration-22] Done.', JSON.stringify(report, null, 2));
		res.status(200).json({ success: true, dryRun, report });
	} catch (err: any) {
		console.error('[migration-22] Fatal error:', err);
		report.errors.push(err.message || String(err));
		res.status(500).json({ success: false, dryRun, report });
	}
});
