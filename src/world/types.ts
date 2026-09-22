export type AgentState = 'idle' | 'walking' | 'building' | 'waiting' | 'errored';

export interface Site {
  id: string;
  name: string;
  x: number; // world 0–1
  y: number;
  kind: string;
  progress: number; // 0–1
  active: boolean;
}

export interface Agent {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  state: AgentState;
  siteId: string | null;
  threadTitle: string;
  harness: string;
  statusLabel: string;
  frame: number;
  speed: number;
}

export interface ColonyPayload {
  version: number;
  theme: string;
  sites: Array<{ id: string; name: string; x: number; y: number; kind: string }>;
  agents: Array<{ id: string; name: string; x: number; y: number; color: string }>;
}

export interface ThreadPayload {
  id: string;
  title: string;
  harness: string;
  status: string;
  snippet?: string;
  agentName?: string;
  updatedAt: string;
}

export interface LogLinePayload {
  id: string;
  threadId: string;
  timestamp: string;
  harness: string;
  level: string;
  message: string;
}
