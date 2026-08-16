/**
 * Frees dev ports before starting the dev stack — only when needed.
 *
 * The full `kill-ports` routine spawns PowerShell and is slow, so this script
 * does a fast Node-only check first (no subprocess overhead). If every dev
 * port is free it exits almost instantly; only if a port is actually in use
 * does it invoke `npm run kill-ports` to free it.
 *
 * Usage (run before the dev stack):
 *   node scripts/dev/ensure-ports-free.js
 */

const net = require('net');
const { execSync } = require('child_process');

// Must match the port list in the `kill-ports` npm script.
const PORTS = [8085, 9099, 5000, 5001, 4000, 8787, 8788];

function isPortBusy(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(false)));
    // No host specified -> binds all interfaces, mirrors the "any listener
    // on this port" semantics of the kill-ports PowerShell check.
    server.listen(port);
  });
}

async function main() {
  const busyPorts = [];
  for (const port of PORTS) {
    if (await isPortBusy(port)) busyPorts.push(port);
  }

  if (busyPorts.length === 0) {
    console.log('Dev ports are free');
    return;
  }

  console.log(`\u26A0\uFE0F  Port(s) in use (${busyPorts.join(', ')}) \u2014 freeing them...`);
  execSync('npm run kill-ports', { stdio: 'inherit', shell: true });
}

main().catch((err) => {
  console.error('\u274C Failed to ensure dev ports are free:', err.message);
  process.exit(1);
});
