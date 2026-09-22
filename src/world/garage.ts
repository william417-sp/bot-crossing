/** Tony Stark-style high-tech garage workshop backdrop */

export function drawGarage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  // Dark industrial background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a0c12');
  bg.addColorStop(0.4, '#0d1018');
  bg.addColorStop(0.7, '#101520');
  bg.addColorStop(1, '#080a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ceiling industrial lights (soft glow pools)
  drawCeilingLights(ctx, w, h, t);

  // Back wall with tool panels and equipment racks
  drawBackWall(ctx, w, h, t, parallax);

  // Holographic ambient glow
  drawAmbientHoloGlow(ctx, w, h, t);

  // Floor with concrete texture and grid lines
  drawConcreteFloor(ctx, w, h, t, parallax);

  // Equipment bays (cars/armor stands as abstract silhouettes)
  drawEquipmentBays(ctx, w, h, t, parallax);

  // Floating holographic panels
  drawFloatingHolograms(ctx, w, h, t);

  // Subtle particle sparks
  drawSparks(ctx, w, h, t);

  // Ambient scan lines overlay
  drawScanLines(ctx, w, h, t);

  // Vignette for depth
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, h * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.7, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawCeilingLights(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const lights = [
    { x: 0.15, intensity: 0.8 },
    { x: 0.35, intensity: 1.0 },
    { x: 0.55, intensity: 0.9 },
    { x: 0.75, intensity: 0.85 },
    { x: 0.9, intensity: 0.7 },
  ];

  for (const light of lights) {
    const flicker = 0.9 + 0.1 * Math.sin(t * 2 + light.x * 20);
    const lx = light.x * w;
    const ly = h * 0.02;

    // Light fixture
    ctx.fillStyle = '#1a1d26';
    ctx.fillRect(lx - 20, 0, 40, 8);
    ctx.fillStyle = '#d4e4ff';
    ctx.globalAlpha = 0.9 * flicker * light.intensity;
    ctx.fillRect(lx - 15, 2, 30, 4);

    // Light cone
    const cone = ctx.createLinearGradient(lx, ly, lx, h * 0.35);
    cone.addColorStop(0, `rgba(180, 200, 255, ${0.12 * flicker * light.intensity})`);
    cone.addColorStop(0.5, `rgba(140, 180, 255, ${0.04 * flicker * light.intensity})`);
    cone.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx - 15, ly);
    ctx.lineTo(lx - 60, h * 0.35);
    ctx.lineTo(lx + 60, h * 0.35);
    ctx.lineTo(lx + 15, ly);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBackWall(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  const wallY = h * 0.08;
  const wallH = h * 0.38;

  // Wall panels
  const panelCount = 8;
  const panelW = w / panelCount;

  for (let i = 0; i < panelCount; i++) {
    const px = i * panelW + parallax * 5;
    const shade = 0.02 + (i % 2) * 0.01;

    ctx.fillStyle = `rgb(${18 + shade * 100}, ${22 + shade * 100}, ${32 + shade * 100})`;
    ctx.fillRect(px, wallY, panelW - 2, wallH);

    // Panel edge highlight
    ctx.strokeStyle = 'rgba(80, 100, 140, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, wallY + 1, panelW - 4, wallH - 2);
  }

  // Tool racks (silhouettes)
  drawToolRacks(ctx, w, h, wallY, wallH, t);

  // Ventilation grilles
  ctx.fillStyle = '#0d1018';
  for (let i = 0; i < 3; i++) {
    const vx = w * (0.18 + i * 0.32);
    ctx.fillRect(vx, wallY + 5, 50, 15);
    ctx.strokeStyle = 'rgba(60, 80, 120, 0.3)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 5; j++) {
      ctx.beginPath();
      ctx.moveTo(vx + 5 + j * 10, wallY + 7);
      ctx.lineTo(vx + 5 + j * 10, wallY + 18);
      ctx.stroke();
    }
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
  // Blue ambient glow sources
  const glows = [
    { x: 0.2, y: 0.3, r: 120, phase: 0 },
    { x: 0.5, y: 0.25, r: 150, phase: 1.5 },
    { x: 0.8, y: 0.35, r: 100, phase: 3 },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const g of glows) {
    const pulse = 0.8 + 0.2 * Math.sin(t * 0.5 + g.phase);
    const gx = g.x * w;
    const gy = g.y * h;

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r * pulse);
    grad.addColorStop(0, `rgba(60, 180, 255, ${0.08 * pulse})`);
    grad.addColorStop(0.5, `rgba(40, 140, 220, ${0.04 * pulse})`);
    grad.addColorStop(1, 'rgba(30, 100, 180, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(gx - g.r, gy - g.r, g.r * 2, g.r * 2);
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

  // Floor gradient
  const floor = ctx.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, '#1a1e28');
  floor.addColorStop(0.3, '#14181f');
  floor.addColorStop(0.7, '#101418');
  floor.addColorStop(1, '#0a0c10');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Perspective grid lines
  ctx.save();
  const vanishY = h * 0.4;
  const vanishX = w * 0.5;
  const gridLines = 12;

  ctx.strokeStyle = 'rgba(80, 120, 180, 0.08)';
  ctx.lineWidth = 1;

  // Horizontal lines with perspective
  for (let i = 1; i <= 6; i++) {
    const progress = i / 6;
    const y = floorY + (h - floorY) * progress * 0.9;
    const squeeze = 1 - progress * 0.4;
    ctx.globalAlpha = 0.3 + progress * 0.5;
    ctx.beginPath();
    ctx.moveTo(w * (0.5 - squeeze * 0.5), y);
    ctx.lineTo(w * (0.5 + squeeze * 0.5), y);
    ctx.stroke();
  }

  // Radial lines from vanishing point
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < gridLines; i++) {
    const angle = -0.7 + (i / (gridLines - 1)) * 1.4;
    ctx.beginPath();
    ctx.moveTo(vanishX, vanishY);
    ctx.lineTo(vanishX + Math.sin(angle) * w * 0.8, h);
    ctx.stroke();
  }
  ctx.restore();

  // Subtle floor texture
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 80; i++) {
    const gx = ((i * 73 + parallax * 10) % w);
    const gy = floorY + ((i * 47) % (h - floorY)) * 0.8;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(100, 140, 200, 0.3)' : 'rgba(20, 25, 35, 0.5)';
    ctx.fillRect(gx, gy, 2, 1);
  }
  ctx.restore();

  // Yellow safety lines
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.setLineDash([15, 10]);
  ctx.strokeStyle = '#c4a030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, floorY + 20);
  ctx.lineTo(w * 0.12, h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.88, floorY + 20);
  ctx.lineTo(w * 0.88, h);
  ctx.stroke();
  ctx.setLineDash([]);
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
    { x: 0.22, y: 0.28, size: 60, rotation: t * 0.3 },
    { x: 0.68, y: 0.32, size: 45, rotation: -t * 0.4 },
    { x: 0.85, y: 0.25, size: 35, rotation: t * 0.5 },
  ];

  ctx.save();
  for (const holo of holos) {
    const hx = holo.x * w;
    const hy = holo.y * h;
    const float = Math.sin(t * 0.8 + holo.x * 5) * 4;

    drawHoloPanel(ctx, hx, hy + float, holo.size, holo.rotation, t);
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

  // Panel glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
  glow.addColorStop(0, 'rgba(60, 200, 255, 0.15)');
  glow.addColorStop(0.7, 'rgba(60, 180, 255, 0.05)');
  glow.addColorStop(1, 'rgba(60, 180, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size, size * 2, size * 2);

  // Rotating wireframe cube
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.5)';
  ctx.lineWidth = 1;

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

  // Connection lines to back
  const depth = s * 0.6;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(-s * cos, -s + s * sin * 0.3);
  ctx.lineTo(-s * cos - depth * sin, -s + s * sin * 0.3 - depth * 0.5);
  ctx.moveTo(s * cos, -s - s * sin * 0.3);
  ctx.lineTo(s * cos - depth * sin, -s - s * sin * 0.3 - depth * 0.5);
  ctx.stroke();
  ctx.globalAlpha = 1;

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
