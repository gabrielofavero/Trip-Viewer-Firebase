/**
 * Build-time HTML partial injector.
 *
 * Reads HTML files from the source (public/) directory, replaces
 * <!-- #include shared/FILE.html --> directives with the content of
 * the corresponding shared partial, substitutes {{PLACEHOLDER}} values,
 * and writes the result to dist/.
 *
 * This keeps the app fully static — no server-side includes needed.
 *
 * Usage (called from build.js):
 *   node scripts/build/inject-partials.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SHARED_DIR = path.join(PUBLIC_DIR, "shared");
const DIST_DIR = path.join(ROOT, "dist");

// ---------------------------------------------------------------------------
// Page-specific configuration
// ---------------------------------------------------------------------------

/**
 * Each page entry defines:
 *   source   — path to the source HTML (relative to PUBLIC_DIR)
 *   title    — page <title>
 *   entry    — JS module entry point (relative to the HTML file's location)
 *   useTopBar — whether to include the top-bar partial
 */
const PAGES = [
	// Root-level pages
	{
		source: "index.html",
		title: "TripViewer",
		entry: "assets/ts/pages/home/index-entry.js",
		useTopBar: true,
	},
	{
		source: "view.html",
		title: "TripViewer",
		entry: "assets/ts/pages/trip-detail/view-entry.js",
		useTopBar: true,
	},
	{
		source: "destination.html",
		title: "TripViewer",
		entry: "assets/ts/pages/destination/destination-entry.js",
		useTopBar: true,
	},
	{
		source: "expenses.html",
		title: "TripViewer",
		entry: "assets/ts/pages/expenses/expenses-entry.js",
		useTopBar: true,
	},
	{
		source: "itinerary.html",
		title: "TripViewer",
		entry: "assets/ts/pages/itinerary/itinerary-entry.js",
		useTopBar: true,
	},
	// Edit pages
	{
		source: "edit/trip.html",
		title: "TripViewer",
		entry: "../assets/ts/pages/edit-trip/trip-entry.js",
		useTopBar: true,
	},
	{
		source: "edit/destination.html",
		title: "TripViewer",
		entry: "../assets/ts/pages/edit-destination/destination-entry.js",
		useTopBar: true,
	},
	{
		source: "edit/listing.html",
		title: "TripViewer",
		entry: "../assets/ts/pages/edit-listing/listing-entry.js",
		useTopBar: true,
	},
];

// ---------------------------------------------------------------------------
// Per-page icon configuration for the top-bar partial
// ---------------------------------------------------------------------------

/**
 * Each entry defines the icons that vary per page in the top-bar.
 *   backIcon          — left-side navigation icon (back button or closeButton)
 *   nightModeClasses  — extra CSS classes for the night-mode toggle
 *   extraIcons        — additional icons after night-mode (share, export, print, menu, profile)
 */
const TOP_BAR_ICONS = {
	"index.html": {
		backIcon:
			'<i id="back" class="bx bx-arrow-back icon-buttons" style="display: none;"></i>',
		nightModeClasses: "",
		extraIcons:
			'<i id="profile-icon" class="icon-buttons" style="display: none;"></i>',
	},
	"view.html": {
		backIcon: "",
		nightModeClasses: "",
		extraIcons:
			'        <i id="share" class="bx bx-share-alt icon-buttons"></i>\n' +
			'        <i id="menu" class="bi bi-list mobile-nav-toggle d-xl-none"></i>',
	},
	"destination.html": {
		backIcon: '<i id="closeButton" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: "",
		extraIcons:
			'        <i id="share" style="display: none;" onclick="_share()" class="bx bx-share-alt icon-buttons"></i>',
	},
	"expenses.html": {
		backIcon: '<i id="closeButton" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: "",
		extraIcons: "",
	},
	"itinerary.html": {
		backIcon: '<i id="closeButton" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: " d-none d-xl-block",
		extraIcons:
			'        <i id="export" class="iconify icon-buttons d-none d-xl-block" data-icon="ph:export-bold"></i>\n' +
			'        <i id="print" class="iconify icon-buttons d-none d-xl-block" data-icon="lucide:printer"></i>\n' +
			'        <i id="menu" class="bi bi-list mobile-nav-toggle d-xl-none"></i>',
	},
	// Edit pages — all share the same icon layout
	"edit/trip.html": {
		backIcon:
			'<i onclick="window.location = \'{{HOME_HREF}}\'" id="back" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: "",
		extraIcons: "",
	},
	"edit/destination.html": {
		backIcon:
			'<i onclick="window.location = \'{{HOME_HREF}}\'" id="back" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: "",
		extraIcons: "",
	},
	"edit/listing.html": {
		backIcon:
			'<i onclick="window.location = \'{{HOME_HREF}}\'" id="back" class="bx bx-arrow-back icon-buttons"></i>',
		nightModeClasses: "",
		extraIcons: "",
	},
};

/**
 * Get top-bar icon replacements for a given page source.
 */
function getTopBarIcons(source) {
	const config = TOP_BAR_ICONS[source];
	if (!config) {
		console.warn(`[inject] WARNING: No top-bar icon config for: ${source}`);
		return { BACK_ICON: "", NIGHT_MODE_CLASSES: "", EXTRA_ICONS: "" };
	}
	return {
		BACK_ICON: config.backIcon,
		NIGHT_MODE_CLASSES: config.nightModeClasses,
		EXTRA_ICONS: config.extraIcons,
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read a shared partial file from public/shared/.
 */
function readPartial(name) {
	const filePath = path.join(SHARED_DIR, name);
	if (!fs.existsSync(filePath)) {
		console.warn(`[inject] WARNING: Shared partial not found: ${name}`);
		return `<!-- [inject] MISSING PARTIAL: ${name} -->`;
	}
	return fs.readFileSync(filePath, "utf8");
}

/**
 * Determine the asset prefix based on the source path depth.
 *   - Root pages (e.g., "index.html") → ""
 *   - Edit pages (e.g., "edit/trip.html") → "../"
 */
function getAssetPrefix(sourcePath) {
	const depth = sourcePath.split("/").length - 1;
	return depth === 0 ? "" : "../".repeat(depth);
}

/**
 * Determine the home href based on source path depth.
 *   - Root pages → "index.html"
 *   - Edit pages → "../index.html"
 */
function getHomeHref(sourcePath) {
	const depth = sourcePath.split("/").length - 1;
	return depth === 0 ? "index.html" : "../".repeat(depth) + "index.html";
}

/**
 * Replace all placeholders in a string.
 */
function replacePlaceholders(template, replacements) {
	let result = template;
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}
	return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function inject(options = {}) {
	console.log("[inject] Processing HTML partials...");
	let count = 0;

	// Pre-load shared partials
	const partials = {
		"shared/head.html": readPartial("head.html"),
		"shared/scripts-vendor.html": readPartial("scripts-vendor.html"),
		"shared/scripts-core.html": readPartial("scripts-core.html"),
		"shared/top-bar.html": readPartial("top-bar.html"),
		"shared/nav-helper.html": readPartial("nav-helper.html"),
	};

	// LiveReload is included by default; pass { noLiveReload: true } to skip it
	if (!options.noLiveReload) {
		partials["shared/livereload.html"] = readPartial("livereload.html");
	}

	for (const page of PAGES) {
		const srcPath = path.join(PUBLIC_DIR, page.source);

		if (!fs.existsSync(srcPath)) {
			console.warn(`[inject] WARNING: Source not found: ${page.source}`);
			continue;
		}

		let html = fs.readFileSync(srcPath, "utf8");

		// Compute placeholders
		const assetPrefix = getAssetPrefix(page.source);
		const homeHref = getHomeHref(page.source);
		// Get top-bar icon configuration for this page
		const topBarIcons = getTopBarIcons(page.source);

		const replacements = {
			PAGE_TITLE: page.title,
			ASSET_PREFIX: assetPrefix,
			ENTRY_POINT: page.entry,
			HOME_HREF: homeHref,
			...topBarIcons,
		};

		// Replace includes
		for (const [includeName, partialContent] of Object.entries(partials)) {
			const includeDirective = `<!-- #include ${includeName} -->`;
			if (html.includes(includeDirective)) {
				// Apply placeholders to the partial content
				const processed = replacePlaceholders(partialContent, replacements);
				html = html.replace(includeDirective, processed);
			}
		}

		// Also replace any remaining placeholders in the main HTML
		// (e.g., if a page doesn't use includes but still has placeholders)
		html = replacePlaceholders(html, replacements);

		// Write to dist/
		const distPath = path.join(DIST_DIR, page.source);
		fs.mkdirSync(path.dirname(distPath), { recursive: true });
		fs.writeFileSync(distPath, html, "utf8");
		count++;
		console.log(`[inject]   ${page.source}`);
	}

	console.log(`[inject] Processed ${count} HTML file(s).`);
}

// --- Run (when called directly) ---
if (require.main === module) {
	inject();
}

// Export for use by build.js
module.exports = { inject };
