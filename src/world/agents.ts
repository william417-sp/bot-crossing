import type { Agent, AgentState, Site, ThreadPayload } from './types';

const STATE_FROM_THREAD: Record<string, AgentState> = {
  running: 'building',
  idle: 'idle',
  waiting: 'waiting',
  errored: 'errored',
  done: 'idle',
  working: 'building',
  blocked: 'waiting',
};

const STATE_ACCENT: Record<AgentState, string> = {
  idle: '#60a5fa',
  walking: '#fbbf24',
  building: '#34d399',
  waiting: '#f59e0b',
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
  t: number,
): void {
  for (const site of sites) {
    const x = site.x * w;
    const y = site.y * h;
    ctx.save();
    ctx.translate(x, y);

    // Ground contact glow
    ctx.fillStyle = site.active ? 'rgba(60, 180, 255, 0.15)' : 'rgba(40, 60, 90, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (site.kind === 'workbench') {
      drawWorkbench(ctx, t, site.active);
    } else if (site.kind === 'holodesk') {
      drawHolodesk(ctx, t, site.active);
    } else if (site.kind === 'server') {
      drawServerRack(ctx, t, site.active);
    } else if (site.kind === 'charger') {
      drawCharger(ctx, t, site.active);
    } else {
      drawFabricator(ctx, t, site.active);
    }

    // Label plate
    const label = site.name;
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    roundRect(ctx, -tw / 2 - 6, 18, tw + 12, 16, 3);
    ctx.fill();
    ctx.fillStyle = site.active ? 'rgba(100, 200, 255, 0.95)' : 'rgba(180, 200, 220, 0.85)';
    ctx.fillText(label, 0, 29);

    // Progress bar (holographic style)
    if (site.active || site.progress > 0.02) {
      const bw = 44;
      const bh = 5;
      const by = -58;

      // Outer glow
      ctx.fillStyle = 'rgba(60, 180, 255, 0.1)';
      roundRect(ctx, -bw / 2 - 3, by - 3, bw + 6, bh + 6, 4);
      ctx.fill();

      // Background
      ctx.fillStyle = 'rgba(20, 30, 50, 0.9)';
      roundRect(ctx, -bw / 2, by, bw, bh, 2);
      ctx.fill();

      // Progress fill
      const fillW = Math.max(2, bw * site.progress);
      const barGrad = ctx.createLinearGradient(-bw / 2, by, -bw / 2 + fillW, by);
      barGrad.addColorStop(0, '#3b82f6');
      barGrad.addColorStop(0.5, '#60a5fa');
      barGrad.addColorStop(1, '#93c5fd');
      ctx.fillStyle = barGrad;
      roundRect(ctx, -bw / 2, by, fillW, bh, 2);
      ctx.fill();

      // Shine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(-bw / 2 + 1, by + 1, fillW - 2, 1);
    }

    ctx.restore();
  }
}

function drawWorkbench(ctx: CanvasRenderingContext2D, t: number, active: boolean): void {
  // Table surface
  const tableGrad = ctx.createLinearGradient(-30, -20, 30, 0);
  tableGrad.addColorStop(0, '#2a3444');
  tableGrad.addColorStop(1, '#1e2836');
  ctx.fillStyle = tableGrad;
  roundRect(ctx, -30, -8, 60, 14, 2);
  ctx.fill();

  // Table legs
  ctx.fillStyle = '#1a222e';
  ctx.fillRect(-26, 2, 6, 10);
  ctx.fillRect(20, 2, 6, 10);

  // Tools on table
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(-20, -12, 8, 5);
  ctx.fillRect(-8, -14, 4, 7);
  ctx.fillRect(6, -11, 12, 4);

  if (active) {
    // Holographic display above bench
    drawMiniHolo(ctx, 0, -35, t, 0.7);

    // Tool glow
    ctx.fillStyle = 'rgba(60, 180, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-4, -10, 15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHolodesk(ctx: CanvasRenderingContext2D, t: number, active: boolean): void {
  // Base platform
  ctx.fillStyle = '#1a222e';
  roundRect(ctx, -28, 0, 56, 10, 3);
  ctx.fill();

  // Circular emitter
  ctx.strokeStyle = active ? 'rgba(60, 200, 255, 0.6)' : 'rgba(60, 100, 150, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 5, 20, 4, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (active) {
    // Holographic projection
    const pulse = 0.7 + 0.3 * Math.sin(t * 2);

    // Projection cone
    ctx.fillStyle = `rgba(60, 200, 255, ${0.08 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-25, -45);
    ctx.lineTo(25, -45);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();

    // Rotating hologram shape
    drawHoloSphere(ctx, 0, -28, t, pulse);

    // Data rings
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.4 * pulse})`;
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(0, -28);
    ctx.rotate(t * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawServerRack(ctx: CanvasRenderingContext2D, t: number, active: boolean): void {
  // Rack frame
  ctx.fillStyle = '#1a222e';
  roundRect(ctx, -22, -45, 44, 52, 2);
  ctx.fill();

  // Server units
  for (let i = 0; i < 4; i++) {
    const uy = -40 + i * 12;
    ctx.fillStyle = '#252d3a';
    roundRect(ctx, -18, uy, 36, 10, 1);
    ctx.fill();

    // LED indicators
    const ledActive = active && (Math.sin(t * 3 + i) > 0);
    ctx.fillStyle = ledActive ? '#34d399' : '#1e3a3a';
    ctx.beginPath();
    ctx.arc(-12, uy + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = active ? '#3b82f6' : '#1e3a5a';
    ctx.beginPath();
    ctx.arc(-6, uy + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Vent lines
    ctx.strokeStyle = 'rgba(60, 80, 120, 0.4)';
    ctx.lineWidth = 1;
    for (let v = 0; v < 3; v++) {
      ctx.beginPath();
      ctx.moveTo(2 + v * 5, uy + 2);
      ctx.lineTo(2 + v * 5, uy + 8);
      ctx.stroke();
    }
  }

  if (active) {
    // Activity glow
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = `rgba(60, 180, 255, ${0.15 * pulse})`;
    roundRect(ctx, -24, -47, 48, 56, 4);
    ctx.fill();
  }
}

function drawCharger(ctx: CanvasRenderingContext2D, t: number, active: boolean): void {
  // Charging pad
  ctx.fillStyle = '#1a222e';
  roundRect(ctx, -25, -5, 50, 14, 4);
  ctx.fill();

  // Energy rings on pad
  ctx.strokeStyle = active ? 'rgba(60, 200, 255, 0.5)' : 'rgba(60, 100, 150, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 2, 12, 2.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (active) {
    // Charging effect
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);

    // Vertical energy beam
    ctx.fillStyle = `rgba(60, 200, 255, ${0.15 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-4, -35);
    ctx.lineTo(4, -35);
    ctx.lineTo(8, 0);
    ctx.closePath();
    ctx.fill();

    // Energy particles rising
    for (let i = 0; i < 5; i++) {
      const py = -5 - ((t * 30 + i * 8) % 35);
      const px = Math.sin(t * 2 + i) * 4;
      ctx.fillStyle = `rgba(100, 220, 255, ${0.7 - Math.abs(py + 20) / 40})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center indicator
  ctx.fillStyle = active ? '#3b82f6' : '#2a3444';
  ctx.beginPath();
  ctx.arc(0, 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFabricator(ctx: CanvasRenderingContext2D, t: number, active: boolean): void {
  // Main unit body
  ctx.fillStyle = '#1a222e';
  roundRect(ctx, -24, -35, 48, 42, 3);
  ctx.fill();

  // Build chamber window
  ctx.fillStyle = active ? 'rgba(60, 180, 255, 0.15)' : 'rgba(40, 60, 90, 0.2)';
  roundRect(ctx, -18, -30, 36, 25, 2);
  ctx.fill();

  // Chamber frame
  ctx.strokeStyle = 'rgba(80, 120, 180, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-18, -30, 36, 25);

  if (active) {
    // Laser effect
    const laserX = Math.sin(t * 4) * 12;
    const laserY = Math.cos(t * 3) * 8 - 18;

    ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(laserX, laserY);
    ctx.stroke();

    // Laser glow
    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.beginPath();
    ctx.arc(laserX, laserY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Building object (wireframe cube)
    ctx.strokeStyle = 'rgba(60, 200, 255, 0.5)';
    ctx.lineWidth = 1;
    const cubeSize = 8 + Math.sin(t) * 2;
    ctx.strokeRect(-cubeSize / 2, -22 - cubeSize / 2, cubeSize, cubeSize);
  }

  // Control panel
  ctx.fillStyle = '#252d3a';
  ctx.fillRect(-20, 2, 40, 5);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = active && i === Math.floor(t * 2) % 4 ? '#3b82f6' : '#1e3a5a';
    ctx.beginPath();
    ctx.arc(-12 + i * 8, 4.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMiniHolo(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
  glow.addColorStop(0, 'rgba(60, 200, 255, 0.3)');
  glow.addColorStop(1, 'rgba(60, 200, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-20, -20, 40, 40);

  // Rotating wireframe
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.rotate(t * 0.8);

  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(8, 8);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(6, 6);
  ctx.moveTo(6, -6);
  ctx.lineTo(-6, 6);
  ctx.stroke();

  ctx.restore();
}

function drawHoloSphere(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);

  // Sphere glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  glow.addColorStop(0, `rgba(80, 200, 255, ${0.4 * alpha})`);
  glow.addColorStop(0.5, `rgba(60, 180, 255, ${0.2 * alpha})`);
  glow.addColorStop(1, 'rgba(60, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();

  // Wireframe sphere lines
  ctx.strokeStyle = `rgba(120, 220, 255, ${0.6 * alpha})`;
  ctx.lineWidth = 1;

  // Horizontal rings
  for (let i = -2; i <= 2; i++) {
    const ry = i * 4;
    const rx = Math.sqrt(Math.max(0, 144 - ry * ry));
    ctx.beginPath();
    ctx.ellipse(0, ry, rx, rx * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vertical meridians
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Data points
  for (let i = 0; i < 6; i++) {
    const angle = t + (i * Math.PI) / 3;
    const px = Math.cos(angle) * 10;
    const py = Math.sin(angle) * 10 * 0.4;
    ctx.fillStyle = `rgba(150, 230, 255, ${0.8 * alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Astro Bot-inspired cute robot agents */
export function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  w: number,
  h: number,
  selected = false,
): void {
  const x = agent.x * w;
  const y = agent.y * h;
  const scale = Math.max(2.2, Math.min(w, h) / 240);
  const px = Math.round(scale);

  // Bounce animation - more playful for idle, energetic for building
  const bounce =
    agent.state === 'walking'
      ? Math.abs(Math.sin(agent.frame * 2.5)) * px * 1.2
      : agent.state === 'building'
        ? Math.abs(Math.sin(agent.frame * 3.5)) * px * 0.8
        : agent.state === 'idle'
          ? Math.sin(agent.frame * 1.2) * px * 0.5
          : 0;

  // Slight tilt when walking
  const tilt = agent.state === 'walking' ? Math.sin(agent.frame * 2.5) * 0.08 : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - bounce));
  ctx.rotate(tilt);
  ctx.imageSmoothingEnabled = false;

  const body = agent.color;
  const shade = shadeColor(agent.color, -30);
  const light = shadeColor(agent.color, 40);
  const accent = STATE_ACCENT[agent.state];

  // Soft ground shadow
  ctx.save();
  ctx.rotate(-tilt);
  ctx.translate(0, bounce);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10 * px, 9 * px, 3 * px, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Selection glow ring
  if (selected) {
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 3 * px, 14 * px, 16 * px, 0, 0, Math.PI * 2);
    ctx.stroke();

    const selGlow = ctx.createRadialGradient(0, 0, 5 * px, 0, 0, 18 * px);
    selGlow.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
    selGlow.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = selGlow;
    ctx.fillRect(-20 * px, -20 * px, 40 * px, 40 * px);
  }

  // Feet (little rounded nubs)
  const footOff = agent.state === 'walking' ? Math.sin(agent.frame * 2.5) * px * 2 : 0;
  ctx.fillStyle = shade;
  roundRect(ctx, -5 * px + footOff, 6 * px, 4 * px, 3 * px, px);
  ctx.fill();
  roundRect(ctx, 1 * px - footOff, 6 * px, 4 * px, 3 * px, px);
  ctx.fill();

  // Body (rounded pill shape)
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-6 * px, 5 * px);
  ctx.lineTo(-7 * px, -2 * px);
  ctx.quadraticCurveTo(-7 * px, -6 * px, -4 * px, -7 * px);
  ctx.lineTo(4 * px, -7 * px);
  ctx.quadraticCurveTo(7 * px, -6 * px, 7 * px, -2 * px);
  ctx.lineTo(6 * px, 5 * px);
  ctx.quadraticCurveTo(6 * px, 7 * px, 4 * px, 7 * px);
  ctx.lineTo(-4 * px, 7 * px);
  ctx.quadraticCurveTo(-6 * px, 7 * px, -6 * px, 5 * px);
  ctx.closePath();
  ctx.fill();

  // Body highlight
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-5 * px, -6 * px);
  ctx.quadraticCurveTo(0, -8 * px, 5 * px, -6 * px);
  ctx.lineTo(4 * px, -4 * px);
  ctx.quadraticCurveTo(0, -5 * px, -4 * px, -4 * px);
  ctx.closePath();
  ctx.fill();

  // Chest light / core (pulsing)
  const corePulse = 0.7 + 0.3 * Math.sin(agent.frame * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * corePulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 2.5 * px, 0, Math.PI * 2);
  ctx.fill();

  const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 5 * px);
  coreGlow.addColorStop(0, `rgba(200, 230, 255, ${0.4 * corePulse})`);
  coreGlow.addColorStop(1, 'rgba(200, 230, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(-6 * px, -4 * px, 12 * px, 10 * px);

  // Arms (little nubs on sides)
  const armSwing = agent.state === 'walking' ? Math.sin(agent.frame * 2.5) * px * 1.5 : 
                   agent.state === 'building' ? Math.sin(agent.frame * 4) * px : 0;
  ctx.fillStyle = shade;
  roundRect(ctx, -10 * px, -2 * px + armSwing, 3 * px, 6 * px, px);
  ctx.fill();
  roundRect(ctx, 7 * px, -2 * px - armSwing, 3 * px, 6 * px, px);
  ctx.fill();

  // Head (big rounded dome - the cute factor)
  const headY = -11 * px;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, headY, 8 * px, 0, Math.PI * 2);
  ctx.fill();

  // Head highlight
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(-2 * px, headY - 3 * px, 4 * px, 0, Math.PI * 2);
  ctx.fill();

  // Visor (big expressive eyes area)
  ctx.fillStyle = '#0a1020';
  ctx.beginPath();
  ctx.ellipse(0, headY + px, 6 * px, 4 * px, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor glow
  const visorColor = agent.state === 'errored' ? 'rgba(248, 113, 113, 0.4)' :
                     agent.state === 'waiting' ? 'rgba(251, 191, 36, 0.4)' :
                     'rgba(100, 180, 255, 0.4)';
  ctx.fillStyle = visorColor;
  ctx.beginPath();
  ctx.ellipse(0, headY + px, 5.5 * px, 3.5 * px, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes in visor
  if (agent.state === 'errored') {
    // X eyes for error state
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = px * 0.8;
    ctx.beginPath();
    ctx.moveTo(-3 * px, headY - px);
    ctx.lineTo(-1 * px, headY + px);
    ctx.moveTo(-1 * px, headY - px);
    ctx.lineTo(-3 * px, headY + px);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1 * px, headY - px);
    ctx.lineTo(3 * px, headY + px);
    ctx.moveTo(3 * px, headY - px);
    ctx.lineTo(1 * px, headY + px);
    ctx.stroke();
  } else {
    // Happy/neutral eyes (white circles)
    const eyeBlink = Math.sin(agent.frame * 0.5) > 0.95 ? 0.2 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2.5 * px, headY + px * 0.5, 1.5 * px, 2 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2.5 * px, headY + px * 0.5, 1.5 * px, 2 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'rgba(200, 230, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-3 * px, headY - px * 0.3, px * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * px, headY - px * 0.3, px * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Antenna (cute little bump on top)
  ctx.fillStyle = shade;
  ctx.fillRect(-px * 0.5, headY - 10 * px, px, 3 * px);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, headY - 10 * px, px * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // State indicators
  if (agent.state === 'building') {
    // Tool in hand (wrench)
    ctx.save();
    ctx.translate(9 * px, -1 * px - armSwing);
    ctx.rotate(Math.sin(agent.frame * 4) * 0.4);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, -px, 6 * px, 2 * px);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(5 * px, -2 * px, 3 * px, 4 * px);
    ctx.restore();

    // Work sparks
    if (Math.random() < 0.3) {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.8)';
      ctx.beginPath();
      ctx.arc(10 * px + Math.random() * 5, -5 * px + Math.random() * 10, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (agent.state === 'waiting') {
    // Thought dots
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(agent.frame * 3);
    ctx.beginPath();
    ctx.arc(-3 * px, headY - 14 * px, px, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(agent.frame * 3 + 1);
    ctx.beginPath();
    ctx.arc(0, headY - 15 * px, px, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(agent.frame * 3 + 2);
    ctx.beginPath();
    ctx.arc(3 * px, headY - 14 * px, px, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (agent.state === 'errored') {
    // Alert symbol
    ctx.fillStyle = accent;
    ctx.font = `bold ${5 * px}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, headY - 13 * px);
  }

  // Status pip (top-right)
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(6 * px, -6 * px, px * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a1020';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.imageSmoothingEnabled = true;

  // Name tag (holographic style)
  const label = agent.name;
  ctx.font = `600 ${Math.max(9, 3.2 * px)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width;

  // Tag background
  ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
  roundRect(ctx, -tw / 2 - 6, 11 * px, tw + 12, 14, 3);
  ctx.fill();

  // Tag border glow
  ctx.strokeStyle = `rgba(${hexToRgb(body)}, 0.4)`;
  ctx.lineWidth = 1;
  roundRect(ctx, -tw / 2 - 6, 11 * px, tw + 12, 14, 3);
  ctx.stroke();

  // Tag text
  ctx.fillStyle = 'rgba(200, 220, 240, 0.95)';
  ctx.fillText(label, 0, 11 * px + 10);

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
    if (Math.abs(mx - ax) < 22 && Math.abs(my - ay) < 32) return a;
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

function hexToRgb(hex: string): string {
  const n = hex.replace('#', '');
  const num = parseInt(n.length === 3 ? n.split('').map((c) => c + c).join('') : n, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `${r}, ${g}, ${b}`;
}
