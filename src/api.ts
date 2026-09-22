import type { ColonyPayload, LogLinePayload, TeamPayload, ThreadPayload } from './world/types';

export type AppMode = 'demo' | 'live' | 'team';

export interface ThreadsResult {
  source: 'live' | 'mock';
  threads: ThreadPayload[];
  liveCount: number;
  scannedAt: string;
  note?: string;
}

export async function fetchThreads(mode: AppMode): Promise<ThreadsResult> {
  const res = await fetch(`/api/threads?mode=${mode}`);
  if (!res.ok) throw new Error(`threads ${res.status}`);
  return res.json();
}

export async function fetchTeam(): Promise<TeamPayload> {
  const res = await fetch('/api/team');
  if (!res.ok) throw new Error(`team ${res.status}`);
  return res.json();
}

export async function updateTeamStatus(
  agentId: string,
  status: 'idle' | 'working' | 'blocked',
  task?: string,
): Promise<void> {
  const res = await fetch(`/api/team/${agentId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, task }),
  });
  if (!res.ok) throw new Error(`team status ${res.status}`);
}

export async function fetchLogs(
  mode: AppMode,
  threadId?: string,
): Promise<{ threadId: string | null; lines: LogLinePayload[] }> {
  const q = new URLSearchParams({ mode });
  if (threadId) q.set('threadId', threadId);
  const res = await fetch(`/api/logs?${q}`);
  if (!res.ok) throw new Error(`logs ${res.status}`);
  return res.json();
}

export async function fetchNextLog(teamMode = false): Promise<LogLinePayload> {
  const url = teamMode ? '/api/logs/next?team=1' : '/api/logs/next';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`logs/next ${res.status}`);
  const data = await res.json();
  return data.line as LogLinePayload;
}

export async function fetchColony(): Promise<ColonyPayload> {
  const res = await fetch('/api/colony');
  if (!res.ok) throw new Error(`colony ${res.status}`);
  return res.json();
}
