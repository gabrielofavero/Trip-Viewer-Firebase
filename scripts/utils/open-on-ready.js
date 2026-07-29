/**
 * Polls a URL until it responds, then opens it in the default browser.
 *
 * Usage:
 *   node scripts/utils/open-on-ready.js [url] [--timeout=60000]
 *
 * Defaults to http://127.0.0.1:5000 with a 60s timeout.
 */

const http = require('http');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const urlArg = args.find(a => !a.startsWith('--')) || 'http://127.0.0.1:5000';
const timeoutArg = args.find(a => a.startsWith('--timeout='));
const timeoutMs = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 60_000;

const POLL_INTERVAL = 500; // ms between checks
const startTime = Date.now();

console.log(`⏳ Waiting for ${urlArg} to be ready...`);

function tryConnect() {
  const elapsed = Date.now() - startTime;
  if (elapsed > timeoutMs) {
    console.error(`❌ Timed out after ${(elapsed / 1000).toFixed(1)}s waiting for ${urlArg}`);
    process.exit(1);
  }

  const req = http.get(urlArg, (res) => {
    // Any response (even 404) means the server is up
    console.log(`✅ Server ready after ${(elapsed / 1000).toFixed(1)}s (status ${res.statusCode})`);
    res.resume(); // consume response data to free up memory

    const command = process.platform === 'win32'
      ? `start ${urlArg}`
      : process.platform === 'darwin'
        ? `open ${urlArg}`
        : `xdg-open ${urlArg}`;

    exec(command, (err) => {
      if (err) {
        console.error('⚠️  Failed to open browser:', err.message);
      } else {
        console.log('🌐 Browser launched.');
      }
      process.exit(0);
    });
  });

  req.on('error', () => {
    // Server not ready yet — retry
    setTimeout(tryConnect, POLL_INTERVAL);
  });

  req.setTimeout(2000, () => {
    req.destroy();
    setTimeout(tryConnect, POLL_INTERVAL);
  });
}

tryConnect();
