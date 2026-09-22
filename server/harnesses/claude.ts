import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HarnessAdapter, LogLine, Thread, ThreadStatus } from './types.js';

/**
 * Best-effort Claude Code session directory scanner.
 * Common locations vary by install; we probe a few and no-op if absent.
 */
function candidateDirs(): string[] {
  const home = homedir();
  return [
    join(home, '.claude', 'projects'),
    join(home, '.claude', 'sessions'),
    join(home, '.config', 'claude', 'sessions'),
    join(home, '.config', 'claude-code', 'sessions'),
    join(home, 'Library', 'Application Support', 'Claude', 'sessions'),
  ];
}

function statusFromMtime(mtimeMs: number): ThreadStatus {
  const age = Date.now() - mtimeMs;
  if (age < 5 * 60_000) return 'running';
  if (age < 60 * 60_000) return 'idle';
  return 'done';
}

async function scanDir(dir: string, out: Thread[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (out.length >= 24) break;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      // session folders
      try {
        const st = await stat(full);
        let title = ent.name;
        let snippet: string | undefined;
        // peek for a metadata / transcript file
        const kids = await readdir(full).catch(() => [] as string[]);
        const metaName = kids.find((k) => /session|meta|transcript|\.jsonl?$/i.test(k));
        if (metaName) {
          const metaPath = join(full, metaName);
          try {
            const raw = await readFile(metaPath, 'utf8');
            const head = raw.slice(0, 500);
            const m = head.match(/"title"\s*:\s*"([^"]+)"/) || head.match(/"name"\s*:\s*"([^"]+)"/);
            if (m) title = m[1];
            snippet = head.replace(/\s+/g, ' ').slice(0, 120);
          } catch {
            /* ignore */
          }
        }
        out.push({
          id: `claude-${createHash('sha1').update(full).digest('hex').slice(0, 16)}`,
          title: title.slice(0, 80),
          harness: 'claude',
          status: statusFromMtime(st.mtimeMs),
          updatedAt: st.mtime.toISOString(),
          snippet,
          agentName: 'Claude',
        });
      } catch {
        /* ignore */
      }
      continue;
    }
    if (ent.isFile() && /\.(jsonl?|txt)$/i.test(ent.name)) {
      try {
        const st = await stat(full);
        out.push({
          id: `claude-${createHash('sha1').update(full).digest('hex').slice(0, 16)}`,
          title: ent.name.replace(/\.(jsonl?|txt)$/i, '').slice(0, 80),
          harness: 'claude',
          status: statusFromMtime(st.mtimeMs),
          updatedAt: st.mtime.toISOString(),
          agentName: 'Claude',
        });
      } catch {
        /* ignore */
      }
    }
  }
}

export const claudeAdapter: HarnessAdapter = {
  name: 'claude',
  async scanThreads() {
    const found: Thread[] = [];
    for (const dir of candidateDirs()) {
      if (!existsSync(dir)) continue;
      await scanDir(dir, found);
    }
    return found;
  },
  async getLogs(threadId: string): Promise<LogLine[]> {
    if (!threadId.startsWith('claude-')) return [];
    return [
      {
        id: `claude-log-${threadId}-0`,
        threadId,
        timestamp: new Date().toISOString(),
        harness: 'claude',
        level: 'info',
        message: 'Claude adapter: session dir found (content not streamed in MVP)',
      },
    ];
  },
};
