import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HarnessAdapter, LogLine, Thread, ThreadStatus } from './types.js';

/**
 * Best-effort Cursor agent / transcript path scanner (Linux + macOS).
 * Returns [] when dirs are missing — never throws to callers.
 */
function candidateDirs(): string[] {
  const home = homedir();
  return [
    join(home, '.cursor', 'projects'),
    join(home, '.cursor', 'ai-tracking'),
    join(home, '.cursor', 'chats'),
    join(home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage'),
    join(home, '.config', 'Cursor', 'User', 'workspaceStorage'),
  ];
}

function statusFromName(name: string): ThreadStatus {
  const n = name.toLowerCase();
  if (n.includes('error') || n.includes('fail')) return 'errored';
  if (n.includes('wait')) return 'waiting';
  if (n.includes('done') || n.includes('complete')) return 'done';
  return 'idle';
}

function looksLikeSession(fileName: string, fullPath: string): boolean {
  const lower = fileName.toLowerCase();
  const pathLower = fullPath.toLowerCase();
  if (lower === 'tsconfig.json' || lower === 'package.json' || lower.endsWith('.d.ts')) {
    return false;
  }
  if (lower.endsWith('.jsonl')) return true;
  const hints = [
    'agent',
    'transcript',
    'chat',
    'composer',
    'conversation',
    'session',
    'aichat',
  ];
  return hints.some((h) => lower.includes(h) || pathLower.includes(`/${h}`));
}

async function walkJsonish(dir: string, depth: number, out: Thread[]): Promise<void> {
  if (depth > 4 || out.length >= 24) return;
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
      const n = ent.name.toLowerCase();
      if (
        n.includes('agent') ||
        n.includes('transcript') ||
        n.includes('chat') ||
        n.includes('composer') ||
        n.includes('session') ||
        depth < 2
      ) {
        await walkJsonish(full, depth + 1, out);
      }
      continue;
    }
    if (!ent.isFile()) continue;
    const lower = ent.name.toLowerCase();
    if (!(lower.endsWith('.json') || lower.endsWith('.jsonl') || lower.endsWith('.txt'))) continue;
    if (!looksLikeSession(ent.name, full)) continue;
    try {
      const st = await stat(full);
      let title = ent.name.replace(/\.(jsonl?|txt)$/i, '');
      let snippet: string | undefined;
      if (st.size < 512_000 && (lower.endsWith('.json') || lower.endsWith('.txt') || lower.endsWith('.jsonl'))) {
        const raw = await readFile(full, 'utf8');
        const head = raw.slice(0, 400);
        const m = head.match(/"title"\s*:\s*"([^"]+)"/);
        if (m) title = m[1];
        snippet = head.replace(/\s+/g, ' ').slice(0, 120);
      }
      out.push({
        id: `cursor-${createHash('sha1').update(full).digest('hex').slice(0, 16)}`,
        title: title.slice(0, 80),
        harness: 'cursor',
        status: statusFromName(ent.name),
        updatedAt: st.mtime.toISOString(),
        snippet,
        agentName: 'Cursor',
      });
    } catch {
      // skip unreadable files
    }
  }
}

export const cursorAdapter: HarnessAdapter = {
  name: 'cursor',
  async scanThreads() {
    const found: Thread[] = [];
    for (const dir of candidateDirs()) {
      if (!existsSync(dir)) continue;
      await walkJsonish(dir, 0, found);
    }
    return found;
  },
  async getLogs(threadId: string): Promise<LogLine[]> {
    if (!threadId.startsWith('cursor-')) return [];
    return [
      {
        id: `cursor-log-${threadId}-0`,
        threadId,
        timestamp: new Date().toISOString(),
        harness: 'cursor',
        level: 'info',
        message: 'Cursor adapter: transcript path found (content not streamed in MVP)',
      },
    ];
  },
};
