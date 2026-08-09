/**
 * quota.js — monthly usage ledger (self-accounting) for the Places worker.
 *
 * Google Maps Platform exposes NO "current usage / remaining quota" API, so
 * the worker cannot ask Google how much budget is left. Instead it keeps its
 * own ledger of the calls it makes and compares against a configured monthly
 * budget per key. This works precisely because the worker is the ONLY caller
 * of Google — the frontend talks to the worker, never to Google directly.
 *
 * Two buckets (one per Google key — user decision 2026-08-09):
 *   - `main`   — the FREE / trial key (search + details with `photos=false`)
 *   - `photos` — the REAL / paid key (`photos=true` on routes 1/2, route 3
 *                including each photo media call)
 *
 * The `photos` bucket is the one we protect for cost: at ≥ degradeRatio of
 * its budget the worker enters "limited" mode (photos off, search/details
 * keep running on the free key) and tags responses `limited: true`; once the
 * budget is fully spent it hard-blocks with 429 places/quota-exceeded.
 *
 * Budget semantics (budgets.main / budgets.photos):
 *   - `0`    → key DISABLED: the worker NEVER calls it. On routes 1/2 a disabled
 *              photos bucket degrades to the free main key and tags
 *              `limited: true`; route 3 returns `{ photos: [], limited: true }`.
 *              A disabled main bucket hard-blocks (there is no fallback).
 *              Optional hard-off — the normal $0 setup is the default budget
 *              (1,000 = the Enterprise+Atmosphere free cap; see config.js).
 *   - `> 0`  → monthly call cap: at ≥ degradeRatio the bucket is `limited`
 *              (degrade + tag); at 100% it is `exceeded` (429). Keep it at or
 *              below Google's FREE monthly cap for the SKU to stay at $0.
 *   - `< 0`  → unlimited (never gated). config.js always supplies a positive
 *              default, so this only appears when constructing manually.
 *
 * Storage:
 *   - When a Cloudflare KV namespace is bound as `PLACES_QUOTA`, counts are
 *     shared across every isolate (recommended for real cost protection; see
 *     README → "Quota / budget protection" for the one-time setup).
 *   - Otherwise it falls back to a module-scoped in-memory Map (per-isolate,
 *     best-effort — mirrors rate-limit.js). Local dev + tests work without KV.
 *
 * Counts reset naturally by month: keys are `quota:yyyy-mm:<bucket>`. Free
 * usage caps reset on the 1st at midnight Pacific — the UTC month key drifts
 * by a few hours at worst, which is acceptable for this guard.
 */

/** In-memory fallback store, shared across requests within an isolate. */
const memory = new Map();

/**
 * Month key like `2026-08` (UTC) — the budget window for the counters.
 * @param {Date} [date]
 * @returns {string}
 */
export function monthKey(date = new Date()) {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

/**
 * Create a quota tracker.
 * @param {{kv?: {get(key: string): Promise<string|null>, put(key: string, value: string): Promise<void>} | null,
 *          budgets?: {main?: number, photos?: number},
 *          degradeRatio?: number}} [opts]
 * @returns {{
 *   check(bucket: 'main'|'photos'): Promise<{allowed: boolean, limited: boolean, exceeded: boolean, disabled: boolean, usage: number, budget: number}>,
 *   record(bucket: 'main'|'photos', amount?: number): Promise<void>,
 * }}
 */
export function createQuotaTracker({ kv = null, budgets = {}, degradeRatio = 0.9 } = {}) {
	// Budget semantics: `0` = DISABLED (never call this key — the "spend $0"
	// mode); `> 0` = monthly call cap (degrade at ratio, hard-block at 100%);
	// missing/negative = unlimited (never gated; config.js supplies defaults).
	const mainBudget = Number.isFinite(budgets.main) ? budgets.main : -1;
	const photosBudget = Number.isFinite(budgets.photos) ? budgets.photos : -1;
	const ratio =
		Number.isFinite(degradeRatio) && degradeRatio > 0 && degradeRatio < 1 ? degradeRatio : 0.9;

	/** @param {'main'|'photos'} bucket */
	function budgetFor(bucket) {
		return bucket === 'photos' ? photosBudget : mainBudget;
	}

	/** @param {'main'|'photos'} bucket */
	function keyFor(bucket) {
		return `quota:${monthKey()}:${bucket}`;
	}

	/** Read the current count for a bucket (KV when available, else memory). */
	async function read(bucket) {
		const key = keyFor(bucket);
		if (kv) {
			try {
				const raw = await kv.get(key);
				const n = raw ? Number.parseInt(raw, 10) : 0;
				return Number.isFinite(n) ? n : 0;
			} catch {
				// KV read failed — fall through to memory for this read.
			}
		}
		return memory.get(key) ?? 0;
	}

	/** Persist a count (KV when available, else memory). */
	async function write(bucket, count) {
		const key = keyFor(bucket);
		if (kv) {
			try {
				await kv.put(key, String(count));
				return;
			} catch {
				// KV write failed — fall through to memory.
			}
		}
		memory.set(key, count);
	}

	return {
		/**
		 * Check a bucket's state. Budget `0` → `disabled` (never call the key;
		 * reported as always `limited` so callers with a fallback — photos →
		 * free main key — degrade instead of blocking). Budget `> 0`: `limited`
		 * at ≥ degradeRatio, `exceeded` at 100%. Negative → unlimited.
		 * @param {'main'|'photos'} bucket
		 */
		async check(bucket) {
			const budget = budgetFor(bucket);
			if (budget === 0) {
				return {
					allowed: true,
					limited: true,
					exceeded: false,
					disabled: true,
					usage: 0,
					budget,
				};
			}
			if (budget < 0) {
				return { allowed: true, limited: false, exceeded: false, disabled: false, usage: 0, budget };
			}
			const usage = await read(bucket);
			const exceeded = usage >= budget;
			const limited = !exceeded && usage >= budget * ratio;
			return { allowed: !exceeded, limited, exceeded, disabled: false, usage, budget };
		},
		/**
		 * Record `amount` more calls for a bucket (call after a successful
		 * Google call so the ledger matches what was actually consumed).
		 * @param {'main'|'photos'} bucket
		 */
		async record(bucket, amount = 1) {
			const key = keyFor(bucket);
			const current = kv ? await read(bucket) : (memory.get(key) ?? 0);
			await write(bucket, current + amount);
		},
	};
}
