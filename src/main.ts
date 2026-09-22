import './styles/main.css';
import { fetchColony, fetchLogs, fetchNextLog, fetchThreads, type AppMode } from './api';
import { appendLogLine, renderLogLines, setLogModeLabel } from './ui/logs';
import { hideAgentPanel, showAgentPanel } from './ui/panel';
import {
  drawAgent,
  drawSites,
  hitTestAgent,
  syncAgentsFromThreads,
  updateAgents,
} from './world/agents';
import { drawDesert } from './world/desert';
import type { Agent, LogLinePayload, Site } from './world/types';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let mode: AppMode = 'demo';
let agents: Agent[] = [];
let sites: Site[] = [];
let logCache: LogLinePayload[] = [];
let selectedId: string | null = null;
let parallax = 0;
let running = true;
let lastTs = 0;

function resize(): void {
  const stage = document.getElementById('stage')!;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setStatusPill(text: string): void {
  const el = document.getElementById('status-pill');
  if (el) el.textContent = text;
}

function setModeUI(m: AppMode): void {
  mode = m;
  document.getElementById('btn-demo')!.classList.toggle('active', m === 'demo');
  document.getElementById('btn-live')!.classList.toggle('active', m === 'live');
  setLogModeLabel(m === 'demo' ? 'Demo stream' : 'Live harness');
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
      harness: 'mock',
      statusLabel: 'idle',
      frame: Math.random() * 10,
      speed: 0.08 + Math.random() * 0.04,
    };
  });
}

async function refreshThreads(): Promise<void> {
  try {
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

function frame(ts: number): void {
  if (!running) return;
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
  lastTs = ts;
  const t = ts / 1000;

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  parallax += dt * 0.12;
  updateAgents(agents, sites, dt);

  drawDesert(ctx, w, h, t, parallax);
  drawSites(ctx, sites, w, h);

  // Depth sort: farther agents (lower y) drawn first
  const sorted = [...agents].sort((a, b) => a.y - b.y);
  for (const agent of sorted) {
    drawAgent(ctx, agent, w, h, agent.id === selectedId);
  }

  requestAnimationFrame(frame);
}

function onCanvasClick(ev: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;
  const hit = hitTestAgent(agents, mx, my, canvas.clientWidth, canvas.clientHeight);
  if (hit) {
    selectedId = hit.id;
    const related = logCache.filter((l) => l.threadId === hit.id);
    showAgentPanel(hit, related.length ? related : logCache.slice(-6));
    void fetchLogs(mode, hit.id).then(({ lines }) => {
      showAgentPanel(hit, lines);
    });
  } else {
    selectedId = null;
    hideAgentPanel();
  }
}

async function tickDemoLog(): Promise<void> {
  if (mode !== 'demo') return;
  try {
    const line = await fetchNextLog();
    logCache.push(line);
    appendLogLine(line);
  } catch {
    /* ignore */
  }
}

async function init(): Promise<void> {
  resize();
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
  document.getElementById('panel-close')!.addEventListener('click', () => {
    selectedId = null;
    hideAgentPanel();
  });
  canvas.addEventListener('click', onCanvasClick);

  canvas.addEventListener('pointermove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const nx = (ev.clientX - rect.left) / rect.width - 0.5;
    parallax += nx * 0.008;
  });

  setModeUI('demo');
  await loadWorld();
  await refreshThreads();
  await refreshLogs();

  for (const a of agents) {
    if (a.siteId) {
      a.state = 'walking';
    }
  }

  requestAnimationFrame(frame);
  setInterval(() => void refreshThreads(), 8000);
  setInterval(() => void tickDemoLog(), 2800);
}

init().catch((err) => {
  console.error(err);
  setStatusPill('init failed');
});
