#!/usr/bin/env node
/**
 * ntfy.mjs — send an ntfy.sh notification to the TripViewer topic (`DeepSeek`).
 *
 * This is the ONE command to use for all task notifications. It avoids curl
 * quoting/PowerShell alias issues and keeps every notification consistent.
 *
 * Usage:
 *   node scripts/dev/ntfy.mjs "<title>" "<body>" [--tag <emoji_tag>] [--priority <low|default|high|urgent>] [--click <url>]
 *
 * Examples:
 *   node scripts/dev/ntfy.mjs "TripViewer: Done" "Build passed"
 *   node scripts/dev/ntfy.mjs "TripViewer: Need your input" "Approve browser validation?" --tag question --priority high
 *   node scripts/dev/ntfy.mjs "TripViewer: Still working..." "Step 3 of 8 — about half done" --tag hourglass_flowing_sand --priority low
 *   node scripts/dev/ntfy.mjs "TripViewer: Done" "Preview ready" --click http://localhost:5000
 *
 * NOTE: title must NOT contain a literal emoji — emoji comes from `--tag` only
 * (otherwise ntfy renders a double icon).
 */

const TOPIC = "DeepSeek";
const URL = `https://ntfy.sh/${TOPIC}`;

const args = process.argv.slice(2);
const title = args[0];
const body = args[1] ?? "";

function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

if (!title) {
  console.error(
    "Usage: node scripts/dev/ntfy.mjs \"<title>\" \"<body>\" [--tag <emoji_tag>] [--priority <low|default|high|urgent>] [--click <url>]",
  );
  process.exit(1);
}

const headers = {
  Title: title,
  Priority: flagValue("--priority") ?? "default",
};
const tag = flagValue("--tag");
if (tag) headers.Tags = tag;
const click = flagValue("--click");
if (click) headers.Click = click;

try {
  const res = await fetch(URL, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) {
    console.error(`ntfy error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  console.log(`ntfy sent: "${title}" (${tag ?? "no tag"}, ${headers.Priority})`);
} catch (err) {
  console.error(`ntfy error: ${err.message}`);
  process.exit(1);
}
