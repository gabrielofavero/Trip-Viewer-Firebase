/**
 * Polls a URL until it responds, then opens it in the default browser.
 *
 * Usage:
 *   node scripts/utils/open-on-ready.js [url] [--timeout=60000]
 *
 * Defaults to http://localhost:5000 with a 60s timeout. Uses `localhost`
 * (not 127.0.0.1) because the local server can bind to either IPv4 or IPv6
 * (firebase serve binds ::1 on some setups), and `localhost` matches the
 * "Local server: http://localhost:PORT" URL both `firebase serve` and the
 * emulators report — so the readiness poll and the opened tab always work.
 *
 * Single-shot: opens the browser at most ONCE, then exits. A guard flag plus a
 * reliable, forced exit prevent duplicate tabs even when the readiness poll
 * races with the request timeout (previously, a Windows `start` child that kept
 * the command pipe open could leave the process alive and re-trigger the open
 * loop — the "✅ Server ready" repeated many times / many tabs" glitch).
 */

const http = require('http');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const urlArg = args.find(a => !a.startsWith('--')) || 'http://localhost:5000';
const timeoutArg = args.find(a => a.startsWith('--timeout='));
const timeoutMs = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 60_000;

const POLL_INTERVAL = 500; // ms between checks
const startTime = Date.now();
let opened = false; // guards against duplicate browser launches

console.log(`⏳ Waiting for ${urlArg} to be ready...`);

/** Opens the URL in the default browser exactly once. */
function openBrowser(url) {
  if (opened) return;
  opened = true;

  let cmd;
  let cmdArgs;
  if (process.platform === 'win32') {
    // `start "" <url>` — the empty quoted title stops the URL being mistaken
    // for a window title.
    cmd = 'cmd';
    cmdArgs = ['/c', 'start', '', url];
  } else if (process.platform === 'darwin') {
    cmd = 'open';
    cmdArgs = [url];
  } else {
    cmd = 'xdg-open';
    cmdArgs = [url];
  }

  // Detached + stdio ignored so the browser child can't hold this process
  // alive (which previously allowed the poll to keep firing and reopen tabs).
  const child = spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' });
  child.on('error', (err) => console.error('⚠️  Failed to open browser:', err.message));
  child.unref();
  console.log('🌐 Browser launched.');

  // Give the detached child a moment to start, then exit for sure. Even if
  // another readiness event races in during that window, `opened` stops it.
  setTimeout(() => process.exit(0), 500);
}

function tryConnect() {
  const elapsed = Date.now() - startTime;
  if (elapsed > timeoutMs) {
    console.error(`❌ Timed out after ${(elapsed / 1000).toFixed(1)}s waiting for ${urlArg}`);
    process.exit(1);
  }

  const req = http.get(urlArg, (res) => {
    // Any response (even 404) means the server is up.
    console.log(`✅ Server ready after ${(elapsed / 1000).toFixed(1)}s (status ${res.statusCode})`);
    res.resume(); // consume response data to free up memory
    openBrowser(urlArg); // single-shot: logs once, spawns once, exits
  });

  req.on('error', () => {
    // Server not ready yet — retry (only if we haven't already opened).
    if (!opened) setTimeout(tryConnect, POLL_INTERVAL);
  });

  // If a connection stalls (server accepts but never responds), give up and
  // poll again. Guarded so it can't re-trigger after we've already opened.
  req.setTimeout(2000, () => {
    if (opened) return;
    req.destroy();
    setTimeout(tryConnect, POLL_INTERVAL);
  });
}

tryConnect();
