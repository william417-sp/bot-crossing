/** Tony Stark-style high-tech garage workshop backdrop */

export function drawGarage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  // Dark industrial background with stronger depth gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#05070c');
  bg.addColorStop(0.25, '#080b14');
  bg.addColorStop(0.5, '#0c1018');
  bg.addColorStop(0.75, '#101620');
  bg.addColorStop(1, '#0a0e14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ceiling industrial lights (stronger glow pools)
  drawCeilingLights(ctx, w, h, t);

  // Back wall with tool panels and equipment racks
  drawBackWall(ctx, w, h, t, parallax);

  // Holographic ambient glow (enhanced for pop)
  drawAmbientHoloGlow(ctx, w, h, t);

  // Floor with concrete texture and grid lines
  drawConcreteFloor(ctx, w, h, t, parallax);

  // Equipment bays (armor stands/machinery silhouettes)
  drawEquipmentBays(ctx, w, h, t, parallax);

  // Floating holographic panels (main visual feature)
  drawFloatingHolograms(ctx, w, h, t);

  // Subtle particle sparks
  drawSparks(ctx, w, h, t);

  // Ambient scan lines overlay
  drawScanLines(ctx, w, h, t);

  // Vignette for depth and focus
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.15, w * 0.5, h * 0.55, h);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.5, 'rgba(0,0,0,0)');
  vig.addColorStop(0.8, 'rgba(0,0,0,0.3)');
  vig.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawCeilingLights(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const lights = [
    { x: 0.12, intensity: 0.75 },
    { x: 0.32, intensity: 1.0 },
    { x: 0.52, intensity: 0.95 },
    { x: 0.72, intensity: 0.9 },
    { x: 0.88, intensity: 0.7 },
  ];

  for (const light of lights) {
    const flicker = 0.92 + 0.08 * Math.sin(t * 1.8 + light.x * 25);
    const lx = light.x * w;
    const ly = h * 0.015;

    // Light fixture housing
    ctx.fillStyle = '#12151e';
    ctx.fillRect(lx - 24, 0, 48, 10);
    ctx.fillStyle = '#1a1e2a';
    ctx.fillRect(lx - 22, 1, 44, 7);
    
    // LED strip (bright white-blue)
    ctx.fillStyle = '#e8f0ff';
    ctx.globalAlpha = 0.95 * flicker * light.intensity;
    ctx.fillRect(lx - 18, 3, 36, 4);
    
    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7 * flicker * light.intensity;
    ctx.fillRect(lx - 14, 4, 28, 2);
    ctx.globalAlpha = 1;

    // Light cone with better spread
    const cone = ctx.createLinearGradient(lx, ly, lx, h * 0.42);
    cone.addColorStop(0, `rgba(200, 220, 255, ${0.18 * flicker * light.intensity})`);
    cone.addColorStop(0.3, `rgba(160, 200, 255, ${0.08 * flicker * light.intensity})`);
    cone.addColorStop(0.7, `rgba(100, 160, 240, ${0.03 * flicker * light.intensity})`);
    cone.addColorStop(1, 'rgba(80, 140, 220, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx - 18, ly + 8);
    ctx.lineTo(lx - 80, h * 0.42);
    ctx.lineTo(lx + 80, h * 0.42);
    ctx.lineTo(lx + 18, ly + 8);
    ctx.closePath();
    ctx.fill();

    // Floor reflection pool
    const poolY = h * 0.88;
    const poolGlow = ctx.createRadialGradient(lx, poolY, 0, lx, poolY, 50 * light.intensity);
    poolGlow.addColorStop(0, `rgba(100, 160, 220, ${0.06 * flicker * light.intensity})`);
    poolGlow.addColorStop(1, 'rgba(100, 160, 220, 0)');
    ctx.fillStyle = poolGlow;
    ctx.fillRect(lx - 60, poolY - 30, 120, 60);
  }
}

function drawBackWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  const wallY = h * 0.06;
  const wallH = h * 0.40;

  // Wall base gradient for depth
  const wallBg = ctx.createLinearGradient(0, wallY, 0, wallY + wallH);
  wallBg.addColorStop(0, '#0f131c');
  wallBg.addColorStop(0.5, '#141a26');
  wallBg.addColorStop(1, '#0c1018');
  ctx.fillStyle = wallBg;
  ctx.fillRect(0, wallY, w, wallH);

  // Wall panels with distinct segments
  const panelCount = 6;
  const panelW = w / panelCount;

  for (let i = 0; i < panelCount; i++) {
    const px = i * panelW + parallax * 3;
    const isLit = i === 1 || i === 3 || i === 4;

    // Panel background
    const panelGrad = ctx.createLinearGradient(px, wallY, px + panelW, wallY + wallH);
    panelGrad.addColorStop(0, isLit ? '#161c28' : '#10141e');
    panelGrad.addColorStop(0.5, isLit ? '#1a2030' : '#12161f');
    panelGrad.addColorStop(1, isLit ? '#141a26' : '#0e121a');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(px + 2, wallY + 2, panelW - 6, wallH - 4);

    // Panel frame
    ctx.strokeStyle = 'rgba(60, 90, 140, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 2, wallY + 2, panelW - 6, wallH - 4);

    // Inner frame accent
    ctx.strokeStyle = 'rgba(40, 70, 120, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 6, wallY + 6, panelW - 14, wallH - 12);

    // Panel corner accents (tech detail)
    ctx.fillStyle = 'rgba(80, 140, 200, 0.15)';
    ctx.fillRect(px + 4, wallY + 4, 8, 2);
    ctx.fillRect(px + panelW - 14, wallY + 4, 8, 2);
  }

  // Tool racks (silhouettes)
  drawToolRacks(ctx, w, h, wallY, wallH, t);

  // Ventilation grilles with glow
  for (let i = 0; i < 4; i++) {
    const vx = w * (0.12 + i * 0.24);
    const vy = wallY + 8;
    
    // Grille housing
    ctx.fillStyle = '#080c14';
    ctx.fillRect(vx - 2, vy - 2, 44, 18);
    ctx.fillStyle = '#0a0e16';
    ctx.fillRect(vx, vy, 40, 14);
    
    // Vent slats
    ctx.strokeStyle = 'rgba(50, 80, 120, 0.4)';
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(vx + 6 + j * 9, vy + 2);
      ctx.lineTo(vx + 6 + j * 9, vy + 12);
      ctx.stroke();
    }
    
    // Blue LED indicator
    const ledPulse = 0.6 + 0.4 * Math.sin(t * 1.5 + i);
    ctx.fillStyle = `rgba(60, 180, 255, ${0.7 * ledPulse})`;
    ctx.beginPath();
    ctx.arc(vx + 38, vy + 7, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal tech lines for depth
  ctx.strokeStyle = 'rgba(60, 120, 180, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const ly = wallY + (wallH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
  }
}

function drawToolRacks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  wallY: number,
  wallH: number,
  t: number,
): void {
  const racks = [
    { x: 0.08, tools: [0.3, 0.45, 0.6, 0.75] },
    { x: 0.42, tools: [0.25, 0.4, 0.55, 0.7, 0.85] },
    { x: 0.78, tools: [0.35, 0.5, 0.65, 0.8] },
  ];

  for (const rack of racks) {
    const rx = rack.x * w;
    const rackW = 80;

    // Rack back panel
    ctx.fillStyle = '#181c28';
    ctx.fillRect(rx, wallY + wallH * 0.2, rackW, wallH * 0.7);

    // Tool silhouettes
    ctx.fillStyle = '#282e3e';
    for (const ty of rack.tools) {
      const toolY = wallY + wallH * ty;
      ctx.fillRect(rx + 8, toolY, 64, 8);
      ctx.fillRect(rx + 12 + Math.sin(t + ty * 5) * 2, toolY - 20, 8, 22);
    }

    // Rack edge glow
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, wallY + wallH * 0.2, rackW, wallH * 0.7);
  }
}

function drawAmbientHoloGlow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  // Cyan/blue ambient glow sources for holographic atmosphere
  const glows = [
    { x: 0.18, y: 0.32, r: 100, phase: 0, color: [40, 200, 255] },
    { x: 0.48, y: 0.28, r: 130, phase: 1.2, color: [60, 180, 240] },
    { x: 0.75, y: 0.35, r: 90, phase: 2.5, color: [80, 160, 255] },
    { x: 0.35, y: 0.5, r: 70, phase: 3.8, color: [50, 190, 250] },
    { x: 0.62, y: 0.45, r: 80, phase: 0.8, color: [70, 170, 245] },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const g of glows) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 0.6 + g.phase);
    const gx = g.x * w;
    const gy = g.y * h;
    const [r, gb, b] = g.color;

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r * pulse);
    grad.addColorStop(0, `rgba(${r}, ${gb}, ${b}, ${0.12 * pulse})`);
    grad.addColorStop(0.4, `rgba(${r - 10}, ${gb - 20}, ${b - 10}, ${0.06 * pulse})`);
    grad.addColorStop(0.7, `rgba(${r - 20}, ${gb - 40}, ${b - 20}, ${0.02 * pulse})`);
    grad.addColorStop(1, `rgba(${r - 30}, ${gb - 60}, ${b - 30}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(gx - g.r * 1.2, gy - g.r * 1.2, g.r * 2.4, g.r * 2.4);
  }
  ctx.restore();
}

function drawConcreteFloor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  const floorY = h * 0.46;

  // Floor gradient with stronger depth
  const floor = ctx.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, '#1e242e');
  floor.addColorStop(0.15, '#181e28');
  floor.addColorStop(0.4, '#141a22');
  floor.addColorStop(0.7, '#10141c');
  floor.addColorStop(1, '#0a0e14');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Floor edge highlight (transition from wall)
  ctx.strokeStyle = 'rgba(80, 140, 200, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();

  // Perspective grid lines
  ctx.save();
  const vanishY = h * 0.38;
  const vanishX = w * 0.5;
  const gridLines = 14;

  // Horizontal lines with perspective (more visible)
  ctx.strokeStyle = 'rgba(60, 120, 180, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 8; i++) {
    const progress = i / 8;
    const y = floorY + (h - floorY) * progress * 0.95;
    const squeeze = 1 - progress * 0.35;
    ctx.globalAlpha = 0.25 + progress * 0.5;
    ctx.beginPath();
    ctx.moveTo(w * (0.5 - squeeze * 0.52), y);
    ctx.lineTo(w * (0.5 + squeeze * 0.52), y);
    ctx.stroke();
  }

  // Radial lines from vanishing point
  ctx.strokeStyle = 'rgba(70, 130, 190, 0.1)';
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < gridLines; i++) {
    const angle = -0.75 + (i / (gridLines - 1)) * 1.5;
    ctx.beginPath();
    ctx.moveTo(vanishX, vanishY);
    ctx.lineTo(vanishX + Math.sin(angle) * w * 0.85, h);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle floor texture
  ctx.save();
  for (let i = 0; i < 100; i++) {
    const gx = ((i * 73 + parallax * 8) % w);
    const gy = floorY + ((i * 47) % (h - floorY)) * 0.85 + 10;
    ctx.globalAlpha = 0.08 + (i % 4) * 0.03;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(100, 150, 210, 0.4)' : 'rgba(15, 20, 30, 0.6)';
    ctx.fillRect(gx, gy, 2.5, 1);
  }
  ctx.restore();

  // Yellow safety lines with glow
  ctx.save();
  // Left line glow
  ctx.strokeStyle = 'rgba(200, 180, 60, 0.12)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.10, floorY + 15);
  ctx.lineTo(w * 0.10, h);
  ctx.stroke();
  
  // Left line
  ctx.globalAlpha = 0.55;
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = '#d4b030';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.10, floorY + 15);
  ctx.lineTo(w * 0.10, h);
  ctx.stroke();

  // Right line glow
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(200, 180, 60, 0.12)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.90, floorY + 15);
  ctx.lineTo(w * 0.90, h);
  ctx.stroke();
  
  // Right line
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = '#d4b030';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.90, floorY + 15);
  ctx.lineTo(w * 0.90, h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Central work area marker
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = 'rgba(60, 180, 255, 1)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.72, w * 0.28, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEquipmentBays(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  const bays = [
    { x: 0.08, type: 'armor', active: true },
    { x: 0.92, type: 'vehicle', active: false },
  ];

  for (const bay of bays) {
    const bx = bay.x * w + parallax * 8;
    const by = h * 0.35;

    // Bay platform
    ctx.fillStyle = '#181c26';
    ctx.fillRect(bx - 35, by + 80, 70, 12);

    // Circular platform detail
    ctx.strokeStyle = 'rgba(80, 140, 220, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bx, by + 86, 30, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (bay.type === 'armor') {
      drawArmorStand(ctx, bx, by, t, bay.active);
    } else {
      drawVehicleSilhouette(ctx, bx, by, t);
    }

    // Bay lighting
    if (bay.active) {
      const glow = ctx.createRadialGradient(bx, by + 40, 0, bx, by + 40, 80);
      glow.addColorStop(0, 'rgba(60, 180, 255, 0.1)');
      glow.addColorStop(1, 'rgba(60, 180, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 80, by - 20, 160, 120);
    }
  }
}

function drawArmorStand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  active: boolean,
): void {
  const float = active ? Math.sin(t * 1.5) * 3 : 0;

  // Armor silhouette (abstract geometric)
  ctx.fillStyle = active ? '#2a3040' : '#1a1e28';
  
  // Torso
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 20 + float);
  ctx.lineTo(x - 22, y + 55 + float);
  ctx.lineTo(x + 22, y + 55 + float);
  ctx.lineTo(x + 18, y + 20 + float);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(x, y + 8 + float, 14, 0, Math.PI * 2);
  ctx.fill();

  // Visor glow
  if (active) {
    ctx.fillStyle = 'rgba(80, 200, 255, 0.8)';
    ctx.fillRect(x - 10, y + 4 + float, 20, 6);
    
    const visorGlow = ctx.createRadialGradient(x, y + 7 + float, 0, x, y + 7 + float, 25);
    visorGlow.addColorStop(0, 'rgba(80, 200, 255, 0.3)');
    visorGlow.addColorStop(1, 'rgba(80, 200, 255, 0)');
    ctx.fillStyle = visorGlow;
    ctx.fillRect(x - 25, y - 10 + float, 50, 40);
  }

  // Arms
  ctx.fillStyle = active ? '#2a3040' : '#1a1e28';
  ctx.fillRect(x - 32, y + 22 + float, 12, 35);
  ctx.fillRect(x + 20, y + 22 + float, 12, 35);

  // Arc reactor glow (center chest)
  if (active) {
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(80, 220, 255, ${0.9 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + 35 + float, 6, 0, Math.PI * 2);
    ctx.fill();

    const arcGlow = ctx.createRadialGradient(x, y + 35 + float, 0, x, y + 35 + float, 20);
    arcGlow.addColorStop(0, `rgba(80, 220, 255, ${0.4 * pulse})`);
    arcGlow.addColorStop(1, 'rgba(80, 220, 255, 0)');
    ctx.fillStyle = arcGlow;
    ctx.fillRect(x - 20, y + 15 + float, 40, 40);
  }
}

function drawVehicleSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
): void {
  ctx.fillStyle = '#1a1e28';

  // Car-like silhouette
  ctx.beginPath();
  ctx.moveTo(x - 40, y + 70);
  ctx.lineTo(x - 35, y + 45);
  ctx.lineTo(x - 20, y + 30);
  ctx.lineTo(x + 20, y + 30);
  ctx.lineTo(x + 35, y + 45);
  ctx.lineTo(x + 40, y + 70);
  ctx.closePath();
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#0d1018';
  ctx.beginPath();
  ctx.ellipse(x - 25, y + 72, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 25, y + 72, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloatingHolograms(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const holos = [
    { x: 0.15, y: 0.22, size: 55, rotation: t * 0.25, type: 'cube' },
    { x: 0.42, y: 0.18, size: 70, rotation: -t * 0.3, type: 'data' },
    { x: 0.72, y: 0.24, size: 50, rotation: t * 0.35, type: 'sphere' },
    { x: 0.88, y: 0.30, size: 40, rotation: -t * 0.4, type: 'cube' },
  ];

  ctx.save();
  for (const holo of holos) {
    const hx = holo.x * w;
    const hy = holo.y * h;
    const float = Math.sin(t * 0.7 + holo.x * 6) * 5;

    if (holo.type === 'data') {
      drawHoloDataPanel(ctx, hx, hy + float, holo.size, t);
    } else if (holo.type === 'sphere') {
      drawHoloSpherePanel(ctx, hx, hy + float, holo.size, t);
    } else {
      drawHoloPanel(ctx, hx, hy + float, holo.size, holo.rotation, t);
    }
  }
  ctx.restore();
}

function drawHoloDataPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Panel glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.3);
  glow.addColorStop(0, 'rgba(40, 220, 255, 0.2)');
  glow.addColorStop(0.5, 'rgba(40, 200, 255, 0.08)');
  glow.addColorStop(1, 'rgba(40, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size * 0.8, size * 2, size * 1.6);

  // Data panel frame
  ctx.strokeStyle = 'rgba(60, 220, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-size * 0.6, -size * 0.45, size * 1.2, size * 0.9);

  // Inner frame
  ctx.strokeStyle = 'rgba(80, 230, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-size * 0.55, -size * 0.4, size * 1.1, size * 0.8);

  // Data lines (scrolling)
  ctx.fillStyle = 'rgba(100, 240, 255, 0.5)';
  for (let i = 0; i < 5; i++) {
    const lineY = -size * 0.3 + i * (size * 0.14);
    const lineW = size * (0.4 + Math.sin(t * 2 + i) * 0.2);
    ctx.fillRect(-size * 0.45, lineY, lineW, 2);
  }

  // Blinking cursor
  if (Math.sin(t * 4) > 0) {
    ctx.fillStyle = 'rgba(150, 255, 255, 0.9)';
    ctx.fillRect(size * 0.35, -size * 0.3, 3, size * 0.12);
  }

  // Corner brackets
  ctx.strokeStyle = 'rgba(100, 240, 255, 0.7)';
  ctx.lineWidth = 2;
  const cs = size * 0.12;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, -size * 0.45 + cs);
  ctx.lineTo(-size * 0.6, -size * 0.45);
  ctx.lineTo(-size * 0.6 + cs, -size * 0.45);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(size * 0.6, -size * 0.45 + cs);
  ctx.lineTo(size * 0.6, -size * 0.45);
  ctx.lineTo(size * 0.6 - cs, -size * 0.45);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, size * 0.45 - cs);
  ctx.lineTo(-size * 0.6, size * 0.45);
  ctx.lineTo(-size * 0.6 + cs, size * 0.45);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(size * 0.6, size * 0.45 - cs);
  ctx.lineTo(size * 0.6, size * 0.45);
  ctx.lineTo(size * 0.6 - cs, size * 0.45);
  ctx.stroke();

  ctx.restore();
}

function drawHoloSpherePanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  glow.addColorStop(0, 'rgba(60, 200, 255, 0.25)');
  glow.addColorStop(0.5, 'rgba(40, 180, 255, 0.1)');
  glow.addColorStop(1, 'rgba(40, 160, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // Sphere outline
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Latitude lines
  ctx.strokeStyle = 'rgba(100, 230, 255, 0.4)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const ly = i * size * 0.12;
    const lw = Math.sqrt(Math.max(0, (size * 0.5) ** 2 - ly ** 2));
    ctx.beginPath();
    ctx.ellipse(0, ly, lw, lw * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Longitude lines (rotating)
  ctx.save();
  ctx.rotate(t * 0.5);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.12, size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Data points orbiting
  for (let i = 0; i < 4; i++) {
    const angle = t * 0.8 + (i * Math.PI) / 2;
    const px = Math.cos(angle) * size * 0.45;
    const py = Math.sin(angle) * size * 0.15;
    ctx.fillStyle = 'rgba(150, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHoloPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  t: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Panel glow (stronger)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.4);
  glow.addColorStop(0, 'rgba(50, 210, 255, 0.22)');
  glow.addColorStop(0.5, 'rgba(50, 190, 255, 0.08)');
  glow.addColorStop(1, 'rgba(50, 170, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size * 1.4, -size * 1.4, size * 2.8, size * 2.8);

  // Rotating wireframe cube (brighter)
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.7)';
  ctx.lineWidth = 1.5;

  const s = size * 0.4;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // Front face
  ctx.beginPath();
  ctx.moveTo(-s * cos, -s + s * sin * 0.3);
  ctx.lineTo(s * cos, -s - s * sin * 0.3);
  ctx.lineTo(s * cos, s - s * sin * 0.3);
  ctx.lineTo(-s * cos, s + s * sin * 0.3);
  ctx.closePath();
  ctx.stroke();

  // Face fill (subtle)
  ctx.fillStyle = 'rgba(60, 200, 255, 0.08)';
  ctx.fill();

  // Connection lines to back
  const depth = s * 0.6;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(100, 230, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * cos, -s + s * sin * 0.3);
  ctx.lineTo(-s * cos - depth * sin, -s + s * sin * 0.3 - depth * 0.5);
  ctx.moveTo(s * cos, -s - s * sin * 0.3);
  ctx.lineTo(s * cos - depth * sin, -s - s * sin * 0.3 - depth * 0.5);
  ctx.moveTo(s * cos, s - s * sin * 0.3);
  ctx.lineTo(s * cos - depth * sin, s - s * sin * 0.3 - depth * 0.5);
  ctx.moveTo(-s * cos, s + s * sin * 0.3);
  ctx.lineTo(-s * cos - depth * sin, s + s * sin * 0.3 - depth * 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Corner accents
  ctx.fillStyle = 'rgba(120, 240, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(-s * cos, -s + s * sin * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * cos, -s - s * sin * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSparks(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  ctx.save();
  const sparkCount = 12;

  for (let i = 0; i < sparkCount; i++) {
    const phase = (t * 2 + i * 1.7) % 4;
    if (phase > 1) continue;

    const sx = ((i * 137 + Math.floor(t * 20)) % 100) / 100 * w * 0.8 + w * 0.1;
    const sy = h * 0.4 + ((i * 89) % 50) / 100 * h * 0.35;
    const life = 1 - phase;

    ctx.fillStyle = `rgba(255, 200, 100, ${life * 0.8})`;
    ctx.beginPath();
    ctx.arc(sx, sy - phase * 20, 1.5 * life, 0, Math.PI * 2);
    ctx.fill();

    // Spark trail
    ctx.strokeStyle = `rgba(255, 180, 80, ${life * 0.4})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy - phase * 20);
    ctx.lineTo(sx + (Math.random() - 0.5) * 3, sy - phase * 15);
    ctx.stroke();
  }
  ctx.restore();
}

function drawScanLines(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#80c0ff';

  // Subtle horizontal scan lines
  for (let y = 0; y < h; y += 3) {
    if ((y + Math.floor(t * 50)) % 6 < 2) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  // Moving scan bar
  const scanY = ((t * 40) % (h + 60)) - 30;
  ctx.globalAlpha = 0.06;
  const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
  scanGrad.addColorStop(0, 'rgba(80, 200, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(80, 200, 255, 1)');
  scanGrad.addColorStop(1, 'rgba(80, 200, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 15, w, 30);

  ctx.restore();
}
