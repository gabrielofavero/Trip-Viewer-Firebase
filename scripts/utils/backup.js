/**
 * Creates rotating backups of .emulator-data/ into .emulator-data-backups/.
 *
 * Usage:
 *   node scripts/utils/backup.js [--source=.emulator-data]
 *
 * - Copies the source directory into a timestamped folder under .emulator-data-backups/
 * - Keeps only the 3 most recent backups (oldest are pruned automatically)
 * - Works whether the emulator is running or not (copies the on-disk export)
 * - Prunes any stray `firebase-export-*` folders from the repo root (created by
 *   ad-hoc `firebase emulators:export` runs without a target dir) so
 *   `.emulator-data/` + `.emulator-data-backups/` stay the single source of truth
 */

const fs = require('fs');
const path = require('path');

// ── Configuration ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.join(ROOT, '.emulator-data-backups');
const DEFAULT_SOURCE = path.join(ROOT, '.emulator-data');
const MAX_BACKUPS = 3;

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith('--source='));
  const source = sourceArg ? path.resolve(sourceArg.split('=')[1]) : DEFAULT_SOURCE;

  if (!fs.existsSync(source)) {
    console.error(`\u274c Source directory not found: ${source}`);
    console.error('   Make sure the emulator has been run at least once.');
    process.exit(1);
  }

  // Ensure the backups directory exists
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Enforce single source of truth: remove stray firebase-export-* folders
  pruneStrayExports();

  // Create timestamped backup folder
  const timestamp = formatTimestamp(new Date());
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

  console.log(`\u{1F4E6} Creating backup: ${path.relative(ROOT, backupPath)}`);
  copyDirSync(source, backupPath);
  console.log('\u2705 Backup complete');

  // Prune old backups
  rotate();

  // Show current state
  listBackups();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Removes stray `firebase-export-*` folders from the repo root.
 *
 * The Firebase CLI creates these when `firebase emulators:export` (or
 * `emulators:start --export-on-exit`) is invoked WITHOUT a directory argument —
 * it auto-names the output `firebase-export-<timestamp>` in the CWD. They are
 * not part of the backup system: `.emulator-data/` (live export) +
 * `.emulator-data-backups/` (rotating snapshots) are the only source of truth.
 * Running this backup entry point keeps the root free of those strays.
 */
function pruneStrayExports() {
  const strays = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^firebase-export-/.test(e.name));

  if (strays.length === 0) {
    console.log('\u{1F9F9} No stray firebase-export-* folders to clean.');
    return;
  }

  for (const entry of strays) {
    const strayPath = path.join(ROOT, entry.name);
    console.log(`\u{1F9F9} Removing stray export (not part of the backup system): ${entry.name}`);
    fs.rmSync(strayPath, { recursive: true, force: true });
  }
  console.log(`\u2705 Removed ${strays.length} stray firebase-export-* folder(s).`);
}

/** Copies a directory recursively (sync, for simplicity with small exports). */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Prunes the oldest backups, keeping only MAX_BACKUPS. */
function rotate() {
  const backups = getBackupList();
  while (backups.length > MAX_BACKUPS) {
    const oldest = backups.shift();
    const oldPath = path.join(BACKUP_DIR, oldest);
    console.log(`\u{1F5D1}\uFE0F  Removing old backup: ${oldest}`);
    fs.rmSync(oldPath, { recursive: true, force: true });
  }
}

/** Returns sorted list of backup folder names (oldest first). */
function getBackupList() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('backup-'))
    .map((e) => e.name)
    .sort(); // ISO timestamp strings sort chronologically
}

/** Prints current backup listing. */
function listBackups() {
  const backups = getBackupList();
  console.log(`\n\ud83d\udcc1 Backups stored (${backups.length}/${MAX_BACKUPS}):`);
  if (backups.length === 0) {
    console.log('   (none)');
  } else {
    backups.forEach((b) => console.log(`   ${b}`));
  }
}

/** Formats a Date as YYYYMMDD-HHmmss (safe for folder names on all OS). */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// ── Entry ────────────────────────────────────────────────────────────────────

main();
