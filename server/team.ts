import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEAM_PATH = join(__dirname, '..', 'data', 'team.json');
const STATUS_PATH = join(__dirname, '..', 'data', 'team-status.json');

export type TeamStatus = 'idle' | 'working' | 'blocked';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  description?: string;
  status: TeamStatus;
  currentTask?: string;
  lastActive?: string;
}

export interface TeamConfig {
  version: number;
  theme: string;
  workstations: Array<{ id: string; name: string; x: number; y: number; kind: string }>;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    x: number;
    y: number;
    color: string;
    description?: string;
  }>;
}

interface TeamStatusStore {
  [agentId: string]: {
    status: TeamStatus;
    currentTask?: string;
    lastActive: string;
  };
}

let statusCache: TeamStatusStore = {};
let lastStatusLoad = 0;

function loadTeamConfig(): TeamConfig {
  if (!existsSync(TEAM_PATH)) {
    return {
      version: 1,
      theme: 'stark-garage',
      workstations: [],
      agents: [],
    };
  }
  return JSON.parse(readFileSync(TEAM_PATH, 'utf8')) as TeamConfig;
}

function loadStatusStore(): TeamStatusStore {
  const now = Date.now();
  if (now - lastStatusLoad < 1000 && Object.keys(statusCache).length > 0) {
    return statusCache;
  }
  
  if (!existsSync(STATUS_PATH)) {
    statusCache = {};
    lastStatusLoad = now;
    return statusCache;
  }
  
  try {
    statusCache = JSON.parse(readFileSync(STATUS_PATH, 'utf8')) as TeamStatusStore;
    lastStatusLoad = now;
  } catch {
    statusCache = {};
  }
  return statusCache;
}

function saveStatusStore(store: TeamStatusStore): void {
  mkdirSync(dirname(STATUS_PATH), { recursive: true });
  writeFileSync(STATUS_PATH, JSON.stringify(store, null, 2) + '\n', 'utf8');
  statusCache = store;
  lastStatusLoad = Date.now();
}

export function getTeam(): { members: TeamMember[]; updatedAt: string } {
  const config = loadTeamConfig();
  const statusStore = loadStatusStore();
  
  const members: TeamMember[] = config.agents.map((agent) => {
    const stored = statusStore[agent.id];
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      status: stored?.status ?? 'idle',
      currentTask: stored?.currentTask,
      lastActive: stored?.lastActive,
    };
  });
  
  return {
    members,
    updatedAt: new Date().toISOString(),
  };
}

export function updateAgentStatus(
  agentId: string,
  status: TeamStatus,
  task?: string,
): { success: boolean; error?: string } {
  const config = loadTeamConfig();
  const agent = config.agents.find((a) => a.id === agentId);
  
  if (!agent) {
    return { success: false, error: 'Agent not found' };
  }
  
  const store = loadStatusStore();
  store[agentId] = {
    status,
    currentTask: task,
    lastActive: new Date().toISOString(),
  };
  saveStatusStore(store);
  
  return { success: true };
}

// Mock activity rotation for demo purposes
const MOCK_TASKS = [
  'Deploying client dashboard update',
  'Building new landing page component',
  'Optimizing API response times',
  'Reviewing pull request #42',
  'Updating design system tokens',
  'Running integration tests',
  'Syncing with external services',
  'Processing analytics data',
  'Generating weekly report',
  'Configuring workflow automation',
];

let mockRotationIndex = 0;

export function getMockTeamActivity(): { members: TeamMember[]; updatedAt: string } {
  const config = loadTeamConfig();
  const statusStore = loadStatusStore();
  
  // If there's real status data, use it
  if (Object.keys(statusStore).length > 0) {
    return getTeam();
  }
  
  // Otherwise, generate rotating mock activity
  mockRotationIndex = (mockRotationIndex + 1) % 100;
  
  const members: TeamMember[] = config.agents.map((agent, i) => {
    const phase = (mockRotationIndex + i * 17) % 30;
    let status: TeamStatus = 'idle';
    let currentTask: string | undefined;
    
    if (phase < 15) {
      status = 'working';
      currentTask = MOCK_TASKS[(mockRotationIndex + i) % MOCK_TASKS.length];
    } else if (phase < 18) {
      status = 'blocked';
      currentTask = 'Waiting for external API response';
    }
    
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      description: agent.description,
      status,
      currentTask,
      lastActive: new Date().toISOString(),
    };
  });
  
  return {
    members,
    updatedAt: new Date().toISOString(),
  };
}
