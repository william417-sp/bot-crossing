import { claudeAdapter } from './claude.js';
import { getMockLogs, makeMockLog, mockAdapter } from './mock.js';
import { cursorAdapter } from './cursor.js';
import type { LogLine, Thread } from './types.js';

export type { LogLine, Thread, ThreadStatus, HarnessAdapter } from './types.js';
export { getMockLogs, makeMockLog, mockAdapter, cursorAdapter, claudeAdapter };

export interface ThreadsResponse {
  source: 'live' | 'mock';
  threads: Thread[];
  liveCount: number;
  scannedAt: string;
  note?: string;
}

/**
 * Merge harness adapters. Prefer live Cursor/Claude threads when any exist;
 * otherwise fall back to rich mock demo data.
 */
export async function getMergedThreads(forceMock = false): Promise<ThreadsResponse> {
  if (forceMock) {
    const threads = await mockAdapter.scanThreads();
    return {
      source: 'mock',
      threads,
      liveCount: 0,
      scannedAt: new Date().toISOString(),
    };
  }

  const [cursorThreads, claudeThreads] = await Promise.all([
    cursorAdapter.scanThreads().catch(() => [] as Thread[]),
    claudeAdapter.scanThreads().catch(() => [] as Thread[]),
  ]);

  const live = [...cursorThreads, ...claudeThreads];
  if (live.length > 0) {
    return {
      source: 'live',
      threads: live,
      liveCount: live.length,
      scannedAt: new Date().toISOString(),
    };
  }

  const threads = await mockAdapter.scanThreads();
  return {
    source: 'mock',
    threads,
    liveCount: 0,
    scannedAt: new Date().toISOString(),
  };
}

export async function getLogsForThread(
  threadId: string,
  mode: 'demo' | 'live' = 'demo',
): Promise<LogLine[]> {
  if (mode === 'live') {
    if (threadId.startsWith('cursor-')) {
      const lines = await cursorAdapter.getLogs?.(threadId);
      if (lines && lines.length) return lines;
    }
    if (threadId.startsWith('claude-')) {
      const lines = await claudeAdapter.getLogs?.(threadId);
      if (lines && lines.length) return lines;
    }
  }
  return getMockLogs(threadId, 24);
}
