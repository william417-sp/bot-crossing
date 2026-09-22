/**
 * 3D Tony Stark-style garage environment
 * Concrete floor, tool walls, cyan/blue holograms, workstations, charging pads
 */

import * as THREE from 'three';
import type { Site } from '../world/types';

export interface GarageElements {
  floor: THREE.Mesh;
  walls: THREE.Group;
  ceiling: THREE.Group;
  holograms: THREE.Group;
  particles: THREE.Group;
  workstations: Map<string, THREE.Group>;
}

const GARAGE_WIDTH = 20;
const GARAGE_DEPTH = 16;
const GARAGE_HEIGHT = 6;

export function createGarage(scene: THREE.Scene, sites: Site[]): GarageElements {
  const floor = createFloor();
  scene.add(floor);

  const walls = createWalls();
  scene.add(walls);

  const ceiling = createCeiling();
  scene.add(ceiling);

  const holograms = createFloatingHolograms();
  scene.add(holograms);

  const particles = createAmbientParticles();
  scene.add(particles);

  const workstations = createWorkstations(sites);
  for (const ws of workstations.values()) {
    scene.add(ws);
  }

  return { floor, walls, ceiling, holograms, particles, workstations };
}

function createFloor(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(GARAGE_WIDTH, GARAGE_DEPTH, 40, 32);
  
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#252838';
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.strokeStyle = 'rgba(80, 160, 220, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const y = (i / 16) * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 16; i++) {
    const x = (i / 16) * 512;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  
  ctx.strokeStyle = 'rgba(220, 200, 80, 0.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 15]);
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(40, 512);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(472, 0);
  ctx.lineTo(472, 512);
  ctx.stroke();
  ctx.setLineDash([]);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
    metalness: 0.15,
    color: 0x2a3040,
  });
  
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  
  return floor;
}

function createWalls(): THREE.Group {
  const walls = new THREE.Group();
  walls.name = 'walls';
  
  const backWallGeo = new THREE.PlaneGeometry(GARAGE_WIDTH, GARAGE_HEIGHT, 20, 10);
  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0x1a202a,
    roughness: 0.85,
    metalness: 0.15,
  });
  const backWall = new THREE.Mesh(backWallGeo, backWallMat);
  backWall.position.set(0, GARAGE_HEIGHT / 2, -GARAGE_DEPTH / 2);
  backWall.receiveShadow = true;
  walls.add(backWall);
  
  const panelCount = 6;
  const panelWidth = GARAGE_WIDTH / panelCount;
  for (let i = 0; i < panelCount; i++) {
    const panelGeo = new THREE.BoxGeometry(panelWidth - 0.2, GARAGE_HEIGHT - 1, 0.15);
    const isLit = i === 1 || i === 3 || i === 4;
    const panelMat = new THREE.MeshStandardMaterial({
      color: isLit ? 0x2a3545 : 0x1e2635,
      roughness: 0.65,
      metalness: 0.25,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(
      -GARAGE_WIDTH / 2 + panelWidth / 2 + i * panelWidth,
      GARAGE_HEIGHT / 2,
      -GARAGE_DEPTH / 2 + 0.1
    );
    walls.add(panel);
    
    const frameGeo = new THREE.EdgesGeometry(panelGeo);
    const frameMat = new THREE.LineBasicMaterial({ color: 0x5080b8, transparent: true, opacity: 0.5 });
    const frame = new THREE.LineSegments(frameGeo, frameMat);
    frame.position.copy(panel.position);
    walls.add(frame);
  }
  
  createToolRacks(walls);
  createVentGrilles(walls);
  
  const sideWallMat = new THREE.MeshStandardMaterial({
    color: 0x141a24,
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
  });
  
  const leftWallGeo = new THREE.PlaneGeometry(GARAGE_DEPTH, GARAGE_HEIGHT);
  const leftWall = new THREE.Mesh(leftWallGeo, sideWallMat);
  leftWall.position.set(-GARAGE_WIDTH / 2, GARAGE_HEIGHT / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  walls.add(leftWall);
  
  const rightWall = new THREE.Mesh(leftWallGeo, sideWallMat);
  rightWall.position.set(GARAGE_WIDTH / 2, GARAGE_HEIGHT / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  walls.add(rightWall);
  
  return walls;
}

function createToolRacks(walls: THREE.Group): void {
  const rackPositions = [-6, 0, 6];
  
  for (const xPos of rackPositions) {
    const rackGeo = new THREE.BoxGeometry(1.5, 2.5, 0.2);
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x242838,
      roughness: 0.7,
      metalness: 0.35,
    });
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.set(xPos, 3, -GARAGE_DEPTH / 2 + 0.2);
    walls.add(rack);
    
    for (let i = 0; i < 4; i++) {
      const toolGeo = new THREE.BoxGeometry(0.8, 0.08, 0.12);
      const toolMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.4, roughness: 0.5 });
      const tool = new THREE.Mesh(toolGeo, toolMat);
      tool.position.set(xPos, 3.8 - i * 0.5, -GARAGE_DEPTH / 2 + 0.25);
      walls.add(tool);
      
      const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
      const handle = new THREE.Mesh(handleGeo, toolMat);
      handle.position.set(xPos + 0.2, 3.8 - i * 0.5 + 0.24, -GARAGE_DEPTH / 2 + 0.25);
      walls.add(handle);
    }
  }
}

function createVentGrilles(walls: THREE.Group): void {
  for (let i = 0; i < 4; i++) {
    const vx = -6 + i * 4;
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x161c28,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    const grilleGeo = new THREE.BoxGeometry(0.8, 0.3, 0.05);
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(vx, GARAGE_HEIGHT - 0.4, -GARAGE_DEPTH / 2 + 0.08);
    walls.add(grille);
    
    const ledGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x60d8ff });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(vx + 0.35, GARAGE_HEIGHT - 0.4, -GARAGE_DEPTH / 2 + 0.12);
    led.userData.isLED = true;
    led.userData.phase = i;
    walls.add(led);
  }
}

function createCeiling(): THREE.Group {
  const ceiling = new THREE.Group();
  ceiling.name = 'ceiling';
  
  const ceilingGeo = new THREE.PlaneGeometry(GARAGE_WIDTH, GARAGE_DEPTH);
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x121620,
    roughness: 0.9,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.y = GARAGE_HEIGHT;
  ceiling.add(ceilingMesh);
  
  const lightPositions = [-6, -2, 2, 6];
  for (const xPos of lightPositions) {
    const fixtureGeo = new THREE.BoxGeometry(1.2, 0.15, 0.4);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x1e2430 });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(xPos, GARAGE_HEIGHT - 0.08, 0);
    ceiling.add(fixture);
    
    const ledStripGeo = new THREE.BoxGeometry(1.0, 0.05, 0.25);
    const ledStripMat = new THREE.MeshBasicMaterial({ color: 0xf0f8ff });
    const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
    ledStrip.position.set(xPos, GARAGE_HEIGHT - 0.16, 0);
    ledStrip.userData.isCeilingLight = true;
    ceiling.add(ledStrip);
    
    const coneGeo = new THREE.ConeGeometry(1.5, 3, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xc0e0ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(xPos, GARAGE_HEIGHT - 1.6, 0);
    cone.rotation.x = Math.PI;
    cone.userData.isLightCone = true;
    ceiling.add(cone);
  }
  
  return ceiling;
}

function createFloatingHolograms(): THREE.Group {
  const holograms = new THREE.Group();
  holograms.name = 'holograms';
  
  const holoPositions = [
    { x: -5, y: 3.5, z: -4, type: 'cube' },
    { x: -2, y: 3.8, z: -5, type: 'data' },
    { x: 3, y: 3.2, z: -4.5, type: 'sphere' },
    { x: 6, y: 3.6, z: -3.5, type: 'cube' },
    { x: 0, y: 4.0, z: -5.5, type: 'ring' },
  ];
  
  for (const pos of holoPositions) {
    const holoGroup = new THREE.Group();
    holoGroup.position.set(pos.x, pos.y, pos.z);
    holoGroup.userData.holoType = pos.type;
    holoGroup.userData.floatOffset = Math.random() * Math.PI * 2;
    
    if (pos.type === 'cube') {
      const cubeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const edgesGeo = new THREE.EdgesGeometry(cubeGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0x70e8ff, transparent: true, opacity: 0.9 });
      const cube = new THREE.LineSegments(edgesGeo, edgesMat);
      holoGroup.add(cube);
      
      const innerGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x50e0ff,
        transparent: true,
        opacity: 0.12,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      holoGroup.add(inner);
    } else if (pos.type === 'sphere') {
      const sphereGeo = new THREE.SphereGeometry(0.4, 16, 12);
      const wireGeo = new THREE.WireframeGeometry(sphereGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: 0x70e8ff, transparent: true, opacity: 0.8 });
      const sphere = new THREE.LineSegments(wireGeo, wireMat);
      holoGroup.add(sphere);
      
      const ringGeo = new THREE.TorusGeometry(0.5, 0.02, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x80f0ff, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.userData.isOrbitRing = true;
      holoGroup.add(ring);
    } else if (pos.type === 'ring') {
      const ringGeo = new THREE.TorusGeometry(0.5, 0.03, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x60e0ff, transparent: true, opacity: 0.7 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.userData.isMainRing = true;
      holoGroup.add(ring);
      
      const ring2Geo = new THREE.TorusGeometry(0.35, 0.02, 10, 36);
      const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x90f0ff, transparent: true, opacity: 0.5 });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI / 3;
      ring2.userData.isInnerRing = true;
      holoGroup.add(ring2);
    } else {
      const panelGeo = new THREE.PlaneGeometry(0.8, 0.5);
      const panelMat = new THREE.MeshBasicMaterial({
        color: 0x40e0ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      holoGroup.add(panel);
      
      const frameGeo = new THREE.EdgesGeometry(panelGeo);
      const frameMat = new THREE.LineBasicMaterial({ color: 0x60f0ff, transparent: true, opacity: 0.85 });
      const frame = new THREE.LineSegments(frameGeo, frameMat);
      holoGroup.add(frame);
      
      for (let i = 0; i < 4; i++) {
        const lineGeo = new THREE.PlaneGeometry(0.3 + Math.random() * 0.2, 0.02);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x80ffff, transparent: true, opacity: 0.7 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(-0.15, 0.15 - i * 0.08, 0.01);
        line.userData.isDataLine = true;
        line.userData.lineIndex = i;
        holoGroup.add(line);
      }
    }
    
    const glowGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x40d8ff,
      transparent: true,
      opacity: 0.08,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    holoGroup.add(glow);
    
    holograms.add(holoGroup);
  }
  
  return holograms;
}

function createAmbientParticles(): THREE.Group {
  const particles = new THREE.Group();
  particles.name = 'particles';
  
  const particleCount = 50;
  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0x80e8ff,
    transparent: true,
    opacity: 0.6,
  });
  
  for (let i = 0; i < particleCount; i++) {
    const size = 0.02 + Math.random() * 0.03;
    const sparkGeo = new THREE.SphereGeometry(size, 4, 4);
    const spark = new THREE.Mesh(sparkGeo, sparkMat.clone());
    
    spark.position.set(
      (Math.random() - 0.5) * GARAGE_WIDTH * 0.9,
      0.5 + Math.random() * (GARAGE_HEIGHT - 1),
      (Math.random() - 0.5) * GARAGE_DEPTH * 0.8
    );
    
    spark.userData.isParticle = true;
    spark.userData.baseY = spark.position.y;
    spark.userData.phase = Math.random() * Math.PI * 2;
    spark.userData.speed = 0.3 + Math.random() * 0.5;
    spark.userData.drift = (Math.random() - 0.5) * 0.3;
    
    particles.add(spark);
  }
  
  for (let i = 0; i < 20; i++) {
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
    });
    const dustGeo = new THREE.SphereGeometry(0.015 + Math.random() * 0.01, 4, 4);
    const dust = new THREE.Mesh(dustGeo, dustMat);
    
    dust.position.set(
      (Math.random() - 0.5) * GARAGE_WIDTH * 0.95,
      Math.random() * GARAGE_HEIGHT,
      (Math.random() - 0.5) * GARAGE_DEPTH * 0.85
    );
    
    dust.userData.isDust = true;
    dust.userData.basePos = dust.position.clone();
    dust.userData.phase = Math.random() * Math.PI * 2;
    
    particles.add(dust);
  }
  
  return particles;
}

function createWorkstations(sites: Site[]): Map<string, THREE.Group> {
  const workstations = new Map<string, THREE.Group>();
  
  for (const site of sites) {
    const ws = new THREE.Group();
    ws.name = `workstation_${site.id}`;
    
    const worldX = (site.x - 0.5) * GARAGE_WIDTH * 0.85;
    const worldZ = (site.y - 0.5) * GARAGE_DEPTH * 0.7 - 1;
    ws.position.set(worldX, 0, worldZ);
    
    if (site.kind === 'workbench') {
      createWorkbench(ws);
    } else if (site.kind === 'holodesk') {
      createHolodesk(ws);
    } else if (site.kind === 'server') {
      createServerRack(ws);
    } else if (site.kind === 'charger') {
      createCharger(ws);
    } else {
      createFabricator(ws);
    }
    
    createNamePlate(ws, site.name);
    
    ws.userData.siteId = site.id;
    ws.userData.siteKind = site.kind;
    ws.userData.active = false;
    ws.userData.progress = 0;
    
    workstations.set(site.id, ws);
  }
  
  return workstations;
}

function createWorkbench(group: THREE.Group): void {
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3a4858, roughness: 0.5, metalness: 0.35 });
  const tableGeo = new THREE.BoxGeometry(1.2, 0.08, 0.6);
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.y = 0.7;
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);
  
  const legGeo = new THREE.BoxGeometry(0.08, 0.66, 0.08);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a3340 });
  const positions = [[-0.5, 0.33, -0.22], [-0.5, 0.33, 0.22], [0.5, 0.33, -0.22], [0.5, 0.33, 0.22]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
  }
  
  const toolMat = new THREE.MeshStandardMaterial({ color: 0x5a6678, metalness: 0.4, roughness: 0.4 });
  const toolGeo1 = new THREE.BoxGeometry(0.15, 0.04, 0.06);
  const tool1 = new THREE.Mesh(toolGeo1, toolMat);
  tool1.position.set(-0.3, 0.76, 0);
  group.add(tool1);
  
  const toolGeo2 = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
  const tool2 = new THREE.Mesh(toolGeo2, toolMat);
  tool2.position.set(0.1, 0.84, 0.1);
  group.add(tool2);
  
  group.userData.stationType = 'workbench';
}

function createHolodesk(group: THREE.Group): void {
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.45, metalness: 0.45 });
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.15, 24);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.075;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  
  const ringGeo = new THREE.TorusGeometry(0.4, 0.02, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x60e0ff, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.16;
  ring.userData.isEmitterRing = true;
  group.add(ring);
  
  const coneGeo = new THREE.ConeGeometry(0.45, 1.2, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x50e0ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = 0.75;
  cone.userData.isProjectionCone = true;
  group.add(cone);
  
  const sphereGeo = new THREE.SphereGeometry(0.2, 12, 10);
  const wireGeo = new THREE.WireframeGeometry(sphereGeo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x80f0ff, transparent: true, opacity: 0.8 });
  const sphere = new THREE.LineSegments(wireGeo, wireMat);
  sphere.position.y = 0.9;
  sphere.userData.isHoloSphere = true;
  group.add(sphere);
  
  group.userData.stationType = 'holodesk';
}

function createServerRack(group: THREE.Group): void {
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.6, metalness: 0.35 });
  const rackGeo = new THREE.BoxGeometry(0.6, 1.4, 0.4);
  const rack = new THREE.Mesh(rackGeo, rackMat);
  rack.position.y = 0.7;
  rack.castShadow = true;
  rack.receiveShadow = true;
  group.add(rack);
  
  const unitMat = new THREE.MeshStandardMaterial({ color: 0x353d4a, roughness: 0.45, metalness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const unitGeo = new THREE.BoxGeometry(0.5, 0.25, 0.35);
    const unit = new THREE.Mesh(unitGeo, unitMat);
    unit.position.set(0, 0.25 + i * 0.32, 0.05);
    group.add(unit);
    
    const led1Geo = new THREE.SphereGeometry(0.02, 6, 6);
    const led1Mat = new THREE.MeshBasicMaterial({ color: 0x50e8b0 });
    const led1 = new THREE.Mesh(led1Geo, led1Mat);
    led1.position.set(-0.18, 0.25 + i * 0.32, 0.2);
    led1.userData.isServerLED = true;
    led1.userData.ledIndex = i;
    group.add(led1);
    
    const led2Mat = new THREE.MeshBasicMaterial({ color: 0x60a0ff });
    const led2 = new THREE.Mesh(led1Geo, led2Mat);
    led2.position.set(-0.12, 0.25 + i * 0.32, 0.2);
    led2.userData.isServerLED = true;
    led2.userData.ledIndex = i + 10;
    group.add(led2);
  }
  
  group.userData.stationType = 'server';
}

function createCharger(group: THREE.Group): void {
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.35, metalness: 0.55 });
  const padGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.1, 24);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.05;
  pad.castShadow = true;
  pad.receiveShadow = true;
  group.add(pad);
  
  const ringGeo = new THREE.TorusGeometry(0.32, 0.015, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x60e0ff, transparent: true, opacity: 0.6 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.11;
  ring1.userData.isChargeRing = true;
  ring1.userData.ringIndex = 0;
  group.add(ring1);
  
  const ring2Geo = new THREE.TorusGeometry(0.22, 0.012, 8, 24);
  const ring2 = new THREE.Mesh(ring2Geo, ringMat);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.12;
  ring2.userData.isChargeRing = true;
  ring2.userData.ringIndex = 1;
  group.add(ring2);
  
  const centerMat = new THREE.MeshBasicMaterial({ color: 0x60a0ff });
  const centerGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = 0.12;
  center.userData.isChargeCenter = true;
  group.add(center);
  
  group.userData.stationType = 'charger';
}

function createFabricator(group: THREE.Group): void {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.5, metalness: 0.45 });
  const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  
  const windowMat = new THREE.MeshBasicMaterial({
    color: 0x50d0ff,
    transparent: true,
    opacity: 0.15,
  });
  const windowGeo = new THREE.PlaneGeometry(0.5, 0.5);
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.set(0, 0.55, 0.26);
  windowMesh.userData.isFabWindow = true;
  group.add(windowMesh);
  
  const frameMat = new THREE.LineBasicMaterial({ color: 0x6090b0 });
  const frameGeo = new THREE.EdgesGeometry(windowGeo);
  const frame = new THREE.LineSegments(frameGeo, frameMat);
  frame.position.copy(windowMesh.position);
  group.add(frame);
  
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x353d4a });
  const panelGeo = new THREE.BoxGeometry(0.55, 0.1, 0.02);
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, 0.1, 0.26);
  group.add(panel);
  
  for (let i = 0; i < 4; i++) {
    const ledGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x2a5080 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-0.18 + i * 0.12, 0.1, 0.28);
    led.userData.isFabLED = true;
    led.userData.ledIndex = i;
    group.add(led);
  }
  
  group.userData.stationType = 'fabricator';
}

function createNamePlate(group: THREE.Group, name: string): void {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = 'rgba(10, 15, 25, 0.9)';
  ctx.roundRect(0, 0, 128, 32, 4);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(150, 200, 230, 0.9)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.substring(0, 14), 64, 17);
  
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  const geo = new THREE.PlaneGeometry(0.6, 0.15);
  const plate = new THREE.Mesh(geo, mat);
  plate.position.set(0, 0.08, 0.5);
  plate.userData.isNamePlate = true;
  group.add(plate);
}

export function updateGarage(elements: GarageElements, time: number, sites: Site[]): void {
  elements.holograms.children.forEach((holo) => {
    const floatOffset = holo.userData.floatOffset || 0;
    holo.position.y += Math.sin(time * 0.7 + floatOffset) * 0.001;
    
    holo.rotation.y += 0.003;
    
    holo.children.forEach((child) => {
      if (child.userData.isOrbitRing) {
        child.rotation.z = time * 0.5;
      }
      if (child.userData.isMainRing) {
        child.rotation.x = time * 0.3;
        child.rotation.y = time * 0.2;
      }
      if (child.userData.isInnerRing) {
        child.rotation.y = time * 0.5;
        child.rotation.z = time * 0.4;
      }
      if (child.userData.isDataLine) {
        const scaleX = 0.5 + 0.5 * Math.sin(time * 2 + child.userData.lineIndex);
        child.scale.x = scaleX;
      }
    });
  });
  
  elements.particles.children.forEach((p) => {
    if (p.userData.isParticle) {
      const phase = p.userData.phase;
      const speed = p.userData.speed;
      p.position.y = p.userData.baseY + Math.sin(time * speed + phase) * 0.3;
      p.position.x += p.userData.drift * 0.001;
      
      if (p.position.x > GARAGE_WIDTH * 0.45) p.position.x = -GARAGE_WIDTH * 0.45;
      if (p.position.x < -GARAGE_WIDTH * 0.45) p.position.x = GARAGE_WIDTH * 0.45;
      
      const mat = (p as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + 0.3 * Math.sin(time * 2 + phase);
    }
    if (p.userData.isDust) {
      const phase = p.userData.phase;
      const basePos = p.userData.basePos;
      p.position.x = basePos.x + Math.sin(time * 0.2 + phase) * 0.5;
      p.position.y = basePos.y + Math.cos(time * 0.15 + phase) * 0.3;
      p.position.z = basePos.z + Math.sin(time * 0.25 + phase * 1.5) * 0.4;
    }
  });
  
  elements.ceiling.traverse((obj) => {
    if (obj.userData.isCeilingLight) {
      const flicker = 0.95 + 0.05 * Math.sin(time * 1.8 + obj.position.x);
      (obj as THREE.Mesh).material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xf0f8ff).multiplyScalar(flicker),
      });
    }
    if (obj.userData.isLightCone) {
      const pulse = 0.06 + 0.02 * Math.sin(time * 1.5 + obj.position.x);
      ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  });
  
  elements.walls.traverse((obj) => {
    if (obj.userData.isLED) {
      const pulse = 0.6 + 0.4 * Math.sin(time * 1.5 + obj.userData.phase);
      ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(
        pulse > 0.8 ? 0x60d8ff : 0x2a6090
      );
    }
  });
  
  for (const [siteId, ws] of elements.workstations) {
    const site = sites.find((s) => s.id === siteId);
    if (!site) continue;
    
    ws.userData.active = site.active;
    ws.userData.progress = site.progress;
    
    updateWorkstationEffects(ws, time, site.active, site.progress);
  }
}

function updateWorkstationEffects(ws: THREE.Group, time: number, active: boolean, progress: number): void {
  const type = ws.userData.stationType;
  
  ws.traverse((obj) => {
    if (type === 'holodesk') {
      if (obj.userData.isProjectionCone) {
        ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = active ? 0.1 : 0.03;
      }
      if (obj.userData.isHoloSphere) {
        obj.rotation.y = time * 0.5;
        obj.rotation.x = time * 0.3;
        obj.visible = active;
      }
      if (obj.userData.isEmitterRing) {
        ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = active ? 0.7 : 0.3;
      }
    }
    
    if (type === 'server') {
      if (obj.userData.isServerLED) {
        const idx = obj.userData.ledIndex;
        const ledActive = active && Math.sin(time * 3 + idx) > 0;
        if (idx < 10) {
          ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(ledActive ? 0x34d399 : 0x1e3a3a);
        } else {
          ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(active ? 0x3b82f6 : 0x1e3a5a);
        }
      }
    }
    
    if (type === 'charger') {
      if (obj.userData.isChargeRing) {
        const pulse = active ? 0.5 + 0.5 * Math.sin(time * 3 + obj.userData.ringIndex) : 0.3;
        ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse * 0.6;
      }
      if (obj.userData.isChargeCenter) {
        const scale = active ? 1 + 0.2 * Math.sin(time * 4) : 1;
        obj.scale.setScalar(scale);
      }
    }
    
    if (type === 'fabricator') {
      if (obj.userData.isFabWindow) {
        ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = active ? 0.15 : 0.05;
      }
      if (obj.userData.isFabLED) {
        const idx = obj.userData.ledIndex;
        const ledActive = active && idx === Math.floor(time * 2) % 4;
        ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(ledActive ? 0x3b82f6 : 0x1e3a5a);
      }
    }
    
    if (type === 'workbench') {
      if (active) {
        ws.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.position.y > 0.75) {
            child.position.x += Math.sin(time * 5) * 0.0005;
          }
        });
      }
    }
  });
}

export function getSiteWorldPosition(site: Site): THREE.Vector3 {
  const worldX = (site.x - 0.5) * GARAGE_WIDTH * 0.85;
  const worldZ = (site.y - 0.5) * GARAGE_DEPTH * 0.7 - 1;
  return new THREE.Vector3(worldX, 0, worldZ);
}
