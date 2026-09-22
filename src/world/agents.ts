import type { Agent, AgentState, Site, ThreadPayload } from './types';

const STATE_FROM_THREAD: Record<string, AgentState> = {
  running: 'building',
  idle: 'idle',
  waiting: 'waiting',
  errored: 'errored',
  done: 'idle',
};

const STATE_ACCENT: Record<AgentState, string> = {
  idle: '#7dd3fc',
  walking: '#e8a84a',
  building: '#34d399',
  waiting: '#fbbf24',
  errored: '#f87171',
};

export function mapThreadStatus(status: string): AgentState {
  return STATE_FROM_THREAD[status] ?? 'idle';
}

export function syncAgentsFromThreads(
  agents: Agent[],
  threads: ThreadPayload[],
  sites: Site[],
): void {
  for (const agent of agents) {
    const thread =
      threads.find((t) => t.id === agent.id) ||
      threads.find((t) => t.agentName?.toLowerCase() === agent.name.toLowerCase());
    if (!thread) continue;
    agent.threadTitle = thread.title;
    agent.harness = thread.harness;
    agent.statusLabel = thread.status;
    const next = mapThreadStatus(thread.status);
    if (next === 'building' || next === 'walking') {
      if (!agent.siteId && sites.length) {
        const site = sites[hashId(agent.id) % sites.length];
        agent.siteId = site.id;
        agent.targetX = site.x;
        agent.targetY = site.y;
      }
      const dist = Math.hypot(agent.targetX - agent.x, agent.targetY - agent.y);
      agent.state = dist > 0.02 ? 'walking' : 'building';
    } else {
      agent.state = next;
      if (next === 'waiting' || next === 'errored') {
        // linger near current site
      } else if (next === 'idle') {
        if (Math.random() < 0.02) {
          agent.targetX = clamp(agent.x + (Math.random() - 0.5) * 0.12, 0.1, 0.9);
          agent.targetY = clamp(agent.y + (Math.random() - 0.5) * 0.08, 0.45, 0.82);
          agent.state = 'walking';
          agent.siteId = null;
        }
      }
    }
  }
}

export function updateAgents(agents: Agent[], sites: Site[], dt: number): void {
  for (const agent of agents) {
    agent.frame += dt * (agent.state === 'building' ? 8 : 5);

    if (agent.state === 'walking') {
      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.01) {
        agent.x = agent.targetX;
        agent.y = agent.targetY;
        agent.state = agent.siteId ? 'building' : 'idle';
      } else {
        const step = agent.speed * dt;
        agent.x += (dx / dist) * Math.min(step, dist);
        agent.y += (dy / dist) * Math.min(step, dist);
      }
    }

    if (agent.state === 'building' && agent.siteId) {
      const site = sites.find((s) => s.id === agent.siteId);
      if (site) {
        site.active = true;
        site.progress = Math.min(1, site.progress + dt * 0.04);
        if (site.progress >= 1) {
          site.progress = 0;
          if (Math.random() < 0.4) {
            const next = sites[Math.floor(Math.random() * sites.length)];
            agent.siteId = next.id;
            agent.targetX = next.x + (Math.random() - 0.5) * 0.04;
            agent.targetY = next.y + (Math.random() - 0.5) * 0.03;
            agent.state = 'walking';
            site.active = false;
          }
        }
      }
    }

    if (agent.state === 'idle' && Math.random() < 0.008) {
      agent.targetX = clamp(agent.x + (Math.random() - 0.5) * 0.1, 0.12, 0.88);
      agent.targetY = clamp(agent.y + (Math.random() - 0.5) * 0.06, 0.48, 0.8);
      agent.state = 'walking';
    }
  }

  for (const site of sites) {
    const busy = agents.some((a) => a.siteId === site.id && a.state === 'building');
    if (!busy) site.active = false;
  }
}

export function drawSites(
  ctx: CanvasRenderingContext2D,
  sites: Site[],
  w: number,
  h: number,
): void {
  for (const site of sites) {
    const x = site.x * w;
    const y = site.y * h;
    ctx.save();
    ctx.translate(x, y);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(20, 10, 6, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (site.kind === 'scaffold') {
      drawScaffold(ctx);
    } else if (site.kind === 'tent') {
      drawTent(ctx);
    } else if (site.kind === 'tower') {
      drawTower(ctx);
    } else {
      drawDepot(ctx);
    }

    // Label plate
    const label = site.name;
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(12, 8, 6, 0.72)';
    roundRect(ctx, -tw / 2 - 6, 14, tw + 12, 16, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(245, 230, 208, 0.88)';
    ctx.fillText(label, 0, 25);

    // Progress bar
    if (site.active || site.progress > 0.02) {
      const bw = 40;
      const bh = 5;
      const by = -52;
      ctx.fillStyle = 'rgba(12, 8, 6, 0.75)';
      roundRect(ctx, -bw / 2 - 1, by - 1, bw + 2, bh + 2, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(40, 28, 18, 0.9)';
      roundRect(ctx, -bw / 2, by, bw, bh, 2);
      ctx.fill();
      const fillW = Math.max(2, bw * site.progress);
      const barGrad = ctx.createLinearGradient(-bw / 2, by, -bw / 2 + fillW, by);
      barGrad.addColorStop(0, '#2dd4a0');
      barGrad.addColorStop(1, '#6ee7b7');
      ctx.fillStyle = barGrad;
      roundRect(ctx, -bw / 2, by, fillW, bh, 2);
      ctx.fill();
      // thin highlight
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-bw / 2 + 1, by + 1, fillW - 2, 1);
    }

    ctx.restore();
  }
}

function drawScaffold(ctx: CanvasRenderingContext2D): void {
  // Soft back panels
  ctx.fillStyle = 'rgba(60, 40, 24, 0.55)';
  ctx.fillRect(-14, -30, 28, 28);
  // Platform base
  ctx.fillStyle = '#2e2014';
  ctx.fillRect(-17, -2, 34, 7);
  // Vertical posts
  ctx.strokeStyle = '#a87848';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'square';
  for (const ox of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(ox, -2);
    ctx.lineTo(ox, -32);
    ctx.stroke();
  }
  // Decks / floors
  ctx.fillStyle = 'rgba(140, 100, 55, 0.55)';
  for (const oy of [-10, -20, -30]) {
    ctx.fillRect(-14, oy - 1, 28, 3);
  }
  // Horizontal beams
  ctx.strokeStyle = '#c49860';
  ctx.lineWidth = 1.75;
  for (const oy of [-10, -20, -30]) {
    ctx.beginPath();
    ctx.moveTo(-14, oy);
    ctx.lineTo(14, oy);
    ctx.stroke();
  }
  // Cross braces
  ctx.strokeStyle = 'rgba(160, 120, 70, 0.65)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(0, -10);
  ctx.moveTo(14, -30);
  ctx.lineTo(0, -10);
  ctx.moveTo(-14, -20);
  ctx.lineTo(14, -10);
  ctx.stroke();
  // Amber caution stripes
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#e8a84a' : '#1a1210';
    ctx.fillRect(-16 + i * 8, 1, 8, 3);
  }
}

function drawTent(ctx: CanvasRenderingContext2D): void {
  // Canvas body
  const tentGrad = ctx.createLinearGradient(0, -28, 0, 6);
  tentGrad.addColorStop(0, '#d4883a');
  tentGrad.addColorStop(0.5, '#b06828');
  tentGrad.addColorStop(1, '#8a4820');
  ctx.fillStyle = tentGrad;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(20, 4);
  ctx.lineTo(-20, 4);
  ctx.closePath();
  ctx.fill();
  // Seam / ridge highlight
  ctx.strokeStyle = 'rgba(255, 220, 160, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(0, 4);
  ctx.stroke();
  // Shadow side
  ctx.fillStyle = 'rgba(40, 20, 8, 0.25)';
  ctx.beginPath();
  ctx.moveTo(0, -28);
  ctx.lineTo(20, 4);
  ctx.lineTo(0, 4);
  ctx.closePath();
  ctx.fill();
  // Door flap
  ctx.fillStyle = '#1a1008';
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(0, -8);
  ctx.lineTo(5, 4);
  ctx.closePath();
  ctx.fill();
  // Guy ropes
  ctx.strokeStyle = 'rgba(200, 170, 120, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.lineTo(-26, 8);
  ctx.moveTo(18, 2);
  ctx.lineTo(26, 8);
  ctx.stroke();
}

function drawTower(ctx: CanvasRenderingContext2D): void {
  // Mast
  const mast = ctx.createLinearGradient(-6, -42, 6, 4);
  mast.addColorStop(0, '#6a5040');
  mast.addColorStop(1, '#3a2818');
  ctx.fillStyle = mast;
  ctx.fillRect(-5, -38, 10, 42);
  // Lattice detail
  ctx.strokeStyle = 'rgba(200, 160, 100, 0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const oy = -6 - i * 7;
    ctx.beginPath();
    ctx.moveTo(-5, oy);
    ctx.lineTo(5, oy - 4);
    ctx.moveTo(5, oy);
    ctx.lineTo(-5, oy - 4);
    ctx.stroke();
  }
  // Beacon platform
  ctx.fillStyle = '#c4782a';
  ctx.fillRect(-12, -42, 24, 5);
  ctx.fillStyle = '#e8a84a';
  ctx.fillRect(-10, -44, 20, 3);
  // Beacon light
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(0, -48, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 200, 100, 0.25)';
  ctx.beginPath();
  ctx.arc(0, -48, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawDepot(ctx: CanvasRenderingContext2D): void {
  // Crate body
  const body = ctx.createLinearGradient(-18, -18, 18, 6);
  body.addColorStop(0, '#7a5430');
  body.addColorStop(1, '#4a3018');
  ctx.fillStyle = body;
  roundRect(ctx, -18, -16, 36, 20, 2);
  ctx.fill();
  // Lid
  ctx.fillStyle = '#a86f2a';
  roundRect(ctx, -20, -20, 40, 6, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 160, 0.2)';
  ctx.fillRect(-18, -19, 36, 2);
  // Band / stamp
  ctx.strokeStyle = '#e8a84a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-12, -10, 24, 10);
  ctx.fillStyle = 'rgba(232, 168, 74, 0.7)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SUPPLY', 0, -2);
}

/** Pixel agents with crisp integer scaling */
export function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  w: number,
  h: number,
  selected = false,
): void {
  const x = agent.x * w;
  const y = agent.y * h;
  const scale = Math.max(2, Math.min(w, h) / 260);
  const px = Math.round(scale);
  const bob =
    agent.state === 'walking'
      ? Math.sin(agent.frame * 2) * px * 0.8
      : agent.state === 'building'
        ? Math.sin(agent.frame * 3) * px * 0.4
        : agent.state === 'idle'
          ? Math.sin(agent.frame * 0.8) * px * 0.2
          : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  // Pixel-crisp
  ctx.imageSmoothingEnabled = false;

  const body = agent.color;
  const shade = shadeColor(agent.color, -35);
  const light = shadeColor(agent.color, 25);
  const outline = '#120c08';
  const accent = STATE_ACCENT[agent.state];

  // Soft ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 7 * px, 5.5 * px, 2.2 * px, 0, 0, Math.PI * 2);
  ctx.fill();

  // Selection glow
  if (selected) {
    ctx.strokeStyle = 'rgba(232, 168, 74, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2 * px, 11 * px, 14 * px, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232, 168, 74, 0.2)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 2 * px, 12 * px, 15 * px, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Legs
  const legOff = agent.state === 'walking' ? Math.sin(agent.frame * 2.2) * px * 1.6 : 0;
  const legOff2 = agent.state === 'walking' ? Math.sin(agent.frame * 2.2 + Math.PI) * px * 1.6 : 0;
  ctx.fillStyle = shade;
  ctx.fillRect(Math.round(-3 * px + legOff2), Math.round(2 * px), 2 * px, 4 * px);
  ctx.fillRect(Math.round(1 * px + legOff), Math.round(2 * px), 2 * px, 4 * px);

  // Body outline + fill
  ctx.fillStyle = outline;
  ctx.fillRect(-4 * px - 1, -6 * px - 1, 8 * px + 2, 9 * px + 2);
  ctx.fillStyle = body;
  ctx.fillRect(-4 * px, -6 * px, 8 * px, 9 * px);
  // Shoulder highlight
  ctx.fillStyle = light;
  ctx.fillRect(-4 * px, -6 * px, 8 * px, 2 * px);

  // Head
  ctx.fillStyle = outline;
  ctx.fillRect(-3 * px - 1, -11 * px - 1, 6 * px + 2, 5 * px + 2);
  ctx.fillStyle = '#f0e0c8';
  ctx.fillRect(-3 * px, -11 * px, 6 * px, 5 * px);

  // Eyes
  ctx.fillStyle = outline;
  if (agent.state === 'errored') {
    // X eyes
    ctx.fillRect(-2 * px, -9 * px, px, px);
    ctx.fillRect(1 * px, -9 * px, px, px);
  } else {
    ctx.fillRect(-2 * px, -9 * px, px, px);
    ctx.fillRect(1 * px, -9 * px, px, px);
    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-2 * px, -9 * px, Math.max(1, px / 2), Math.max(1, px / 2));
  }

  // Status accents
  if (agent.state === 'building') {
    // Hard hat
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-3 * px, -13 * px, 6 * px, 2 * px);
    ctx.fillRect(-2 * px, -14 * px, 4 * px, px);
    // Hammer swing
    const swing = Math.sin(agent.frame * 4) * 0.7;
    ctx.save();
    ctx.translate(5 * px, -2 * px);
    ctx.rotate(swing);
    ctx.fillStyle = '#8a5a28';
    ctx.fillRect(0, -px, 5 * px, px);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(4 * px, -2 * px, 2 * px, 3 * px);
    ctx.restore();
  } else if (agent.state === 'waiting') {
    ctx.fillStyle = accent;
    ctx.font = `600 ${Math.max(9, 4 * px)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('···', 0, -15 * px);
  } else if (agent.state === 'errored') {
    ctx.fillStyle = accent;
    ctx.font = `700 ${Math.max(10, 5 * px)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -15 * px);
  } else if (agent.state === 'walking') {
    // Small motion chevron
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-px, -13 * px, 2 * px, px);
    ctx.globalAlpha = 1;
  }

  // Status color pip (top-right of body)
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(4 * px, -5 * px, Math.max(1.5, px * 0.7), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Name tag
  ctx.imageSmoothingEnabled = true;
  const label = agent.name;
  ctx.font = `600 ${Math.max(9, 3.2 * px)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(12, 8, 6, 0.78)';
  roundRect(ctx, -tw / 2 - 4, 8 * px, tw + 8, 13, 3);
  ctx.fill();
  // Left accent bar matching agent color
  ctx.fillStyle = body;
  ctx.fillRect(-tw / 2 - 4, 8 * px + 2, 2, 9);
  ctx.fillStyle = 'rgba(245, 230, 208, 0.92)';
  ctx.fillText(label, 1, 8 * px + 10);

  ctx.restore();
}

export function hitTestAgent(
  agents: Agent[],
  mx: number,
  my: number,
  w: number,
  h: number,
): Agent | null {
  for (let i = agents.length - 1; i >= 0; i--) {
    const a = agents[i];
    const ax = a.x * w;
    const ay = a.y * h;
    if (Math.abs(mx - ax) < 18 && Math.abs(my - ay) < 28) return a;
  }
  return null;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shadeColor(hex: string, amt: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
