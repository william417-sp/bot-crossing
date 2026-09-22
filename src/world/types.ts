export type AgentState = 'idle' | 'walking' | 'building' | 'waiting' | 'errored';

export type TeamStatus = 'idle' | 'working' | 'blocked';

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
  role?: string;
  teamStatus?: TeamStatus;
}

export interface ColonyPayload {
  version: number;
  theme: string;
  sites: Array<{ id: string; name: string; x: number; y: number; kind: string }>;
  agents: Array<{ id: string; name: string; x: number; y: number; color: string; role?: string }>;
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
  agentName?: string;
  level: string;
  message: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: TeamStatus;
  currentTask?: string;
  lastActive?: string;
}

export interface TeamPayload {
  members: TeamMember[];
  updatedAt: string;
}
