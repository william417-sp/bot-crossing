/** Dubai desert backdrop: layered dunes, golden-hour sky, heat haze, skyline */

export function drawDesert(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  parallax: number,
): void {
  // Sky — golden hour → dusk
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.68);
  sky.addColorStop(0, '#080510');
  sky.addColorStop(0.18, '#14101f');
  sky.addColorStop(0.38, '#3a1a2e');
  sky.addColorStop(0.52, '#6e3024');
  sky.addColorStop(0.68, '#b85822');
  sky.addColorStop(0.84, '#e09038');
  sky.addColorStop(1, '#f2b858');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Horizon bloom
  const horizonGlow = ctx.createRadialGradient(
    w * 0.58,
    h * 0.46,
    0,
    w * 0.58,
    h * 0.46,
    w * 0.5,
  );
  horizonGlow.addColorStop(0, 'rgba(255, 190, 100, 0.35)');
  horizonGlow.addColorStop(0.4, 'rgba(220, 110, 40, 0.14)');
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, 0, w, h * 0.68);

  // Sun bloom + disc
  const sunX = w * 0.76 + Math.sin(t * 0.04) * 3;
  const sunY = h * 0.24;
  const sunR = Math.min(w, h) * 0.078;
  const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.4);
  bloom.addColorStop(0, 'rgba(255, 245, 210, 1)');
  bloom.addColorStop(0.1, 'rgba(255, 215, 130, 0.95)');
  bloom.addColorStop(0.3, 'rgba(240, 150, 55, 0.45)');
  bloom.addColorStop(0.6, 'rgba(180, 80, 30, 0.12)');
  bloom.addColorStop(1, 'rgba(180, 80, 30, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 3.4, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(sunX - sunR * 0.15, sunY - sunR * 0.15, 0, sunX, sunY, sunR);
  core.addColorStop(0, '#fffaf0');
  core.addColorStop(0.45, '#ffe090');
  core.addColorStop(1, '#e87828');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Dusk stars
  ctx.save();
  for (let i = 0; i < 32; i++) {
    const sx = ((i * 137.5 + 40) % 100) / 100 * w;
    const sy = ((i * 89.3 + 10) % 100) / 100 * h * 0.26;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.7));
    ctx.globalAlpha = 0.12 + twinkle * 0.4;
    ctx.fillStyle = '#f5e6d0';
    ctx.beginPath();
    ctx.arc(sx, sy, i % 5 === 0 ? 1.35 : 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Dubai skyline — double layer
  const skyShift = parallax * 0.12;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#06040a';
  drawSkyline(ctx, w, h * 0.448, skyShift - 0.012, 0.94);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#0e0812';
  drawSkyline(ctx, w, h * 0.465, skyShift, 1);
  drawSkylineWindows(ctx, w, h * 0.465, skyShift, t);
  ctx.restore();

  // Haze under skyline
  const skyShadow = ctx.createLinearGradient(0, h * 0.44, 0, h * 0.56);
  skyShadow.addColorStop(0, 'rgba(12, 6, 10, 0.4)');
  skyShadow.addColorStop(1, 'rgba(12, 6, 10, 0)');
  ctx.fillStyle = skyShadow;
  ctx.fillRect(0, h * 0.44, w, h * 0.14);

  // Heat haze bands
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const phase = t * 1.5 + i * 0.85;
    const y = h * 0.38 + i * 10 + Math.sin(phase) * 3.5;
    ctx.globalAlpha = 0.035 + Math.sin(phase * 0.6) * 0.015;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, y + Math.sin(x * 0.018 + phase) * 3.5);
    }
    ctx.lineTo(w, y + 9);
    for (let x = w; x >= 0; x -= 20) {
      ctx.lineTo(x, y + 9 + Math.sin(x * 0.018 + phase + 1) * 2);
    }
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 200, 120, 1)' : 'rgba(255, 150, 70, 1)';
    ctx.fill();
  }
  ctx.restore();

  // Dune layers far → near (stronger tonal steps)
  drawDuneLayer(ctx, w, h, 0.49, 0.13, ['#3a2014', '#4e2c1c'], t, parallax * 0.22, 1.05, 0.4);
  drawDuneLayer(ctx, w, h, 0.55, 0.17, ['#5a301c', '#6e3c24'], t, parallax * 0.38, 0.95, 0.5);
  drawDuneLayer(ctx, w, h, 0.62, 0.22, ['#7a4024', '#94502c'], t, parallax * 0.58, 0.78, 0.62);
  drawDuneLayer(ctx, w, h, 0.72, 0.28, ['#a8582c', '#c46a34'], t, parallax * 0.8, 0.62, 0.78);
  drawDuneLayer(ctx, w, h, 0.82, 0.2, ['#b06030', '#8a4420'], t, parallax, 0.48, 0.95);

  // Foreground shelf
  const ground = ctx.createLinearGradient(0, h * 0.86, 0, h);
  ground.addColorStop(0, '#6a381c');
  ground.addColorStop(0.35, '#3a2010');
  ground.addColorStop(1, '#140c08');
  ctx.fillStyle = ground;
  ctx.fillRect(0, h * 0.88, w, h * 0.12);

  // Sand grain + contour lines
  ctx.save();
  for (let i = 0; i < 110; i++) {
    const gx = ((i * 97 + Math.floor(t * 2)) % 200) / 200 * w;
    const gy = h * 0.58 + ((i * 53) % 100) / 100 * h * 0.38;
    ctx.globalAlpha = 0.1 + (i % 4) * 0.03;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,220,160,0.55)' : 'rgba(20,8,4,0.5)';
    ctx.fillRect(gx, gy, 1.6, 1);
  }
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = 'rgba(255, 210, 150, 1)';
  ctx.lineWidth = 1;
  for (let c = 0; c < 5; c++) {
    const cy = h * (0.68 + c * 0.045);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 14) {
      const yy =
        cy +
        Math.sin(x * 0.007 + parallax * 0.3 + c) * 9 +
        Math.sin(x * 0.018 + c * 2) * 3.5;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Soft vignette for HUD contrast
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.18, w * 0.5, h * 0.5, h * 0.9);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.65, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(6,3,4,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  shift: number,
  scale: number,
): void {
  const buildings: Array<[number, number, number, number]> = [
    [0.05, 0.02, 0.05, 0],
    [0.08, 0.032, 0.088, 1],
    [0.13, 0.026, 0.062, 0],
    [0.17, 0.016, 0.125, 2],
    [0.21, 0.038, 0.082, 1],
    [0.27, 0.028, 0.068, 0],
    [0.32, 0.024, 0.105, 1],
    [0.37, 0.015, 0.195, 2],
    [0.4, 0.013, 0.07, 0],
    [0.45, 0.036, 0.092, 1],
    [0.51, 0.024, 0.06, 0],
    [0.56, 0.04, 0.1, 1],
    [0.63, 0.018, 0.078, 0],
    [0.67, 0.03, 0.068, 0],
    [0.73, 0.026, 0.088, 1],
    [0.79, 0.02, 0.052, 0],
    [0.84, 0.028, 0.072, 0],
    [0.9, 0.016, 0.048, 0],
  ];
  for (const [rx, bw, bh, style] of buildings) {
    const x = (rx + shift * 0.018) * w;
    const width = bw * w * scale;
    const height = bh * w * scale;
    const top = baseY - height;

    if (style === 2) {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.5, top - height * 0.38);
      ctx.lineTo(x + width * 0.82, top + height * 0.12);
      ctx.lineTo(x + width, baseY);
      ctx.lineTo(x, baseY);
      ctx.lineTo(x + width * 0.18, top + height * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x + width * 0.44, top - height * 0.52, width * 0.12, height * 0.2);
    } else if (style === 1) {
      ctx.fillRect(x, top + height * 0.22, width, height * 0.78);
      ctx.fillRect(x + width * 0.1, top, width * 0.8, height * 0.28);
      ctx.fillRect(x + width * 0.26, top - height * 0.12, width * 0.48, height * 0.14);
    } else {
      ctx.fillRect(x, top, width, height);
      ctx.fillRect(x - 1, top, width + 2, 1.5);
    }
  }
}

function drawSkylineWindows(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  shift: number,
  t: number,
): void {
  ctx.fillStyle = 'rgba(255, 200, 120, 0.2)';
  for (let i = 0; i < 48; i++) {
    const rx = 0.07 + ((i * 17) % 86) / 100;
    const x = (rx + shift * 0.018) * w;
    const bh = (0.04 + (i % 5) * 0.02) * w;
    const wy = baseY - bh * (0.25 + (i % 5) * 0.12);
    const flicker = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 2.1);
    if (flicker < 0.4) continue;
    ctx.globalAlpha = 0.06 + flicker * 0.14;
    ctx.fillRect(x, wy, 2.2, 2.2);
  }
  ctx.globalAlpha = 1;
}

function drawDuneLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amp: number,
  colors: [string, string],
  t: number,
  parallax: number,
  freq: number,
  depth: number,
): void {
  const steps = 72;
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const n =
      Math.sin((i / steps) * Math.PI * 2 * freq + parallax * 0.5) * amp +
      Math.sin((i / steps) * Math.PI * 4.5 + t * 0.1 + depth) * amp * 0.3 +
      Math.sin((i / steps) * Math.PI * 9 + parallax) * amp * 0.1;
    points.push([x, h * (baseY + n)]);
  }

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.lineTo(w, h);
  ctx.closePath();

  const topY = h * (baseY - amp);
  const grad = ctx.createLinearGradient(0, topY, 0, h * (baseY + amp * 0.5 + 0.15));
  grad.addColorStop(0, colors[1]);
  grad.addColorStop(0.35, colors[0]);
  grad.addColorStop(0.7, shadeHex(colors[0], -18));
  grad.addColorStop(1, shadeHex(colors[0], -40));
  ctx.fillStyle = grad;
  ctx.fill();

  // Lit crest
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(points[i][0], points[i][1]);
    else ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.strokeStyle = `rgba(255, 225, 170, ${0.14 + depth * 0.12})`;
  ctx.lineWidth = 1.5 + depth * 0.8;
  ctx.stroke();

  // Shadow under crest
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const sy = points[i][1] + 5 + depth * 5;
    if (i === 0) ctx.moveTo(points[i][0], sy);
    else ctx.lineTo(points[i][0], sy);
  }
  ctx.strokeStyle = `rgba(30, 12, 6, ${0.18 + depth * 0.14})`;
  ctx.lineWidth = 10 + depth * 4;
  ctx.stroke();

  // Soft lit face (secondary highlight band)
  ctx.save();
  ctx.globalAlpha = 0.08 + depth * 0.06;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(points[i][0], points[i][1] + 2);
    else ctx.lineTo(points[i][0], points[i][1] + 2);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(points[i][0], points[i][1] + 18 + depth * 10);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 200, 120, 1)';
  ctx.fill();
  ctx.restore();
}

function shadeHex(hex: string, amt: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
