import './styles/main.css';
import * as THREE from 'three';
import { fetchColony, fetchLogs, fetchNextLog, fetchThreads, fetchTeam, type AppMode } from './api';
import { appendLogLine, renderLogLines, setLogModeLabel } from './ui/logs';
import { hideAgentPanel, showAgentPanel } from './ui/panel';
import {
  syncAgentsFromThreads,
  updateAgents,
} from './world/agents';
import type { Agent, LogLinePayload, Site, TeamMember } from './world/types';
import {
  createWorld3D,
  resizeWorld3D,
  createGarage,
  updateGarage,
  createAgent3D,
  updateAgent3D,
  setAgentSelected,
  type World3DContext,
  type GarageElements,
  type Agent3D,
} from './world3d';
import { startBootSequence, getFlyInProgress, isBootComplete, type BootPhase } from './boot/boot';

const stage = document.getElementById('stage')!;
const canvas = document.getElementById('world') as HTMLCanvasElement;
canvas.style.display = 'none';

let mode: AppMode = 'demo';
let agents: Agent[] = [];
let sites: Site[] = [];
let logCache: LogLinePayload[] = [];
let selectedId: string | null = null;
let running = false;
let lastTs = 0;
let bootComplete = false;

// Camera fly-in animation parameters
const CAMERA_START = new THREE.Vector3(0, 8, 25);
const CAMERA_END = new THREE.Vector3(0, 4, 12);
const CAMERA_TARGET = new THREE.Vector3(0, 1, 0);

let world3d: World3DContext | null = null;
let garage: GarageElements | null = null;
let agents3d: Map<string, Agent3D> = new Map();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function resize(): void {
  if (world3d) {
    resizeWorld3D(world3d, stage);
  }
}

function setStatusPill(text: string): void {
  const el = document.getElementById('status-pill');
  if (el) el.textContent = text;
}

function setModeUI(m: AppMode): void {
  mode = m;
  document.getElementById('btn-demo')!.classList.toggle('active', m === 'demo');
  document.getElementById('btn-live')!.classList.toggle('active', m === 'live');
  document.getElementById('btn-team')!.classList.toggle('active', m === 'team');

  const labels: Record<AppMode, string> = {
    demo: 'Demo stream',
    live: 'Live harness',
    team: 'Team activity',
  };
  setLogModeLabel(labels[m]);
}

async function loadWorld(): Promise<void> {
  const colony = await fetchColony();
  sites = colony.sites.map((s) => ({
    ...s,
    progress: Math.random() * 0.3,
    active: false,
  }));
  agents = colony.agents.map((a, i) => {
    const site = sites[i % sites.length];
    return {
      id: a.id,
      name: a.name,
      x: a.x,
      y: a.y,
      targetX: site ? site.x : a.x,
      targetY: site ? site.y : a.y,
      color: a.color,
      state: 'idle' as const,
      siteId: site?.id ?? null,
      threadTitle: '',
      harness: 'team',
      statusLabel: 'idle',
      frame: Math.random() * 10,
      speed: 0.08 + Math.random() * 0.04,
      role: a.role,
      teamStatus: 'idle' as const,
    };
  });
}

function applyTeamStatus(team: TeamMember[]): void {
  for (const agent of agents) {
    const member = team.find((m) => m.id === agent.id || m.name.toLowerCase() === agent.name.toLowerCase());
    if (!member) continue;

    agent.teamStatus = member.status;
    agent.threadTitle = member.currentTask || '';

    if (member.status === 'working') {
      if (!agent.siteId && sites.length) {
        const site = sites[Math.floor(Math.random() * sites.length)];
        agent.siteId = site.id;
        agent.targetX = site.x + (Math.random() - 0.5) * 0.04;
        agent.targetY = site.y + (Math.random() - 0.5) * 0.03;
      }
      const dist = Math.hypot(agent.targetX - agent.x, agent.targetY - agent.y);
      agent.state = dist > 0.02 ? 'walking' : 'building';
      agent.statusLabel = 'working';
    } else if (member.status === 'blocked') {
      agent.state = 'waiting';
      agent.statusLabel = 'blocked';
    } else {
      if (agent.state === 'building') {
        agent.state = 'idle';
        agent.siteId = null;
      }
      agent.statusLabel = 'idle';
    }
  }
}

async function refreshThreads(): Promise<void> {
  try {
    if (mode === 'team') {
      const teamData = await fetchTeam();
      applyTeamStatus(teamData.members);
      const working = teamData.members.filter((m) => m.status === 'working').length;
      const blocked = teamData.members.filter((m) => m.status === 'blocked').length;
      if (working > 0 || blocked > 0) {
        setStatusPill(`team · ${working} working · ${blocked} blocked`);
      } else {
        setStatusPill('team · all idle');
      }
      return;
    }

    const result = await fetchThreads(mode);
    syncAgentsFromThreads(agents, result.threads, sites);
    if (mode === 'live') {
      if (result.source === 'live') {
        setStatusPill(`live · ${result.liveCount} sessions`);
      } else {
        setStatusPill(result.note ? 'live · no sessions' : 'live · mock fallback');
      }
    } else {
      setStatusPill('demo · mock harness');
    }
  } catch (err) {
    console.warn('threads refresh failed', err);
    setStatusPill('api error');
  }
}

async function refreshLogs(): Promise<void> {
  try {
    const { lines } = await fetchLogs(mode);
    logCache = lines;
    renderLogLines(lines);
  } catch (err) {
    console.warn('logs refresh failed', err);
  }
}

function init3DWorld(): void {
  world3d = createWorld3D(stage);

  garage = createGarage(world3d.scene, sites);

  for (const agent of agents) {
    const agent3d = createAgent3D(agent);
    agents3d.set(agent.id, agent3d);
    world3d.scene.add(agent3d.group);
  }

  world3d.renderer.domElement.addEventListener('click', onCanvasClick);
  world3d.renderer.domElement.addEventListener('pointermove', onPointerMove);
  world3d.renderer.domElement.style.cursor = 'grab';
}

function frame(ts: number): void {
  if (!running || !world3d || !garage) return;

  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;
  const time = ts / 1000;

  // Handle camera fly-in animation during boot
  const flyInProgress = getFlyInProgress();
  if (!bootComplete && flyInProgress < 1) {
    // Interpolate camera position from start to end
    world3d.camera.position.lerpVectors(CAMERA_START, CAMERA_END, flyInProgress);
    world3d.camera.lookAt(CAMERA_TARGET);
    // Disable controls during fly-in
    world3d.controls.enabled = false;
  } else if (!bootComplete && flyInProgress >= 1) {
    // Re-enable controls after fly-in
    world3d.controls.enabled = true;
  }

  updateAgents(agents, sites, dt);

  updateGarage(garage, time, sites);

  for (const agent of agents) {
    const agent3d = agents3d.get(agent.id);
    if (agent3d) {
      updateAgent3D(agent3d, agent, sites, time, dt);
      setAgentSelected(agent3d, agent.id === selectedId);
    }
  }

  if (bootComplete || flyInProgress >= 1) {
    world3d.controls.update();
  }

  world3d.composer.render();

  requestAnimationFrame(frame);
}

function onCanvasClick(ev: MouseEvent): void {
  if (!world3d) return;

  const rect = world3d.renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, world3d.camera);

  const agentGroups: THREE.Object3D[] = [];
  for (const agent3d of agents3d.values()) {
    agentGroups.push(agent3d.group);
  }

  const intersects = raycaster.intersectObjects(agentGroups, true);

  if (intersects.length > 0) {
    let hitObject = intersects[0].object;
    while (hitObject.parent && !hitObject.userData.agentId) {
      hitObject = hitObject.parent;
    }

    const agentId = hitObject.userData.agentId;
    if (agentId) {
      const hit = agents.find((a) => a.id === agentId);
      if (hit) {
        selectedId = hit.id;
        const related = logCache.filter((l) => l.threadId === hit.id || l.agentName === hit.name);
        showAgentPanel(hit, related.length ? related : logCache.slice(-6));
        void fetchLogs(mode, hit.id).then(({ lines }) => {
          showAgentPanel(hit, lines);
        });
        return;
      }
    }
  }

  selectedId = null;
  hideAgentPanel();
}

function onPointerMove(_ev: PointerEvent): void {
  if (!world3d) return;
  if (world3d.controls.enabled) {
    world3d.renderer.domElement.style.cursor = 'grab';
  }
}

async function tickDemoLog(): Promise<void> {
  if (mode !== 'demo' && mode !== 'team') return;
  try {
    const line = await fetchNextLog(mode === 'team');
    logCache.push(line);
    appendLogLine(line);
  } catch {
    /* ignore */
  }
}

function onBootProgress(phase: BootPhase, _progress: number): void {
  // Start rendering the 3D world during fly-in phase (behind boot screen)
  if (phase === 'flyIn' && !running && world3d) {
    running = true;
    requestAnimationFrame(frame);
  }
}

function onBootComplete(): void {
  bootComplete = true;
  running = true;
  
  // Show the main UI with entrance animations
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('loaded');
  }
  
  // Ensure controls are enabled
  if (world3d) {
    world3d.controls.enabled = true;
  }
  
  // Start the render loop if not already running
  if (!running) {
    requestAnimationFrame(frame);
  }
}

async function initWorld(): Promise<void> {
  window.addEventListener('resize', resize);

  document.getElementById('btn-demo')!.addEventListener('click', () => {
    setModeUI('demo');
    void refreshThreads();
    void refreshLogs();
  });
  document.getElementById('btn-live')!.addEventListener('click', () => {
    setModeUI('live');
    void refreshThreads();
    void refreshLogs();
  });
  document.getElementById('btn-team')!.addEventListener('click', () => {
    setModeUI('team');
    void refreshThreads();
    void refreshLogs();
  });
  document.getElementById('panel-close')!.addEventListener('click', () => {
    selectedId = null;
    hideAgentPanel();
  });

  setModeUI('team');
  await loadWorld();

  init3DWorld();
  
  // Position camera for fly-in start
  if (world3d) {
    world3d.camera.position.copy(CAMERA_START);
    world3d.camera.lookAt(CAMERA_TARGET);
    world3d.controls.enabled = false;
  }

  await refreshThreads();
  await refreshLogs();

  for (let i = 0; i < agents.length; i++) {
    if (i % 2 === 0 && agents[i].siteId) {
      agents[i].state = 'walking';
    }
  }

  setInterval(() => void refreshThreads(), 6000);
  setInterval(() => void tickDemoLog(), 2500);
}

async function init(): Promise<void> {
  // Pre-load world data during boot sequence
  const worldReady = initWorld();
  
  // Start the AAA console-style boot sequence
  startBootSequence({
    onComplete: async () => {
      // Ensure world is loaded before completing boot
      await worldReady;
      onBootComplete();
    },
    onProgress: onBootProgress,
  });
}

init().catch((err) => {
  console.error(err);
  setStatusPill('init failed');
});
