/**
 * Wraps "firebase emulators:start" so a rotating backup is created on exit.
 *
 * This is a drop-in replacement for the emulator command in the dev scripts.
 * It spawns the emulator with --import and --export-on-exit, forwards signals,
 * and runs the backup rotation script when the emulator shuts down.
 *
 * Usage (replaces direct emulator invocation):
 *   node scripts/dev/start-emulator.js
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_SCRIPT = path.join(ROOT, 'scripts', 'utils', 'backup.js');

console.log('\u{1F525} Starting Firebase emulators (with exit-backup)...\n');

const emulator = spawn(
  'firebase',
  [
    'emulators:start',
    '--import=./.emulator-data',
    '--export-on-exit=./.emulator-data',
  ],
  {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT,
  },
);

let backupRun = false;

function runBackup() {
  if (backupRun) return;
  backupRun = true;

  console.log('\n\u{1F4BE} Running exit backup...');
  try {
    execSync(`node "${BACKUP_SCRIPT}"`, {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('\u2705 Exit backup complete');
  } catch (e) {
    console.error('\u26A0\uFE0F  Exit backup failed:', e.message);
  }
}

// Forward signals to the emulator so --export-on-exit triggers properly
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    if (emulator.exitCode === null) {
      emulator.kill(signal);
    }
  });
});

// When the emulator exits, run the backup, then exit with the same code
emulator.on('exit', (code) => {
  // --export-on-exit has already saved .emulator-data/ by this point.
  // Now we snapshot it into the rotating backup directory.
  runBackup();
  process.exit(code ?? 0);
});

// If the wrapper itself crashes or is killed before the emulator exits,
// still try to run a backup (best-effort).
process.on('exit', () => {
  // Only if the emulator already exited (backupRun would be true already).
  // If the wrapper process is killed directly, the emulator child may
  // still get a chance to export, so we try a backup here too.
  runBackup();
});
