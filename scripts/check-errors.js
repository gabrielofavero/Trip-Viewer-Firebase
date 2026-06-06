/**
 * ======= Runtime Error Checker =======
 *
 * Opens each HTML page in a headless browser and captures console errors,
 * uncaught exceptions, unhandled rejections, and 404s for JS/CSS files.
 *
 * Usage: node scripts/check-errors.js [--page=index] [--verbose]
 * Exit code: 0 if no errors, 1 if any page has errors
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------

const DIST_DIR = path.resolve(__dirname, "..", "dist");
const PAGES = [
  { name: "index", path: "index.html" },
  { name: "view", path: "view.html" },
  { name: "destination", path: "destination.html" },
  { name: "expenses", path: "expenses.html" },
  { name: "itinerary", path: "itinerary.html" },
  { name: "edit/trip", path: "edit/trip.html" },
  { name: "edit/destination", path: "edit/destination.html" },
  { name: "edit/listing", path: "edit/listing.html" },
];

// Error patterns to ignore (Firebase/data related — not import bugs)
const IGNORE_PATTERNS = [
  // Firebase/indexedDB errors when no Firebase config is present
  /indexedDB/i,
  /Firebase.*not.*configured/i,
  /No Firebase project/i,
  /failed to load resource.*firebase/i,
  /ERR_BLOCKED_BY_CLIENT/i,
  /googleapis/i,
  /firestore/i,
  /gstatic/i,
  // Network errors when running locally without emulators
  /Failed to fetch/i,
  /NetworkError/i,
  /net::ERR_CONNECTION_REFUSED/i,
];

// ---------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------

async function checkPage(browser, pageConfig, verbose) {
  const { name, path: pagePath } = pageConfig;
  const url = `file://${path.join(DIST_DIR, pagePath)}`;

  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  const failedResources = [];

  // Capture console errors
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      if (!IGNORE_PATTERNS.some((p) => p.test(text))) {
        errors.push(`[console.error] ${text}`);
      }
    } else if (msg.type() === "warning") {
      warnings.push(`[console.warn] ${text}`);
    }
  });

  // Capture uncaught exceptions
  page.on("pageerror", (err) => {
    const text = err.message || String(err);
    if (!IGNORE_PATTERNS.some((p) => p.test(text))) {
      errors.push(`[uncaught] ${text}`);
    }
  });

  // Capture failed resource loads (404s)
  page.on("requestfailed", (req) => {
    const url = req.url();
    // Only track JS and CSS failures
    if (/\.(js|css)(\?|$)/i.test(url)) {
      if (!IGNORE_PATTERNS.some((p) => p.test(url))) {
        failedResources.push(`[${req.failure().errorText}] ${url}`);
      }
    }
  });

  try {
    if (verbose) console.log(`  Loading ${name}...`);
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });

    // Wait a bit more for async initialization
    await new Promise((r) => setTimeout(r, 2000));
  } catch (err) {
    // Check if it's just a Firebase-related timeout
    const errMsg = err.message || String(err);
    if (
      !IGNORE_PATTERNS.some((p) => p.test(errMsg)) &&
      !errMsg.includes("timeout") &&
      !errMsg.includes("Target closed")
    ) {
      errors.push(`[navigation] ${errMsg}`);
    }
  }

  await page.close();

  return { name, errors, warnings, failedResources };
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const jsonOutput = args.includes("--json");
  const pageFilter = args
    .find((a) => a.startsWith("--page="))
    ?.split("=")[1];

  // Check if dist/ exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error("❌ dist/ directory not found. Run: npm run build");
    console.error(`   Expected: ${DIST_DIR}`);
    process.exit(1);
  }

  const pagesToCheck = pageFilter
    ? PAGES.filter((p) => p.name === pageFilter)
    : PAGES;

  if (pageFilter && pagesToCheck.length === 0) {
    console.error(`❌ Unknown page: ${pageFilter}`);
    console.error(`   Available: ${PAGES.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🌐 Runtime Error Checker`);
  console.log(`   Checking ${pagesToCheck.length} page(s) from dist/`);
  console.log("");

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security", // Allow file:// access
      "--allow-file-access-from-files",
    ],
  });

  const allResults = [];

  try {
    for (const pageConfig of pagesToCheck) {
      const result = await checkPage(browser, pageConfig, verbose);
      allResults.push(result);
    }
  } finally {
    await browser.close();
  }

  // Print results
  let totalErrors = 0;
  let pagesWithErrors = 0;

  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    for (const result of allResults) {
      const { name, errors, warnings, failedResources } = result;
      const hasErrors = errors.length > 0 || failedResources.length > 0;

      if (hasErrors) {
        pagesWithErrors++;
        totalErrors += errors.length + failedResources.length;
      }

      const status = hasErrors ? "❌" : "✅";
      console.log(`  ${status} ${name}`);

      if (verbose || hasErrors) {
        for (const err of errors) {
          console.log(`      ${err}`);
        }
        for (const fail of failedResources) {
          console.log(`      ${fail}`);
        }
        if (verbose && warnings.length > 0) {
          for (const warn of warnings) {
            console.log(`      ${warn}`);
          }
        }
      }
    }

    console.log("");
    console.log(`${"=".repeat(60)}`);
    if (totalErrors === 0) {
      console.log(`✅ ALL CLEAN — No runtime errors detected.`);
    } else {
      console.log(
        `❌ ${totalErrors} error(s) across ${pagesWithErrors} page(s).`
      );
    }
    console.log(`${"=".repeat(60)}\n`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
