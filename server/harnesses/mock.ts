import type { HarnessAdapter, LogLine, Thread } from './types.js';

const NOW = Date.now();

// Team roster-aligned mock threads
const MOCK_THREADS: Thread[] = [
  {
    id: 'bot-cos',
    title: 'Orchestrating team workflow',
    harness: 'team',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 12_000).toISOString(),
    snippet: 'Delegating tasks to available bots…',
    agentName: 'Chief of Staff',
  },
  {
    id: 'bot-sites',
    title: 'Deploying client dashboard update',
    harness: 'team',
    status: 'running',
    repo: 'william/agency-sites',
    updatedAt: new Date(NOW - 45_000).toISOString(),
    snippet: 'Building production bundle…',
    agentName: 'Client Sites',
  },
  {
    id: 'bot-frontend',
    title: 'Designing new component library',
    harness: 'team',
    status: 'running',
    repo: 'william/design-system',
    updatedAt: new Date(NOW - 30_000).toISOString(),
    snippet: 'Creating button variants…',
    agentName: 'Front-End Designer',
  },
  {
    id: 'bot-world',
    title: 'Updating Bot Crossing visualization',
    harness: 'team',
    status: 'running',
    repo: 'william/bot-crossing',
    updatedAt: new Date(NOW - 8_000).toISOString(),
    snippet: 'Rendering garage environment…',
    agentName: 'Bot Crossing World',
  },
  {
    id: 'bot-assistant',
    title: 'Processing support requests',
    harness: 'team',
    status: 'idle',
    repo: 'william/assistant',
    updatedAt: new Date(NOW - 180_000).toISOString(),
    snippet: 'Standing by for tasks…',
    agentName: 'Assistant',
  },
  {
    id: 'bot-trade',
    title: 'Analyzing market data',
    harness: 'team',
    status: 'waiting',
    repo: 'william/tradebot',
    updatedAt: new Date(NOW - 60_000).toISOString(),
    snippet: 'Waiting for API rate limit reset…',
    agentName: 'Tradebot',
  },
];

// Team-appropriate log templates
interface LogTemplate {
  level: LogLine['level'];
  message: string;
  harness: string;
  agentName?: string;
}

const MOCK_LOG_TEMPLATES: LogTemplate[] = [
  { level: 'action', message: 'Chief of Staff: Assigning client dashboard task to Client Sites', harness: 'team', agentName: 'Chief of Staff' },
  { level: 'info', message: 'Client Sites: npm run build completed successfully', harness: 'team', agentName: 'Client Sites' },
  { level: 'action', message: 'Front-End Designer: Created new button component with hover states', harness: 'team', agentName: 'Front-End Designer' },
  { level: 'info', message: 'Bot Crossing World: Garage environment render pass complete', harness: 'team', agentName: 'Bot Crossing World' },
  { level: 'action', message: 'Assistant: Processed 3 incoming messages', harness: 'team', agentName: 'Assistant' },
  { level: 'warn', message: 'Tradebot: Rate limit approaching, throttling requests', harness: 'team', agentName: 'Tradebot' },
  { level: 'action', message: 'Chief of Staff: Team sync complete — 4 bots active', harness: 'team', agentName: 'Chief of Staff' },
  { level: 'info', message: 'Client Sites: Deployed to staging environment', harness: 'team', agentName: 'Client Sites' },
  { level: 'action', message: 'Front-End Designer: Updated color tokens in design system', harness: 'team', agentName: 'Front-End Designer' },
  { level: 'info', message: 'Bot Crossing World: Agent animation frames optimized', harness: 'team', agentName: 'Bot Crossing World' },
  { level: 'action', message: 'Assistant: Generated weekly status report', harness: 'team', agentName: 'Assistant' },
  { level: 'info', message: 'Tradebot: Market analysis complete — 12 signals processed', harness: 'team', agentName: 'Tradebot' },
  { level: 'action', message: 'Chief of Staff: Workflow checkpoint saved', harness: 'team', agentName: 'Chief of Staff' },
  { level: 'info', message: 'Client Sites: SSL certificate renewed automatically', harness: 'team', agentName: 'Client Sites' },
  { level: 'action', message: 'Front-End Designer: Responsive breakpoints configured', harness: 'team', agentName: 'Front-End Designer' },
  { level: 'info', message: 'Bot Crossing World: Hologram effects rendering at 60fps', harness: 'team', agentName: 'Bot Crossing World' },
  { level: 'action', message: 'Assistant: Email templates updated for Q4 campaign', harness: 'team', agentName: 'Assistant' },
  { level: 'warn', message: 'Tradebot: Unusual market volatility detected', harness: 'team', agentName: 'Tradebot' },
  { level: 'error', message: 'Client Sites: Build failed — missing dependency', harness: 'team', agentName: 'Client Sites' },
  { level: 'action', message: 'Chief of Staff: Escalated build failure to Front-End Designer', harness: 'team', agentName: 'Chief of Staff' },
];

// Legacy desert-themed templates for demo mode
const LEGACY_LOG_TEMPLATES: LogTemplate[] = [
  { level: 'action', message: 'Bot arrived at workstation — starting task', harness: 'mock' },
  { level: 'info', message: 'Compiling TypeScript build…', harness: 'mock' },
  { level: 'action', message: 'Waiting on external service response', harness: 'mock' },
  { level: 'info', message: 'Scanned project directories — no active sessions', harness: 'mock' },
  { level: 'action', message: 'Hologram display updated', harness: 'mock' },
  { level: 'info', message: 'Workspace state saved successfully', harness: 'mock' },
  { level: 'error', message: 'Task blocked — retrying with fallback', harness: 'mock' },
  { level: 'action', message: 'Synced workflow logs to panel', harness: 'mock' },
  { level: 'warn', message: 'Live mode idle — using demo stream', harness: 'mock' },
  { level: 'info', message: 'Team status refreshed', harness: 'mock' },
];

let logSeq = 0;

export function makeMockLog(threadId?: string, teamMode = false): LogLine {
  const templates = teamMode ? MOCK_LOG_TEMPLATES : LEGACY_LOG_TEMPLATES;
  const t = templates[logSeq % templates.length];
  logSeq += 1;
  const thread = MOCK_THREADS.find((x) => x.id === threadId) ?? MOCK_THREADS[logSeq % MOCK_THREADS.length];
  return {
    id: `log-${Date.now()}-${logSeq}`,
    threadId: threadId ?? thread.id,
    timestamp: new Date().toISOString(),
    harness: t.harness,
    level: t.level,
    message: t.message,
    agentName: t.agentName ?? thread.agentName,
  };
}

export function getMockLogs(threadId?: string, limit = 40, teamMode = false): LogLine[] {
  const lines: LogLine[] = [];
  const base = Date.now() - limit * 4000;
  const templates = teamMode ? MOCK_LOG_TEMPLATES : LEGACY_LOG_TEMPLATES;
  
  for (let i = 0; i < limit; i++) {
    const t = templates[i % templates.length];
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
      agentName: t.agentName ?? thread.agentName,
    });
  }
  if (threadId) {
    return lines.length
      ? lines
      : Array.from({ length: Math.min(8, limit) }, (_, i) => {
          const t = templates[i % templates.length];
          const thread = MOCK_THREADS.find((x) => x.id === threadId) ?? MOCK_THREADS[0];
          return {
            id: `mock-log-t-${i}`,
            threadId,
            timestamp: new Date(base + i * 5000).toISOString(),
            harness: t.harness,
            level: t.level,
            message: t.message,
            agentName: t.agentName ?? thread.agentName,
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
