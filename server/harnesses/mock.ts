import type { HarnessAdapter, LogLine, Thread } from './types.js';

const NOW = Date.now();

const MOCK_THREADS: Thread[] = [
  {
    id: 'mock-claude-1',
    title: 'Scaffold desert colony layout',
    harness: 'mock',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 12_000).toISOString(),
    snippet: 'Placing scaffolding tents at dune sites…',
    agentName: 'Claude',
  },
  {
    id: 'mock-cursor-1',
    title: 'Wire Vite + Express harness API',
    harness: 'mock',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 45_000).toISOString(),
    snippet: 'GET /api/threads merging adapters',
    agentName: 'Cursor',
  },
  {
    id: 'mock-builder-1',
    title: 'Raise Burj silhouette props',
    harness: 'mock',
    status: 'waiting',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 90_000).toISOString(),
    snippet: 'Awaiting asset approval',
    agentName: 'Builder',
  },
  {
    id: 'mock-scout-1',
    title: 'Scan local Cursor session dirs',
    harness: 'mock',
    status: 'idle',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 180_000).toISOString(),
    snippet: 'No live sessions — staying in Demo',
    agentName: 'Scout',
  },
  {
    id: 'mock-dune-1',
    title: 'Parallax heat-haze pass',
    harness: 'mock',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 30_000).toISOString(),
    snippet: 'Golden-hour palette locked',
    agentName: 'Dune',
  },
  {
    id: 'mock-oasis-1',
    title: 'Colony layout persistence',
    harness: 'mock',
    status: 'done',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 300_000).toISOString(),
    snippet: 'Wrote data/colony.json',
    agentName: 'Oasis',
  },
  {
    id: 'mock-falcon-1',
    title: 'Pixel agent pathfinding',
    harness: 'mock',
    status: 'errored',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 60_000).toISOString(),
    snippet: 'Retry: site blocked by dune collision',
    agentName: 'Falcon',
  },
  {
    id: 'mock-mirage-1',
    title: 'Workflow log stream sync',
    harness: 'mock',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 8_000).toISOString(),
    snippet: 'Streaming mock actions ↔ agents',
    agentName: 'Mirage',
  },
];

const MOCK_LOG_TEMPLATES: Array<{ level: LogLine['level']; message: string; harness: string }> = [
  { level: 'action', message: 'Claude arrived at site α — raising scaffolding', harness: 'mock' },
  { level: 'info', message: 'Cursor: compiling Express middleware for /api/threads', harness: 'mock' },
  { level: 'action', message: 'Builder waiting on asset gate (tents)', harness: 'mock' },
  { level: 'info', message: 'Scout: checked ~/.cursor/ — no agent transcripts', harness: 'mock' },
  { level: 'action', message: 'Dune: heat-haze layer opacity → 0.18', harness: 'mock' },
  { level: 'info', message: 'Oasis: colony layout saved (6 sites)', harness: 'mock' },
  { level: 'error', message: 'Falcon: path blocked — re-routing around dune ridge', harness: 'mock' },
  { level: 'action', message: 'Mirage: synced 3 log lines to workflow panel', harness: 'mock' },
  { level: 'warn', message: 'Live mode idle — falling back to Demo stream', harness: 'mock' },
  { level: 'info', message: 'Harness merge: preferred live=0, using mock=8', harness: 'mock' },
  { level: 'action', message: 'Claude: progress bar site-α 42%', harness: 'mock' },
  { level: 'info', message: 'Cursor: TypeScript server build clean', harness: 'mock' },
  { level: 'action', message: 'Scout walking toward scan tower', harness: 'mock' },
  { level: 'info', message: 'Mirage: timestamp skew corrected (±120ms)', harness: 'mock' },
  { level: 'action', message: 'Builder resumed — placing tent frame', harness: 'mock' },
];

let logSeq = 0;

export function makeMockLog(threadId?: string): LogLine {
  const t = MOCK_LOG_TEMPLATES[logSeq % MOCK_LOG_TEMPLATES.length];
  logSeq += 1;
  const thread = MOCK_THREADS.find((x) => x.id === threadId) ?? MOCK_THREADS[logSeq % MOCK_THREADS.length];
  return {
    id: `log-${Date.now()}-${logSeq}`,
    threadId: threadId ?? thread.id,
    timestamp: new Date().toISOString(),
    harness: t.harness,
    level: t.level,
    message: t.message,
  };
}

export function getMockLogs(threadId?: string, limit = 40): LogLine[] {
  const lines: LogLine[] = [];
  const base = Date.now() - limit * 4000;
  for (let i = 0; i < limit; i++) {
    const t = MOCK_LOG_TEMPLATES[i % MOCK_LOG_TEMPLATES.length];
    const thread = threadId
      ? MOCK_THREADS.find((x) => x.id === threadId) ?? MOCK_THREADS[0]
      : MOCK_THREADS[i % MOCK_THREADS.length];
    if (threadId && thread.id !== threadId) continue;
    lines.push({
      id: `mock-log-${i}`,
      threadId: thread.id,
      timestamp: new Date(base + i * 4000).toISOString(),
      harness: t.harness,
      level: t.level,
      message: t.message,
    });
  }
  if (threadId) {
    // ensure we still return something for a specific thread
    return lines.length
      ? lines
      : Array.from({ length: Math.min(8, limit) }, (_, i) => {
          const t = MOCK_LOG_TEMPLATES[i % MOCK_LOG_TEMPLATES.length];
          return {
            id: `mock-log-t-${i}`,
            threadId,
            timestamp: new Date(base + i * 5000).toISOString(),
            harness: t.harness,
            level: t.level,
            message: `[${threadId}] ${t.message}`,
          };
        });
  }
  return lines;
}

export const mockAdapter: HarnessAdapter = {
  name: 'mock',
  async scanThreads() {
    return MOCK_THREADS.map((t) => ({
      ...t,
      updatedAt: new Date().toISOString(),
    }));
  },
  async getLogs(threadId: string) {
    return getMockLogs(threadId, 24);
  },
};

export { MOCK_THREADS };
