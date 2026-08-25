// ======= Daylight / Auto Theme (runtime counterpart) =======
//
// Reads the auto day/night state computed synchronously by the anti-FOUC
// script (public/assets/js/theme-init.js) and cached in sessionStorage under
// "autoTheme". The cache is keyed by IANA timezone + local date so it stays
// valid for the whole session but refreshes automatically on a new day or
// when the timezone changes.
//
// theme-init.js runs before first paint as a classic (non-module) script, so
// it is deliberately the single source of truth for the sunrise/sunset math
// and the timezone -> coordinates table. This module does NOT re-implement
// that logic (avoids drift); it only reads the cache. When the cache is
// missing (theme-init.js blocked, static export, tests, hot module load),
// autoVisibility() falls back to the fixed 6AM-6PM local rule.

export type AutoDayNight = 'day' | 'night' | null;

const AUTO_THEME_KEY = 'autoTheme';

function localDateKey(d: Date): string {
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${month}-${day}`;
}

/** IANA timezone name (e.g. "America/Sao_Paulo"), falling back to "UTC". */
export function getTimeZoneName(): string {
	try {
		return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
}

/**
 * Returns the cached auto state ('day' | 'night') if it is still valid for the
 * current timezone + local date, otherwise null.
 */
export function getAutoDayNight(now: Date = new Date()): AutoDayNight {
	let raw: string | null = null;
	try {
		raw = sessionStorage.getItem(AUTO_THEME_KEY);
	} catch {
		return null;
	}
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as { key?: string; state?: string };
		if (!parsed || (parsed.state !== 'day' && parsed.state !== 'night')) return null;
		const expectedKey = `${getTimeZoneName()}:${localDateKey(now)}`;
		if (parsed.key !== expectedKey) return null;
		return parsed.state;
	} catch {
		return null;
	}
}
