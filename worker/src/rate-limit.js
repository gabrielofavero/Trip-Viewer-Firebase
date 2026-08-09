/**
 * rate-limit.js — in-memory per-UID sliding-window rate limiter.
 *
 * ⚠️ BEST-EFFORT ONLY: Cloudflare does NOT share memory across isolates, so this
 * limiter only counts requests hitting the same isolate. For strict per-uid
 * accounting in production, use the Cloudflare dashboard **Rate limiting rules**
 * (per-IP) or a KV / Durable Object counter. This satisfies "rate limit if
 * possible to check" for the v1 worker.
 */

/**
 * Create a sliding-window rate limiter keyed by UID.
 * @param {{limit?: number, windowMs?: number}} [opts]
 * @returns {{check(uid: string): boolean, reset(): void}}
 */
export function createRateLimiter({ limit = 60, windowMs = 60_000 } = {}) {
	/** @type {Map<string, number[]>} uid -> request timestamps within the window */
	const hits = new Map();

	function prune(uid) {
		const cutoff = Date.now() - windowMs;
		const stamps = (hits.get(uid) ?? []).filter((t) => t > cutoff);
		if (stamps.length === 0) {
			hits.delete(uid);
			return [];
		}
		return stamps;
	}

	return {
		/**
		 * Record a request for `uid`; returns `false` when the window is over limit.
		 * @param {string} uid
		 * @returns {boolean}
		 */
		check(uid) {
			const stamps = prune(uid);
			if (stamps.length >= limit) {
				hits.set(uid, stamps);
				return false;
			}
			stamps.push(Date.now());
			hits.set(uid, stamps);
			return true;
		},
		/** Clear all counters (mainly for tests). */
		reset() {
			hits.clear();
		},
	};
}
