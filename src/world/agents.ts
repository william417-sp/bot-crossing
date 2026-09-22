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

/** Role-based visual config for distinct silhouettes */
const ROLE_VISUALS: Record<string, {
  headShape: 'round' | 'square' | 'tall' | 'wide';
  antennaStyle: 'single' | 'dual' | 'dish' | 'spike' | 'loop' | 'none';
  bodyAccent: 'badge' | 'stripe' | 'panel' | 'glow' | 'none';
  toolType: 'wrench' | 'tablet' | 'brush' | 'scanner' | 'clipboard' | 'chart';
  eyeStyle: 'round' | 'angular' | 'wide' | 'focused' | 'friendly';
}> = {
  coordinator: { headShape: 'round', antennaStyle: 'dual', bodyAccent: 'badge', toolType: 'clipboard', eyeStyle: 'focused' },
  deployer: { headShape: 'square', antennaStyle: 'spike', bodyAccent: 'stripe', toolType: 'tablet', eyeStyle: 'angular' },
  designer: { headShape: 'round', antennaStyle: 'loop', bodyAccent: 'glow', toolType: 'brush', eyeStyle: 'wide' },
  builder: { headShape: 'wide', antennaStyle: 'single', bodyAccent: 'panel', toolType: 'wrench', eyeStyle: 'round' },
  helper: { headShape: 'round', antennaStyle: 'dish', bodyAccent: 'badge', toolType: 'scanner', eyeStyle: 'friendly' },
  analyst: { headShape: 'tall', antennaStyle: 'dual', bodyAccent: 'stripe', toolType: 'chart', eyeStyle: 'angular' },
};

const DEFAULT_ROLE_VISUAL = { headShape: 'round' as const, antennaStyle: 'single' as const, bodyAccent: 'none' as const, toolType: 'wrench' as const, eyeStyle: 'round' as const };

/** Astro Bot-inspired cute robot agents with role-based distinct silhouettes */
export function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  w: number,
  h: number,
  selected = false,
): void {
  const x = agent.x * w;
  const y = agent.y * h;
  const scale = Math.max(2.4, Math.min(w, h) / 220);
  const px = Math.round(scale);

  const roleVisual = ROLE_VISUALS[agent.role ?? ''] ?? DEFAULT_ROLE_VISUAL;
  const isWorking = agent.state === 'building';
  const isIdle = agent.state === 'idle';
  const isWalking = agent.state === 'walking';

  // Bounce animation - calm idle, energetic working
  const bounce = isWalking
    ? Math.abs(Math.sin(agent.frame * 2.8)) * px * 1.5
    : isWorking
      ? Math.abs(Math.sin(agent.frame * 4)) * px * 1.2 + Math.abs(Math.cos(agent.frame * 6)) * px * 0.4
      : isIdle
        ? Math.sin(agent.frame * 0.8) * px * 0.25
        : 0;

  // Tilt - more pronounced when working
  const tilt = isWalking
    ? Math.sin(agent.frame * 2.8) * 0.1
    : isWorking
      ? Math.sin(agent.frame * 5) * 0.06
      : 0;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - bounce));
  ctx.rotate(tilt);
  ctx.imageSmoothingEnabled = false;

  const body = agent.color;
  const shade = shadeColor(agent.color, -35);
  const light = shadeColor(agent.color, 50);
  const accent = STATE_ACCENT[agent.state];

  // Working state particle aura
  if (isWorking) {
    drawWorkingAura(ctx, px, agent.frame, body);
  }

  // Ground shadow (size varies with state)
  ctx.save();
  ctx.rotate(-tilt);
  ctx.translate(0, bounce);
  const shadowSize = isWorking ? 1.15 : isIdle ? 0.9 : 1;
  ctx.fillStyle = `rgba(0, 0, 0, ${isWorking ? 0.45 : 0.32})`;
  ctx.beginPath();
  ctx.ellipse(0, 11 * px, 10 * px * shadowSize, 3.5 * px * shadowSize, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Selection glow ring
  if (selected) {
    const selPulse = 0.8 + 0.2 * Math.sin(agent.frame * 3);
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.7 * selPulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 2 * px, 15 * px, 18 * px, 0, 0, Math.PI * 2);
    ctx.stroke();

    const selGlow = ctx.createRadialGradient(0, 0, 6 * px, 0, 0, 22 * px);
    selGlow.addColorStop(0, `rgba(100, 200, 255, ${0.2 * selPulse})`);
    selGlow.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = selGlow;
    ctx.fillRect(-24 * px, -24 * px, 48 * px, 48 * px);
  }

  // Feet with role-based style
  const footOff = isWalking ? Math.sin(agent.frame * 2.8) * px * 2.5 : 
                  isWorking ? Math.sin(agent.frame * 5) * px * 0.8 : 0;
  drawFeet(ctx, px, footOff, shade, roleVisual.headShape);

  // Body with role-based accent
  drawBody(ctx, px, body, shade, light, roleVisual.bodyAccent, agent.frame, isWorking);

  // Core/chest light (more intense when working)
  drawCore(ctx, px, agent.frame, isWorking, isIdle);

  // Arms with motion
  const armSwing = isWalking ? Math.sin(agent.frame * 2.8) * px * 2 :
                   isWorking ? Math.sin(agent.frame * 5) * px * 1.5 : 
                   isIdle ? Math.sin(agent.frame * 0.8) * px * 0.3 : 0;
  drawArms(ctx, px, armSwing, shade, isWorking);

  // Head with role-based shape
  const headY = -12 * px;
  drawHead(ctx, px, headY, body, light, roleVisual.headShape);

  // Visor with role-based eye style
  drawVisor(ctx, px, headY, agent.state, agent.frame, roleVisual.eyeStyle);

  // Role-based antenna
  drawAntenna(ctx, px, headY, shade, accent, roleVisual.antennaStyle, agent.frame, isWorking);

  // State indicators and tool when working
  if (isWorking) {
    drawWorkingTool(ctx, px, armSwing, agent.frame, roleVisual.toolType, body);
    drawWorkSparks(ctx, px, agent.frame);
  } else if (agent.state === 'waiting') {
    drawWaitingIndicator(ctx, px, headY, accent, agent.frame);
  } else if (agent.state === 'errored') {
    drawErrorIndicator(ctx, px, headY, accent);
  }

  // Status pip with enhanced visibility
  drawStatusPip(ctx, px, accent, isWorking, agent.frame);

  ctx.imageSmoothingEnabled = true;

  // Name tag with role color accent
  drawNameTag(ctx, px, agent.name, body, agent.role);

  ctx.restore();
}

function drawWorkingAura(ctx: CanvasRenderingContext2D, px: number, frame: number, color: string): void {
  ctx.save();
  const particles = 8;
  for (let i = 0; i < particles; i++) {
    const angle = (frame * 0.5 + i * (Math.PI * 2 / particles)) % (Math.PI * 2);
    const dist = 14 * px + Math.sin(frame * 3 + i) * 3 * px;
    const pX = Math.cos(angle) * dist;
    const pY = Math.sin(angle) * dist * 0.5 - 2 * px;
    const alpha = 0.4 + 0.3 * Math.sin(frame * 4 + i);
    
    ctx.fillStyle = `rgba(${hexToRgb(color)}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(pX, pY, px * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFeet(ctx: CanvasRenderingContext2D, px: number, footOff: number, shade: string, headShape: string): void {
  ctx.fillStyle = shade;
  const footW = headShape === 'wide' ? 5 * px : 4 * px;
  const footH = 3.5 * px;
  roundRect(ctx, -6 * px + footOff, 7 * px, footW, footH, px);
  ctx.fill();
  roundRect(ctx, 2 * px - footOff, 7 * px, footW, footH, px);
  ctx.fill();
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  px: number,
  body: string,
  shade: string,
  light: string,
  accentType: string,
  frame: number,
  isWorking: boolean,
): void {
  // Main body shape
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-7 * px, 6 * px);
  ctx.lineTo(-8 * px, -2 * px);
  ctx.quadraticCurveTo(-8 * px, -7 * px, -4.5 * px, -8 * px);
  ctx.lineTo(4.5 * px, -8 * px);
  ctx.quadraticCurveTo(8 * px, -7 * px, 8 * px, -2 * px);
  ctx.lineTo(7 * px, 6 * px);
  ctx.quadraticCurveTo(7 * px, 8 * px, 4.5 * px, 8 * px);
  ctx.lineTo(-4.5 * px, 8 * px);
  ctx.quadraticCurveTo(-7 * px, 8 * px, -7 * px, 6 * px);
  ctx.closePath();
  ctx.fill();

  // Body highlight
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-6 * px, -7 * px);
  ctx.quadraticCurveTo(0, -9 * px, 6 * px, -7 * px);
  ctx.lineTo(5 * px, -4 * px);
  ctx.quadraticCurveTo(0, -5.5 * px, -5 * px, -4 * px);
  ctx.closePath();
  ctx.fill();

  // Role-based body accent
  if (accentType === 'badge') {
    // Circular badge on chest
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(-3.5 * px, 2 * px, 2 * px, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(-3.5 * px, 2 * px, 1.2 * px, 0, Math.PI * 2);
    ctx.fill();
  } else if (accentType === 'stripe') {
    // Diagonal stripe
    ctx.fillStyle = shade;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-8 * px, -8 * px, 16 * px, 16 * px);
    ctx.clip();
    ctx.rotate(-0.4);
    ctx.fillRect(-2 * px, -10 * px, 3 * px, 20 * px);
    ctx.restore();
  } else if (accentType === 'panel') {
    // Tech panel lines
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5 * px, -3 * px);
    ctx.lineTo(-5 * px, 4 * px);
    ctx.moveTo(5 * px, -3 * px);
    ctx.lineTo(5 * px, 4 * px);
    ctx.stroke();
  } else if (accentType === 'glow' && isWorking) {
    // Glowing body outline when working
    const glowPulse = 0.3 + 0.3 * Math.sin(frame * 4);
    ctx.strokeStyle = `rgba(255, 255, 255, ${glowPulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawCore(ctx: CanvasRenderingContext2D, px: number, frame: number, isWorking: boolean, isIdle: boolean): void {
  const corePulse = isWorking 
    ? 0.85 + 0.15 * Math.sin(frame * 5)
    : isIdle
      ? 0.5 + 0.2 * Math.sin(frame * 1.2)
      : 0.7 + 0.3 * Math.sin(frame * 2);
  
  const coreSize = isWorking ? 3.5 * px : 2.8 * px;
  
  // Core glow (larger when working)
  const glowSize = isWorking ? 8 * px : 5 * px;
  const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
  coreGlow.addColorStop(0, `rgba(220, 240, 255, ${0.5 * corePulse})`);
  coreGlow.addColorStop(0.5, `rgba(180, 220, 255, ${0.2 * corePulse})`);
  coreGlow.addColorStop(1, 'rgba(150, 200, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(-glowSize, -glowSize / 2, glowSize * 2, glowSize * 1.2);

  // Core center
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * corePulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // Inner core detail
  if (isWorking) {
    ctx.fillStyle = `rgba(100, 200, 255, ${0.8 * corePulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawArms(ctx: CanvasRenderingContext2D, px: number, armSwing: number, shade: string, isWorking: boolean): void {
  ctx.fillStyle = shade;
  const armW = 3.5 * px;
  const armH = isWorking ? 7 * px : 6 * px;
  
  // Left arm
  roundRect(ctx, -11 * px, -2 * px + armSwing, armW, armH, px);
  ctx.fill();
  
  // Right arm
  roundRect(ctx, 7.5 * px, -2 * px - armSwing, armW, armH, px);
  ctx.fill();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  px: number,
  headY: number,
  body: string,
  light: string,
  headShape: string,
): void {
  ctx.fillStyle = body;
  ctx.beginPath();
  
  if (headShape === 'square') {
    // More angular head
    roundRect(ctx, -8 * px, headY - 7 * px, 16 * px, 14 * px, 3 * px);
    ctx.fill();
  } else if (headShape === 'tall') {
    // Taller, narrower head
    ctx.ellipse(0, headY, 7 * px, 9 * px, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (headShape === 'wide') {
    // Wider, shorter head
    ctx.ellipse(0, headY, 9 * px, 7 * px, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default round head
    ctx.arc(0, headY, 8.5 * px, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head highlight
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(-2.5 * px, headY - 3.5 * px, 4.5 * px, 0, Math.PI * 2);
  ctx.fill();
}

function drawVisor(
  ctx: CanvasRenderingContext2D,
  px: number,
  headY: number,
  state: AgentState,
  frame: number,
  eyeStyle: string,
): void {
  // Visor background
  ctx.fillStyle = '#080c18';
  const visorW = eyeStyle === 'wide' ? 7 * px : eyeStyle === 'focused' ? 5.5 * px : 6 * px;
  const visorH = eyeStyle === 'angular' ? 3.5 * px : 4.5 * px;
  ctx.beginPath();
  ctx.ellipse(0, headY + 1.5 * px, visorW, visorH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visor glow based on state
  const visorColor = state === 'errored' ? 'rgba(248, 113, 113, 0.5)' :
                     state === 'waiting' ? 'rgba(251, 191, 36, 0.5)' :
                     state === 'building' ? 'rgba(100, 220, 255, 0.5)' :
                     'rgba(80, 160, 220, 0.35)';
  ctx.fillStyle = visorColor;
  ctx.beginPath();
  ctx.ellipse(0, headY + 1.5 * px, visorW - 0.5 * px, visorH - 0.5 * px, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes based on state and style
  if (state === 'errored') {
    drawErrorEyes(ctx, px, headY);
  } else {
    drawNormalEyes(ctx, px, headY, frame, eyeStyle, state === 'building');
  }
}

function drawErrorEyes(ctx: CanvasRenderingContext2D, px: number, headY: number): void {
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = px * 0.9;
  ctx.lineCap = 'round';
  
  // Left X
  ctx.beginPath();
  ctx.moveTo(-3.5 * px, headY);
  ctx.lineTo(-1.5 * px, headY + 2 * px);
  ctx.moveTo(-1.5 * px, headY);
  ctx.lineTo(-3.5 * px, headY + 2 * px);
  ctx.stroke();
  
  // Right X
  ctx.beginPath();
  ctx.moveTo(1.5 * px, headY);
  ctx.lineTo(3.5 * px, headY + 2 * px);
  ctx.moveTo(3.5 * px, headY);
  ctx.lineTo(1.5 * px, headY + 2 * px);
  ctx.stroke();
}

function drawNormalEyes(
  ctx: CanvasRenderingContext2D,
  px: number,
  headY: number,
  frame: number,
  eyeStyle: string,
  isWorking: boolean,
): void {
  const eyeBlink = Math.sin(frame * 0.4) > 0.96 ? 0.15 : 1;
  const eyeY = headY + 1 * px;
  
  // Eye shapes based on style
  ctx.fillStyle = '#ffffff';
  
  if (eyeStyle === 'angular') {
    // Angular/triangular eyes
    const eyeH = 2.5 * px * eyeBlink;
    ctx.beginPath();
    ctx.moveTo(-3.5 * px, eyeY - eyeH / 2);
    ctx.lineTo(-1.5 * px, eyeY);
    ctx.lineTo(-3.5 * px, eyeY + eyeH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3.5 * px, eyeY - eyeH / 2);
    ctx.lineTo(1.5 * px, eyeY);
    ctx.lineTo(3.5 * px, eyeY + eyeH / 2);
    ctx.closePath();
    ctx.fill();
  } else if (eyeStyle === 'wide') {
    // Wide horizontal eyes
    ctx.beginPath();
    ctx.ellipse(-2.5 * px, eyeY, 2 * px, 1.8 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2.5 * px, eyeY, 2 * px, 1.8 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (eyeStyle === 'focused') {
    // Smaller, focused eyes
    ctx.beginPath();
    ctx.ellipse(-2 * px, eyeY, 1.3 * px, 1.8 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2 * px, eyeY, 1.3 * px, 1.8 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (eyeStyle === 'friendly') {
    // Larger, rounder friendly eyes
    ctx.beginPath();
    ctx.arc(-2.5 * px, eyeY, 2 * px * Math.min(1, eyeBlink + 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.5 * px, eyeY, 2 * px * Math.min(1, eyeBlink + 0.3), 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default round eyes
    ctx.beginPath();
    ctx.ellipse(-2.5 * px, eyeY, 1.7 * px, 2.2 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2.5 * px, eyeY, 1.7 * px, 2.2 * px * eyeBlink, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eye shine (more prominent when working)
  const shineAlpha = isWorking ? 0.95 : 0.75;
  ctx.fillStyle = `rgba(180, 230, 255, ${shineAlpha})`;
  ctx.beginPath();
  ctx.arc(-3 * px, eyeY - px * 0.5, px * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2 * px, eyeY - px * 0.5, px * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawAntenna(
  ctx: CanvasRenderingContext2D,
  px: number,
  headY: number,
  shade: string,
  accent: string,
  style: string,
  frame: number,
  isWorking: boolean,
): void {
  const antennaY = headY - 9 * px;
  const wobble = isWorking ? Math.sin(frame * 6) * 0.15 : Math.sin(frame * 1.5) * 0.05;
  
  ctx.save();
  ctx.rotate(wobble);
  
  if (style === 'single') {
    // Simple single antenna
    ctx.fillStyle = shade;
    ctx.fillRect(-px * 0.6, antennaY, px * 1.2, 4 * px);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, antennaY - px, px * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'dual') {
    // Two antennas
    ctx.fillStyle = shade;
    ctx.fillRect(-4 * px, antennaY + px, px, 3 * px);
    ctx.fillRect(3 * px, antennaY + px, px, 3 * px);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-3.5 * px, antennaY, px * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.5 * px, antennaY, px * 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'dish') {
    // Dish/receiver antenna
    ctx.fillStyle = shade;
    ctx.fillRect(-px * 0.5, antennaY + 2 * px, px, 2 * px);
    ctx.beginPath();
    ctx.ellipse(0, antennaY + px, 3 * px, 1.5 * px, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, antennaY + px, px, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'spike') {
    // Sharp spike antenna
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(-px, antennaY + 3 * px);
    ctx.lineTo(0, antennaY - 2 * px);
    ctx.lineTo(px, antennaY + 3 * px);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, antennaY - 2 * px, px, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'loop') {
    // Loop/halo antenna
    ctx.strokeStyle = shade;
    ctx.lineWidth = px * 0.8;
    ctx.beginPath();
    ctx.ellipse(0, antennaY, 3 * px, 2 * px, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, antennaY - 2 * px, px * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Glow when working
  if (isWorking) {
    const glowPulse = 0.5 + 0.5 * Math.sin(frame * 5);
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, ${0.4 * glowPulse})`;
    ctx.beginPath();
    ctx.arc(0, antennaY, px * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

function drawWorkingTool(
  ctx: CanvasRenderingContext2D,
  px: number,
  armSwing: number,
  frame: number,
  toolType: string,
  bodyColor: string,
): void {
  ctx.save();
  ctx.translate(10 * px, -px - armSwing);
  ctx.rotate(Math.sin(frame * 5) * 0.5);

  if (toolType === 'wrench') {
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, -px, 7 * px, 2.5 * px);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(6 * px, -2 * px, 3.5 * px, 5 * px);
  } else if (toolType === 'tablet') {
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 0, -2 * px, 6 * px, 5 * px, px);
    ctx.fill();
    ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.fillRect(px, -px, 4 * px, 3 * px);
  } else if (toolType === 'brush') {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, -px * 0.5, 6 * px, px * 1.5);
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(6 * px, -px);
    ctx.lineTo(9 * px, 0);
    ctx.lineTo(6 * px, px);
    ctx.closePath();
    ctx.fill();
  } else if (toolType === 'scanner') {
    ctx.fillStyle = '#374151';
    roundRect(ctx, 0, -1.5 * px, 5 * px, 4 * px, px);
    ctx.fill();
    const scanPulse = 0.5 + 0.5 * Math.sin(frame * 6);
    ctx.fillStyle = `rgba(52, 211, 153, ${scanPulse})`;
    ctx.fillRect(px, -px * 0.5, 3 * px, 2 * px);
  } else if (toolType === 'clipboard') {
    ctx.fillStyle = '#4a5568';
    roundRect(ctx, 0, -2 * px, 5 * px, 6 * px, px * 0.5);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(px, -px, 3 * px, 4 * px);
    ctx.fillStyle = '#64748b';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px * 1.5, -px * 0.5 + i * px * 1.2, 2 * px, px * 0.5);
    }
  } else if (toolType === 'chart') {
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 0, -2 * px, 6 * px, 5 * px, px);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    const barH = 2 * px * (0.5 + 0.5 * Math.sin(frame * 3));
    ctx.fillRect(px, 2 * px - barH, px, barH);
    ctx.fillStyle = '#a78bfa';
    const barH2 = 2 * px * (0.5 + 0.5 * Math.sin(frame * 3 + 1));
    ctx.fillRect(2.5 * px, 2 * px - barH2, px, barH2);
    ctx.fillStyle = '#34d399';
    const barH3 = 2 * px * (0.5 + 0.5 * Math.sin(frame * 3 + 2));
    ctx.fillRect(4 * px, 2 * px - barH3, px, barH3);
  }

  ctx.restore();
}

function drawWorkSparks(ctx: CanvasRenderingContext2D, px: number, frame: number): void {
  const sparkCount = 4;
  for (let i = 0; i < sparkCount; i++) {
    const sparkPhase = (frame * 3 + i * 1.5) % 2;
    if (sparkPhase > 1) continue;
    
    const sparkX = 12 * px + Math.sin(frame * 4 + i * 2) * 4 * px;
    const sparkY = -3 * px + Math.cos(frame * 3 + i * 1.5) * 5 * px - sparkPhase * 8 * px;
    const sparkAlpha = 1 - sparkPhase;
    
    ctx.fillStyle = `rgba(255, 220, 100, ${0.9 * sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, px * 0.8 * sparkAlpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaitingIndicator(ctx: CanvasRenderingContext2D, px: number, headY: number, accent: string, frame: number): void {
  for (let i = 0; i < 3; i++) {
    const dotAlpha = 0.4 + 0.6 * Math.sin(frame * 3 + i * 0.8);
    ctx.fillStyle = accent;
    ctx.globalAlpha = dotAlpha;
    ctx.beginPath();
    ctx.arc(-3 * px + i * 3 * px, headY - 14 * px, px * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawErrorIndicator(ctx: CanvasRenderingContext2D, px: number, headY: number, accent: string): void {
  ctx.fillStyle = accent;
  ctx.font = `bold ${6 * px}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, headY - 13 * px);
}

function drawStatusPip(ctx: CanvasRenderingContext2D, px: number, accent: string, isWorking: boolean, frame: number): void {
  const pipSize = isWorking ? px * 1.6 : px * 1.3;
  const pipPulse = isWorking ? 0.8 + 0.2 * Math.sin(frame * 6) : 1;
  
  // Glow
  if (isWorking) {
    ctx.fillStyle = `rgba(${hexToRgb(accent)}, 0.3)`;
    ctx.beginPath();
    ctx.arc(7 * px, -7 * px, pipSize * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = accent;
  ctx.globalAlpha = pipPulse;
  ctx.beginPath();
  ctx.arc(7 * px, -7 * px, pipSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  ctx.strokeStyle = '#0a1020';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function drawNameTag(ctx: CanvasRenderingContext2D, px: number, name: string, bodyColor: string, role?: string): void {
  ctx.font = `600 ${Math.max(9, 3.4 * px)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(name).width;

  // Tag background
  ctx.fillStyle = 'rgba(8, 12, 24, 0.9)';
  roundRect(ctx, -tw / 2 - 8, 12 * px, tw + 16, 16, 4);
  ctx.fill();

  // Tag border with role color
  ctx.strokeStyle = `rgba(${hexToRgb(bodyColor)}, 0.5)`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, -tw / 2 - 8, 12 * px, tw + 16, 16, 4);
  ctx.stroke();

  // Role indicator line
  ctx.fillStyle = bodyColor;
  ctx.fillRect(-tw / 2 - 6, 13 * px, 3, 12);

  // Tag text
  ctx.fillStyle = 'rgba(210, 225, 245, 0.98)';
  ctx.fillText(name, 1, 12 * px + 12);
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
