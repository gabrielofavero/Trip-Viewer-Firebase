/**
 * Wraps "firebase emulators:start" so a rotating backup is created on exit.
 *
 * This is a drop-in replacement for the emulator command in the dev scripts.
 * It spawns the emulator with --import and --export-on-exit, forwards signals,
 * and runs the backup rotation script when the emulator shuts down.
 *
 * Reliability extras (for the intermittent "Cannot determine backend
 * specification. Timeout after 10000" error):
 * - Waits for the compiled functions bundle (functions/lib/**) to exist before
 *   starting, so the emulator doesn't race against `tsc --watch` on cold starts.
 * - Sets FUNCTIONS_DISCOVERY_TIMEOUT so a slow function-module boot doesn't trip
 *   the CLI's default 10s discovery timeout.
 * - Auto-restarts the emulator if the functions backend fails to load and does
 *   not recover on its own, up to MAX_ATTEMPTS times.
 *
 * Usage (replaces direct emulator invocation):
 *   node scripts/dev/start-emulator.js
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_SCRIPT = path.join(ROOT, 'scripts', 'utils', 'backup.js');

// Compiled functions entrypoints the emulator needs to discover its backend.
// `tsc --watch` writes these incrementally; waiting for them avoids the
// cold-start race where discovery runs before the build finishes.
const FUNCTIONS_BUNDLES = [
  path.join(ROOT, 'functions', 'lib', 'index.js'),
  path.join(ROOT, 'functions', 'lib', 'dev', 'init-local-db.js'),
];

// How long to wait for the functions build output before giving up (ms).
const FUNCTIONS_READY_TIMEOUT_MS = 180_000;
// How long the emulator may take to boot + discover the functions backend (s).
// Overrides the CLI's default 10s via the supported FUNCTIONS_DISCOVERY_TIMEOUT.
const DISCOVERY_TIMEOUT_SECONDS = 120;
// Total number of emulator spawn attempts (1 initial + retries).
const MAX_ATTEMPTS = 3;
// Delay between attempts, to give tsc --watch a moment to settle (ms).
const RETRY_DELAY_MS = 2_000;
// Grace period after a failed load before force-restarting, so a transient
// failure that self-heals via the file watcher isn't restarted unnecessarily.
const KILL_GRACE_MS = 4_000;
// Signatures emitted by the Functions emulator when loading the backend.
const FAILURE_PATTERN =
  /Failed to load function definition from source|Cannot determine backend specification/i;
const SUCCESS_PATTERN = /Loaded functions definitions from source/i;

let emulator = null;
let attempt = 0;
let backupRun = false;
let userStopped = false;

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

function bundleReady() {
  return FUNCTIONS_BUNDLES.every((file) => {
    try {
      return fs.existsSync(file) && fs.statSync(file).size > 0;
    } catch {
      return false;
    }
  });
}

function waitForFunctionsBundle() {
  return new Promise((resolve) => {
    if (bundleReady()) {
      resolve();
      return;
    }
    console.log('\u23F3 Waiting for functions build output (functions/lib/**)...');
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (bundleReady()) {
        clearInterval(timer);
        console.log('\u2705 Functions build output ready.');
        resolve();
        return;
      }
      if (Date.now() - startedAt > FUNCTIONS_READY_TIMEOUT_MS) {
        clearInterval(timer);
        console.warn(
          `\u26A0\uFE0F  Functions build output missing after ${
            FUNCTIONS_READY_TIMEOUT_MS / 1000
          }s \u2014 starting emulators anyway (they may retry).`,
        );
        resolve();
      }
    }, 250);
  });
}

// Force-kills the whole emulator process tree. On Windows `emulator.kill()`
// would only kill the cmd.exe shell (leaving the firebase child orphaned and
// holding the ports), so we use taskkill /T instead.
function killEmulatorTree() {
  if (!emulator || emulator.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${emulator.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Already gone.
    }
  } else {
    try {
      process.kill(-emulator.pid, 'SIGTERM');
    } catch {
      try {
        emulator.kill('SIGTERM');
      } catch {
        // Already gone.
      }
    }
  }
}

function startEmulator() {
  attempt += 1;
  console.log(
    `\n\u{1F525} Starting Firebase emulators (attempt ${attempt}/${MAX_ATTEMPTS}, with exit-backup)...\n`,
  );

  let buffer = '';
  let failedToLoad = false;
  let killTimer = null;

  emulator = spawn(
    'firebase',
    ['emulators:start', '--import=./.emulator-data', '--export-on-exit=./.emulator-data'],
    {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd: ROOT,
      env: {
        ...process.env,
        FUNCTIONS_DISCOVERY_TIMEOUT: String(DISCOVERY_TIMEOUT_SECONDS),
      },
    },
  );

  const capture = (data, isErr) => {
    const text = data.toString();
    buffer = (buffer + text).slice(-65_536); // keep a rolling tail for matching

    if (SUCCESS_PATTERN.test(buffer)) {
      // The backend recovered on its own (e.g. via the file watcher) —
      // cancel any pending restart.
      failedToLoad = false;
      if (killTimer) {
        clearTimeout(killTimer);
        killTimer = null;
      }
    } else if (FAILURE_PATTERN.test(buffer)) {
      failedToLoad = true;
      if (!killTimer && attempt < MAX_ATTEMPTS) {
        // Give tsc --watch a moment to finish writing before force-restarting.
        killTimer = setTimeout(() => {
          killTimer = null;
          if (emulator && emulator.exitCode === null) {
            console.log('\n\u{1F504} Functions backend failed to load \u2014 restarting emulators...');
            killEmulatorTree();
          }
        }, KILL_GRACE_MS);
      }
    }

    // Mirror output so the user still sees the normal emulator logs.
    process[isErr ? 'stderr' : 'stdout'].write(text);
  };

  emulator.stdout.on('data', (data) => capture(data, false));
  emulator.stderr.on('data', (data) => capture(data, true));

  emulator.on('exit', (code) => {
    if (killTimer) {
      clearTimeout(killTimer);
      killTimer = null;
    }
    emulator = null;

    // If the user stopped the dev stack, never retry.
    if (userStopped) {
      runBackup();
      process.exit(code ?? 0);
      return;
    }

    const shouldRetry = (code !== 0 || failedToLoad) && attempt < MAX_ATTEMPTS;
    if (shouldRetry) {
      const reason = failedToLoad ? 'the functions backend failed to load' : `exit code ${code}`;
      console.log(
        `\n\u{1F504} Emulator stopped (${reason}). Retrying in ${RETRY_DELAY_MS / 1000}s...\n`,
      );
      setTimeout(startEmulator, RETRY_DELAY_MS);
      return;
    }

    if (failedToLoad) {
      console.warn(
        '\n\u26A0\uFE0F  Functions backend still failing to load after all retries. ' +
          'Check the functions build (npm --prefix functions run build).',
      );
    }
    runBackup();
    process.exit(code ?? 0);
  });
}

// Forward signals to the emulator so --export-on-exit triggers properly
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    userStopped = true;
    if (emulator && emulator.exitCode === null) {
      emulator.kill(signal);
    }
  });
});

// If the wrapper itself crashes or is killed before the emulator exits,
// still try to run a backup (best-effort).
process.on('exit', () => {
  // Only if the emulator already exited (backupRun would be true already).
  // If the wrapper process is killed directly, the emulator child may
  // still get a chance to export, so we try a backup here too.
  runBackup();
});

(async () => {
  await waitForFunctionsBundle();
  startEmulator();
})();
