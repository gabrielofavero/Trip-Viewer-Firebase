/* =========================================================================
 * theme-init.js — synchronous <head> script (classic script, NO modules, NO
 * imports). Runs before first paint to set `data-theme` on <html> and avoid a
 * flash of the wrong theme.
 *
 * Resolution precedence (must mirror the app at runtime):
 *   1. URL param  ?visibility=dark|light        (explicit, e.g. shared links)
 *   2. sessionStorage "darkMode" = "true"|"false" (explicit user/app choice)
 *   3. Auto day/night for the user's timezone, fully OFFLINE, no permissions:
 *        - IANA timezone via Intl (never asks for location)
 *        - fixed table TZ -> representative [lat, lon] (no API)
 *        - NOAA sunrise/sunset for today
 *        - "day" if now is between sunrise and sunset, else "night"
 *      The result is cached in sessionStorage "autoTheme" (JSON keyed by
 *      timezone + local date) so the runtime module reuses it without
 *      re-running the math — see public/assets/ts/theme/daylight.ts.
 *
 * Unknown timezones / polar day-night / missing Intl fall back to a fixed
 * local rule: 6:00-18:00 = day, otherwise night.
 * ========================================================================= */
(function () {
	'use strict';

	// ---- Fixed timezone -> representative coordinates table -----------------
	// Representative points follow the IANA tzdb "zone.tab" (major city of
	// each zone). Used only to estimate the user's latitude/longitude so we can
	// compute an accurate sunrise/sunset without any location permission.
	var TZ = {
		// UTC / GMT
		UTC: [51.5, -0.13],
		GMT: [51.5, -0.13],
		'Etc/UTC': [51.5, -0.13],
		'Etc/GMT': [51.5, -0.13],

		// North America
		'America/New_York': [40.714, -74.006],
		'America/Chicago': [41.85, -87.65],
		'America/Denver': [39.739, -104.984],
		'America/Los_Angeles': [34.052, -118.244],
		'America/Phoenix': [33.448, -112.074],
		'America/Anchorage': [61.218, -149.9],
		'America/Adak': [51.88, -176.65],
		'Pacific/Honolulu': [21.307, -157.858],
		'America/Toronto': [43.653, -79.383],
		'America/Vancouver': [49.283, -123.121],
		'America/Halifax': [44.65, -63.6],
		'America/St_Johns': [47.567, -52.717],
		'America/Winnipeg': [49.883, -97.15],
		'America/Regina': [50.4, -104.65],
		'America/Edmonton': [53.55, -113.5],
		'America/Whitehorse': [60.717, -135.05],
		'America/Iqaluit': [63.75, -68.517],
		'America/Moncton': [46.1, -64.783],
		'America/Detroit': [42.333, -83.05],
		'America/Indianapolis': [39.767, -86.167],
		'America/Kentucky/Louisville': [38.25, -85.767],
		'America/Boise': [43.617, -116.2],
		'America/Dawson_Creek': [59.767, -120.233],
		'America/Creston': [49.1, -116.517],
		'America/Fort_Nelson': [58.8, -122.7],
		'America/Yakutat': [59.55, -139.733],
		'America/Sitka': [57.05, -135.333],
		'America/Nome': [64.5, -165.4],
		'Pacific/Pago_Pago': [-14.267, -170.7],

		// Mexico & Central America
		'America/Mexico_City': [19.428, -99.128],
		'America/Tijuana': [32.5, -117.017],
		'America/Hermosillo': [29.067, -110.95],
		'America/Mazatlan': [23.217, -106.417],
		'America/Chihuahua': [28.633, -106.083],
		'America/Guatemala': [14.6, -90.52],
		'America/Costa_Rica': [9.933, -84.083],
		'America/Panama': [8.983, -79.517],
		'America/Managua': [12.15, -86.267],
		'America/El_Salvador': [13.7, -89.2],
		'America/Tegucigalpa': [14.1, -87.217],
		'America/Belize': [17.5, -88.2],
		'America/Merida': [20.967, -89.617],
		'America/Monterrey': [25.667, -100.317],

		// Caribbean & Atlantic
		'America/Havana': [23.114, -82.367],
		'America/Jamaica': [18, -76.8],
		'America/Nassau': [25.083, -77.35],
		'America/Port-au-Prince': [18.539, -72.335],
		'America/Santo_Domingo': [18.467, -69.9],
		'America/Puerto_Rico': [18.468, -66.106],
		'America/Grand_Turk': [21.467, -71.133],
		'America/Thule': [76.567, -68.783],
		'America/Godthab': [64.183, -51.733],
		'America/Danmarkshavn': [76.767, -18.667],
		'America/Scoresbysund': [70.483, -21.95],
		'America/Martinique': [14.6, -61.083],
		'America/Guadeloupe': [16.267, -61.583],
		'America/Curacao': [12.117, -68.933],
		'America/Aruba': [12.5, -70.017],
		'America/Barbados': [13.1, -59.617],
		'America/Grenada': [12.05, -61.75],
		'America/St_Lucia': [14.017, -60.983],
		'America/St_Vincent': [13.133, -61.217],
		'America/Antigua': [17.117, -61.85],
		'America/Port_of_Spain': [10.65, -61.517],
		'America/Paramaribo': [5.867, -55.167],
		'America/Cayenne': [4.933, -52.317],
		'Atlantic/Bermuda': [32.283, -64.783],
		'Atlantic/Azores': [37.733, -25.667],
		'Atlantic/Cape_Verde': [14.917, -23.517],
		'Atlantic/Stanley': [-51.7, -57.85],
		'Atlantic/South_Georgia': [-54.283, -36.5],
		'Atlantic/Canary': [28.1, -15.4],
		'Atlantic/Faroe': [62.017, -6.767],
		'Atlantic/Reykjavik': [64.15, -21.95],

		// South America
		'America/Bogota': [4.711, -74.072],
		'America/Guayaquil': [-2.183, -79.883],
		'America/Lima': [-12.046, -77.043],
		'America/Caracas': [10.481, -66.904],
		'America/La_Paz': [-16.5, -68.15],
		'America/Manaus': [-3.1, -60.017],
		'America/Sao_Paulo': [-23.547, -46.636],
		'America/Rio_Branco': [-9.967, -67.8],
		'America/Cuiaba': [-15.6, -56.1],
		'America/Campo_Grande': [-20.45, -54.617],
		'America/Bahia': [-12.983, -38.517],
		'America/Recife': [-8.05, -34.9],
		'America/Fortaleza': [-3.717, -38.5],
		'America/Belem': [-1.45, -48.483],
		'America/Boa_Vista': [2.817, -60.667],
		'America/Araguaina': [-7.2, -48.2],
		'America/Maceio': [-9.667, -35.717],
		'America/Asuncion': [-25.267, -57.667],
		'America/Montevideo': [-34.858, -56.171],
		'America/Argentina/Buenos_Aires': [-34.613, -58.377],
		'America/Argentina/Cordoba': [-31.4, -64.183],
		'America/Argentina/Mendoza': [-32.883, -68.817],
		'America/Argentina/Salta': [-24.783, -65.417],
		'America/Argentina/Ushuaia': [-54.8, -68.3],
		'America/Santiago': [-33.457, -70.648],
		'America/Punta_Arenas': [-53.15, -70.917],
		'America/Chile/EasterIsland': [-27.15, -109.433],
		'America/Guyana': [6.8, -58.15],
		'America/Cayman': [19.3, -81.383],

		// Europe
		'Europe/London': [51.508, -0.126],
		'Europe/Dublin': [53.333, -6.249],
		'Europe/Lisbon': [38.717, -9.133],
		'Europe/Madrid': [40.417, -3.703],
		'Europe/Paris': [48.867, 2.333],
		'Europe/Berlin': [52.517, 13.383],
		'Europe/Brussels': [50.833, 4.333],
		'Europe/Amsterdam': [52.367, 4.9],
		'Europe/Rome': [41.9, 12.483],
		'Europe/Zurich': [47.383, 8.533],
		'Europe/Vienna': [48.2, 16.367],
		'Europe/Prague': [50.083, 14.433],
		'Europe/Warsaw': [52.25, 21.0],
		'Europe/Budapest': [47.5, 19.083],
		'Europe/Stockholm': [59.333, 18.05],
		'Europe/Oslo': [59.917, 10.75],
		'Europe/Copenhagen': [55.667, 12.583],
		'Europe/Helsinki': [60.167, 24.933],
		'Europe/Athens': [37.983, 23.733],
		'Europe/Istanbul': [41.017, 28.967],
		'Europe/Moscow': [55.75, 37.617],
		'Europe/Kyiv': [50.433, 30.517],
		'Europe/Kiev': [50.433, 30.517],
		'Europe/Bucharest': [44.433, 26.1],
		'Europe/Sofia': [42.683, 23.317],
		'Europe/Belgrade': [44.833, 20.5],
		'Europe/Zagreb': [45.8, 16.0],
		'Europe/Ljubljana': [46.05, 14.517],
		'Europe/Sarajevo': [43.867, 18.417],
		'Europe/Skopje': [42.0, 21.433],
		'Europe/Tirane': [41.333, 19.817],
		'Europe/Chisinau': [47.0, 28.85],
		'Europe/Riga': [56.95, 24.1],
		'Europe/Vilnius': [54.683, 25.317],
		'Europe/Tallinn': [59.417, 24.75],
		'Europe/Minsk': [53.9, 27.567],
		'Europe/Kaliningrad': [54.7, 20.5],
		'Europe/Volgograd': [48.7, 44.5],
		'Europe/Samara': [53.2, 50.15],
		'Europe/Yekaterinburg': [56.85, 60.6],
		'Europe/Gibraltar': [36.133, -5.35],
		'Europe/Monaco': [43.733, 7.417],
		'Europe/Luxembourg': [49.6, 6.15],
		'Europe/Malta': [35.9, 14.517],
		'Europe/Nicosia': [35.167, 33.367],

		// Middle East
		'Asia/Tel_Aviv': [32.083, 34.783],
		'Asia/Jerusalem': [31.781, 35.223],
		'Asia/Beirut': [33.883, 35.5],
		'Asia/Damascus': [33.5, 36.3],
		'Asia/Amman': [31.95, 35.933],
		'Asia/Baghdad': [33.35, 44.417],
		'Asia/Riyadh': [24.65, 46.7],
		'Asia/Dubai': [25.3, 55.3],
		'Asia/Muscat': [23.6, 58.583],
		'Asia/Qatar': [25.25, 51.567],
		'Asia/Kuwait': [29.333, 48.0],
		'Asia/Bahrain': [26.233, 50.567],
		'Asia/Tehran': [35.683, 51.417],
		'Asia/Yerevan': [40.183, 44.5],
		'Asia/Tbilisi': [41.717, 44.8],
		'Asia/Baku': [40.383, 49.85],

		// Asia
		'Asia/Tokyo': [35.689, 139.692],
		'Asia/Seoul': [37.566, 126.999],
		'Asia/Shanghai': [31.23, 121.474],
		'Asia/Hong_Kong': [22.285, 114.158],
		'Asia/Taipei': [25.05, 121.533],
		'Asia/Singapore': [1.29, 103.85],
		'Asia/Kuala_Lumpur': [3.167, 101.7],
		'Asia/Jakarta': [-6.2, 106.817],
		'Asia/Bangkok': [13.75, 100.517],
		'Asia/Ho_Chi_Minh': [10.75, 106.667],
		'Asia/Phnom_Penh': [11.55, 104.917],
		'Asia/Vientiane': [17.967, 102.6],
		'Asia/Manila': [14.6, 120.983],
		'Asia/Yangon': [16.783, 96.167],
		'Asia/Dhaka': [23.717, 90.4],
		'Asia/Kolkata': [22.573, 88.364],
		'Asia/Colombo': [6.933, 79.85],
		'Asia/Kathmandu': [27.717, 85.317],
		'Asia/Karachi': [24.867, 67.05],
		'Asia/Kabul': [34.517, 69.183],
		'Asia/Dushanbe': [38.583, 68.8],
		'Asia/Ashgabat': [37.95, 58.383],
		'Asia/Tashkent': [41.333, 69.3],
		'Asia/Bishkek': [42.9, 74.6],
		'Asia/Almaty': [43.25, 76.95],
		'Asia/Ulaanbaatar': [47.917, 106.883],
		'Asia/Novosibirsk': [55.033, 82.917],
		'Asia/Krasnoyarsk': [56.017, 92.833],
		'Asia/Irkutsk': [52.267, 104.333],
		'Asia/Yakutsk': [62.033, 129.733],
		'Asia/Vladivostok': [43.15, 131.883],
		'Asia/Magadan': [59.567, 150.8],
		'Asia/Kamchatka': [53.017, 158.65],
		'Asia/Omsk': [54.983, 73.367],
		'Asia/Srednekolymsk': [67.45, 153.7],

		// Africa
		'Africa/Cairo': [30.05, 31.25],
		'Africa/Casablanca': [33.533, -7.583],
		'Africa/Johannesburg': [-26.25, 28.0],
		'Africa/Lagos': [6.45, 3.4],
		'Africa/Accra': [5.55, -0.2],
		'Africa/Nairobi': [-1.283, 36.817],
		'Africa/Addis_Ababa': [9.033, 38.7],
		'Africa/Algiers': [36.75, 3.05],
		'Africa/Tunis': [36.8, 10.183],
		'Africa/Tripoli': [32.883, 13.183],
		'Africa/Khartoum': [15.6, 32.533],
		'Africa/Dakar': [14.667, -17.433],
		'Africa/Abidjan': [5.317, -4.033],
		'Africa/Luanda': [-8.833, 13.217],
		'Africa/Douala': [4.05, 9.7],
		'Africa/Kinshasa': [-4.3, 15.3],
		'Africa/Lubumbashi': [-11.667, 27.467],
		'Africa/Harare': [-17.817, 31.05],
		'Africa/Lusaka': [-15.417, 28.283],
		'Africa/Maputo': [-25.967, 32.583],
		'Africa/Gaborone': [-24.65, 25.9],
		'Africa/Windhoek': [-22.567, 17.083],
		'Africa/Ndjamena': [12.1, 15.05],
		'Africa/Bamako': [12.65, -8.0],
		'Africa/Ouagadougou': [12.367, -1.517],
		'Africa/Niamey': [13.517, 2.117],
		'Africa/Mogadishu': [2.067, 45.333],
		'Africa/Djibouti': [11.6, 43.15],
		'Africa/Asmara': [15.333, 38.933],
		'Africa/Dar_es_Salaam': [-6.8, 39.283],
		'Africa/Kampala': [0.317, 32.55],
		'Africa/Kigali': [-1.95, 30.05],
		'Africa/Bujumbura': [-3.383, 29.367],
		'Africa/Maseru': [-29.317, 27.483],
		'Africa/Mbabane': [-26.317, 31.133],
		'Africa/Malabo': [3.75, 8.783],
		'Africa/Libreville': [0.383, 9.45],
		'Africa/Brazzaville': [-4.267, 15.283],
		'Africa/Bangui': [4.367, 18.583],
		'Africa/Conakry': [9.517, -13.7],
		'Africa/Freetown': [8.483, -13.233],
		'Africa/Monrovia': [6.3, -10.8],
		'Africa/Nouakchott': [18.1, -15.95],
		'Africa/El_Aaiun': [27.167, -13.2],
		'Indian/Comoro': [-11.7, 43.233],
		'Indian/Mauritius': [-20.15, 57.483],
		'Indian/Reunion': [-20.883, 55.45],
		'Indian/Mahe': [-4.667, 55.45],
		'Indian/Antananarivo': [-18.917, 47.517],
		'Indian/Mayotte': [-12.783, 45.267],

		// Oceania
		'Australia/Sydney': [-33.867, 151.2],
		'Australia/Melbourne': [-37.817, 144.967],
		'Australia/Brisbane': [-27.467, 153.033],
		'Australia/Perth': [-31.95, 115.85],
		'Australia/Adelaide': [-34.933, 138.6],
		'Australia/Darwin': [-12.45, 130.833],
		'Australia/Hobart': [-42.883, 147.317],
		'Australia/Eucla': [-31.717, 128.867],
		'Australia/Lord_Howe': [-31.55, 159.083],
		'Pacific/Auckland': [-36.867, 174.767],
		'Pacific/Chatham': [-43.95, -176.55],
		'Pacific/Fiji': [-18.133, 178.417],
		'Pacific/Guam': [13.467, 144.75],
		'Pacific/Samoa': [-13.8, -171.767],
		'Pacific/Tahiti': [-17.533, -149.567],
		'Pacific/Noumea': [-22.267, 166.45],
		'Pacific/Port_Moresby': [-9.45, 147.183],
		'Pacific/Apia': [-13.833, -171.75],
		'Pacific/Easter': [-27.15, -109.433],
		'Pacific/Norfolk': [-29.05, 167.967],
		'Pacific/Kiritimati': [1.867, -157.433],
		'Pacific/Majuro': [7.15, 171.2],
		'Pacific/Tongatapu': [-21.167, -175.2],
		'Pacific/Palau': [7.333, 134.483],
		'Pacific/Pohnpei': [6.967, 158.2],
		'Pacific/Chuuk': [7.417, 151.783],
		'Pacific/Kosrae': [5.317, 162.983],
		'Pacific/Niue': [-19.05, -169.867],
		'Pacific/Rarotonga': [-21.2, -159.767],
		'Pacific/Wallis': [-13.283, -176.167],
		'Pacific/Fakaofo': [-9.367, -171.217],
		'Pacific/Nauru': [-0.55, 166.917],
		'Pacific/Tarawa': [1.417, 173.0],
	};

	function getTimeZone() {
		try {
			return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
		} catch (e) {
			return 'UTC';
		}
	}

	function toRad(d) {
		return (d * Math.PI) / 180;
	}
	function toDeg(r) {
		return (r * 180) / Math.PI;
	}
	function norm(m) {
		return ((m % 1440) + 1440) % 1440;
	}

	// NOAA sunrise/sunset for a date at lat/lon. Returns { rise, set } in
	// minutes since LOCAL midnight, or null for polar day/night.
	function sunTimes(lat, lon, date) {
		var dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
		var jd = Math.floor(date.getTime() / 86400000) + 2440587.5;
		var T = (jd - 2451545.0) / 36525;
		var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
		var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
		var Mr = toRad(M);
		var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
		var C =
			Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
			Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
			Math.sin(3 * Mr) * 0.000289;
		var trueLong = L0 + C;
		var omega = 125.04 - 1934.136 * T;
		var lambda = toRad(trueLong - 0.00569 - 0.00478 * Math.sin(toRad(omega)));
		var eps0 = 23.43929111 - T * (0.01300417 + T * (0.0000001639 - T * 0.0000005036));
		var eps = toRad(eps0 + 0.00256 * Math.cos(toRad(omega)));
		var decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
		var y = Math.pow(Math.tan(eps / 2), 2);
		var eot = 4 * toDeg(
			y * Math.sin(2 * toRad(L0)) -
				2 * e * Math.sin(Mr) +
				4 * e * y * Math.sin(Mr) * Math.cos(2 * toRad(L0)) -
				0.5 * y * y * Math.sin(4 * toRad(L0)) -
				1.25 * e * e * Math.sin(2 * Mr),
		);
		var latRad = toRad(lat);
		var cosH =
			(Math.cos(toRad(90.833)) - Math.sin(latRad) * Math.sin(decl)) /
			(Math.cos(latRad) * Math.cos(decl));
		if (cosH > 1 || cosH < -1) return null;
		var H = toDeg(Math.acos(cosH));
		var offset = -date.getTimezoneOffset(); // minutes east of UTC (positive = east)
		var rise = norm(720 - 4 * (lon + H) - eot + offset);
		var set = norm(720 - 4 * (lon - H) - eot + offset);
		return { rise: rise, set: set };
	}

	function isDayOrNight(date) {
		var coords = TZ[getTimeZone()];
		if (!coords) return null;
		var t = sunTimes(coords[0], coords[1], date);
		if (!t) return null;
		var nowMin = date.getHours() * 60 + date.getMinutes();
		if (t.rise < t.set) {
			return nowMin >= t.rise && nowMin < t.set ? 'day' : 'night';
		}
		// Day wraps past local midnight (high latitudes / midnight sun).
		return nowMin >= t.rise || nowMin < t.set ? 'day' : 'night';
	}

	function localDateKey(d) {
		var m = String(d.getMonth() + 1).padStart(2, '0');
		var day = String(d.getDate()).padStart(2, '0');
		return d.getFullYear() + '-' + m + '-' + day;
	}

	function getAutoState(now) {
		var tz = getTimeZone();
		var key = tz + ':' + localDateKey(now);
		var raw = null;
		try {
			raw = sessionStorage.getItem('autoTheme');
		} catch (e) {
			/* storage unavailable */
		}
		if (raw) {
			try {
				var cached = JSON.parse(raw);
				if (cached && cached.key === key && (cached.state === 'day' || cached.state === 'night')) {
					return cached.state;
				}
			} catch (e) {
				/* ignore corrupt cache */
			}
		}
		var state = isDayOrNight(now);
		if (state === null) {
			// Fallback: fixed 6:00-18:00 local = day (matches the old rule).
			var h = now.getHours();
			state = h >= 6 && h < 18 ? 'day' : 'night';
		}
		try {
			sessionStorage.setItem('autoTheme', JSON.stringify({ key: key, state: state }));
		} catch (e) {
			/* storage unavailable */
		}
		return state;
	}

	// ---- Resolve & apply ------------------------------------------------------
	var isDark = null;

	try {
		var visibility = new URLSearchParams(window.location.search).get('visibility');
		if (visibility === 'dark') isDark = true;
		else if (visibility === 'light') isDark = false;
	} catch (e) {
		/* ignore */
	}

	if (isDark === null) {
		var stored = null;
		try {
			stored = sessionStorage.getItem('darkMode');
		} catch (e) {
			/* storage unavailable */
		}
		if (stored === 'true') isDark = true;
		else if (stored === 'false') isDark = false;
	}

	if (isDark === null) {
		isDark = getAutoState(new Date()) === 'night';
	}

	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
})();
