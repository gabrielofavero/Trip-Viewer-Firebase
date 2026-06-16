/**
 * Firestore Read/Write Counter
 *
 * Tracks every Firestore read and write operation on the current page.
 * Exposed on `dev.firestore.stats` in dev mode (localhost).
 *
 * Usage in console:
 *   dev.firestore.stats           → { reads: N, writes: M, readPaths: [...], writeOps: [...] }
 *   dev.firestore.resetStats()    → reset counters to zero
 */

interface WriteOp {
  type: "set" | "update" | "overwrite" | "delete" | "create";
  path: string;
}

interface CounterStats {
  reads: number;
  writes: number;
  readPaths: string[];
  writeOps: WriteOp[];
}

const stats: CounterStats = {
  reads: 0,
  writes: 0,
  readPaths: [],
  writeOps: [],
};

export function incrementReads(path: string): void {
  stats.reads += 1;
  stats.readPaths.push(path);
}

export function incrementWrites(ops: WriteOp[]): void {
  stats.writes += ops.length;
  stats.writeOps.push(...ops);
}

export function resetCounters(): void {
  stats.reads = 0;
  stats.writes = 0;
  stats.readPaths = [];
  stats.writeOps = [];
}

export function getStats(): Readonly<CounterStats> {
  return {
    reads: stats.reads,
    writes: stats.writes,
    readPaths: [...stats.readPaths],
    writeOps: [...stats.writeOps],
  };
}
