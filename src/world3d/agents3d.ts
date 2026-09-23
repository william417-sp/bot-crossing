/**
 * 3D Agent meshes - cute Astro Bot energy with role-distinct silhouettes
 * Round, expressive, bouncy robots with visible working vs idle states
 * Idle agents do silly things: stretch, dance, spin wrench, nap, wave, etc.
 */

import * as THREE from 'three';
import type { Agent, AgentState, Site } from '../world/types';
import { getSiteWorldPosition } from './garage3d';

const GARAGE_WIDTH = 20;
const GARAGE_DEPTH = 16;

type HeadShape = 'round' | 'square' | 'tall' | 'wide';
type AntennaStyle = 'single' | 'dual' | 'dish' | 'spike' | 'loop' | 'none';
type ToolType = 'wrench' | 'tablet' | 'brush' | 'scanner' | 'clipboard' | 'chart';

type IdleAnimation = 
  | 'none'
  | 'stretch'
  | 'dance'
  | 'spin_wrench'
  | 'nap'
  | 'wave'
  | 'polish_antenna'
  | 'look_around'
  | 'bounce_excited'
  | 'head_tilt';

const IDLE_ANIMATIONS: IdleAnimation[] = [
  'stretch',
  'dance',
  'spin_wrench',
  'nap',
  'wave',
  'polish_antenna',
  'look_around',
  'bounce_excited',
  'head_tilt',
];

interface RoleVisual {
  headShape: HeadShape;
  antennaStyle: AntennaStyle;
  toolType: ToolType;
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  coordinator: { headShape: 'round', antennaStyle: 'dual', toolType: 'clipboard' },
  deployer: { headShape: 'square', antennaStyle: 'spike', toolType: 'tablet' },
  designer: { headShape: 'round', antennaStyle: 'loop', toolType: 'brush' },
  builder: { headShape: 'wide', antennaStyle: 'single', toolType: 'wrench' },
  helper: { headShape: 'round', antennaStyle: 'dish', toolType: 'scanner' },
  analyst: { headShape: 'tall', antennaStyle: 'dual', toolType: 'chart' },
  pitcher: { headShape: 'round', antennaStyle: 'spike', toolType: 'clipboard' },
  trader: { headShape: 'tall', antennaStyle: 'dual', toolType: 'chart' },
  producer: { headShape: 'wide', antennaStyle: 'loop', toolType: 'tablet' },
  sales: { headShape: 'round', antennaStyle: 'dish', toolType: 'tablet' },
  desk: { headShape: 'square', antennaStyle: 'dual', toolType: 'clipboard' },
};

const DEFAULT_VISUAL: RoleVisual = { headShape: 'round', antennaStyle: 'single', toolType: 'wrench' };

const STATE_COLORS: Record<AgentState, number> = {
  idle: 0x60a5fa,
  walking: 0xfbbf24,
  building: 0x34d399,
  waiting: 0xf59e0b,
  errored: 0xf87171,
};

export interface Agent3D {
  group: THREE.Group;
  agent: Agent;
  body: THREE.Mesh;
  head: THREE.Mesh;
  core: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  antenna: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  statusPip: THREE.Mesh;
  tool: THREE.Group | null;
  sparks: THREE.Group;
  selectionRing: THREE.Mesh;
  nameSprite: THREE.Sprite;
  idleSparks: THREE.Group;
  zzzHologram: THREE.Group;
  idleAnimation: IdleAnimation;
  idleAnimationStartTime: number;
  idleAnimationDuration: number;
}

export function createAgent3D(agent: Agent): Agent3D {
  const group = new THREE.Group();
  group.name = `agent_${agent.id}`;
  group.userData.agentId = agent.id;

  const visual = ROLE_VISUALS[agent.role ?? ''] ?? DEFAULT_VISUAL;
  const bodyColor = new THREE.Color(agent.color);
  const shadeColor = bodyColor.clone().multiplyScalar(0.7);
  const lightColor = bodyColor.clone().lerp(new THREE.Color(0xffffff), 0.3);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.4,
    metalness: 0.3,
  });
  const shadeMat = new THREE.MeshStandardMaterial({
    color: shadeColor,
    roughness: 0.5,
    metalness: 0.2,
  });

  const body = createBody(bodyMat);
  group.add(body);

  const head = createHead(bodyMat, lightColor, visual.headShape);
  head.position.y = 0.65;
  group.add(head);

  const { leftEye, rightEye } = createEyes(head, visual.headShape);

  const core = createCore();
  core.position.y = 0.32;
  group.add(core);

  const { leftArm, rightArm } = createArms(shadeMat);
  group.add(leftArm);
  group.add(rightArm);

  const { leftFoot, rightFoot } = createFeet(shadeMat, visual.headShape);
  group.add(leftFoot);
  group.add(rightFoot);

  const antenna = createAntenna(shadeMat, visual.antennaStyle, agent.color);
  antenna.position.y = 0.85;
  group.add(antenna);

  const statusPip = createStatusPip(agent.state);
  statusPip.position.set(0.2, 0.8, 0.15);
  group.add(statusPip);

  const tool = createTool(visual.toolType, agent.color);
  if (tool) {
    tool.position.set(0.35, 0.35, 0);
    tool.visible = false;
    group.add(tool);
  }

  const sparks = createSparksGroup();
  sparks.position.set(0.35, 0.4, 0);
  sparks.visible = false;
  group.add(sparks);

  const selectionRing = createSelectionRing();
  selectionRing.position.y = 0.05;
  selectionRing.visible = false;
  group.add(selectionRing);

  const nameSprite = createNameSprite(agent.name, agent.color);
  nameSprite.position.y = 1.3;
  group.add(nameSprite);

  const idleSparks = createIdleSparksGroup();
  idleSparks.position.set(0, 0.5, 0);
  idleSparks.visible = false;
  group.add(idleSparks);

  const zzzHologram = createZzzHologram();
  zzzHologram.position.set(0.25, 0.9, 0);
  zzzHologram.visible = false;
  group.add(zzzHologram);

  const worldX = (agent.x - 0.5) * GARAGE_WIDTH * 0.85;
  const worldZ = (agent.y - 0.5) * GARAGE_DEPTH * 0.7 - 1;
  group.position.set(worldX, 0, worldZ);

  return {
    group,
    agent,
    body,
    head,
    core,
    leftArm,
    rightArm,
    leftFoot,
    rightFoot,
    antenna,
    leftEye,
    rightEye,
    statusPip,
    tool,
    sparks,
    selectionRing,
    nameSprite,
    idleSparks,
    zzzHologram,
    idleAnimation: 'none' as IdleAnimation,
    idleAnimationStartTime: 0,
    idleAnimationDuration: 0,
  };
}

function createBody(mat: THREE.MeshStandardMaterial): THREE.Mesh {
  const bodyGeo = new THREE.CapsuleGeometry(0.18, 0.22, 8, 16);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.32;
  body.castShadow = true;
  body.receiveShadow = true;
  return body;
}

function createHead(
  mat: THREE.MeshStandardMaterial,
  lightColor: THREE.Color,
  shape: HeadShape
): THREE.Mesh {
  let headGeo: THREE.BufferGeometry;

  if (shape === 'square') {
    headGeo = new THREE.BoxGeometry(0.32, 0.28, 0.28);
    const rounded = new THREE.Mesh(headGeo, mat);
    rounded.geometry = roundEdges(headGeo, 0.04);
  } else if (shape === 'tall') {
    headGeo = new THREE.CapsuleGeometry(0.12, 0.14, 8, 16);
  } else if (shape === 'wide') {
    headGeo = new THREE.SphereGeometry(0.18, 16, 12);
    headGeo.scale(1.2, 0.9, 1);
  } else {
    headGeo = new THREE.SphereGeometry(0.17, 16, 12);
  }

  const head = new THREE.Mesh(headGeo, mat);
  head.castShadow = true;

  const highlightMat = new THREE.MeshBasicMaterial({
    color: lightColor,
    transparent: true,
    opacity: 0.3,
  });
  const highlightGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.set(-0.05, 0.06, 0.1);
  head.add(highlight);

  return head;
}

function roundEdges(geo: THREE.BufferGeometry, _radius: number): THREE.BufferGeometry {
  return geo;
}

function createEyes(head: THREE.Mesh, shape: HeadShape): { leftEye: THREE.Mesh; rightEye: THREE.Mesh } {
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x080c18 });
  const visorWidth = shape === 'wide' ? 0.22 : 0.18;
  const visorHeight = shape === 'square' ? 0.07 : 0.09;
  const visorGeo = new THREE.SphereGeometry(1, 16, 8);
  visorGeo.scale(visorWidth, visorHeight, 0.08);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0, 0.12);
  head.add(visor);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
  leftEye.position.set(-0.055, 0.01, 0.14);
  leftEye.userData.isEye = true;
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
  rightEye.position.set(0.055, 0.01, 0.14);
  rightEye.userData.isEye = true;
  head.add(rightEye);

  const shineMat = new THREE.MeshBasicMaterial({
    color: 0xb4e6ff,
    transparent: true,
    opacity: 0.8,
  });
  const shineGeo = new THREE.SphereGeometry(0.012, 6, 6);

  const leftShine = new THREE.Mesh(shineGeo, shineMat);
  leftShine.position.set(-0.01, 0.01, 0.035);
  leftEye.add(leftShine);

  const rightShine = new THREE.Mesh(shineGeo, shineMat);
  rightShine.position.set(-0.01, 0.01, 0.035);
  rightEye.add(rightShine);

  return { leftEye, rightEye };
}

function createCore(): THREE.Mesh {
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xdcf0ff,
    transparent: true,
    opacity: 0.9,
  });
  const coreGeo = new THREE.SphereGeometry(0.05, 12, 12);
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.userData.isCore = true;

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x96dcff,
    transparent: true,
    opacity: 0.3,
  });
  const glowGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.userData.isCoreGlow = true;
  core.add(glow);

  return core;
}

function createArms(mat: THREE.MeshStandardMaterial): { leftArm: THREE.Mesh; rightArm: THREE.Mesh } {
  const armGeo = new THREE.CapsuleGeometry(0.04, 0.12, 6, 8);

  const leftArm = new THREE.Mesh(armGeo, mat);
  leftArm.position.set(-0.24, 0.32, 0);
  leftArm.castShadow = true;
  leftArm.userData.isLeftArm = true;

  const rightArm = new THREE.Mesh(armGeo, mat);
  rightArm.position.set(0.24, 0.32, 0);
  rightArm.castShadow = true;
  rightArm.userData.isRightArm = true;

  return { leftArm, rightArm };
}

function createFeet(mat: THREE.MeshStandardMaterial, shape: HeadShape): { leftFoot: THREE.Mesh; rightFoot: THREE.Mesh } {
  const footWidth = shape === 'wide' ? 0.08 : 0.06;
  const footGeo = new THREE.BoxGeometry(footWidth, 0.04, 0.08);

  const leftFoot = new THREE.Mesh(footGeo, mat);
  leftFoot.position.set(-0.08, 0.02, 0);
  leftFoot.castShadow = true;
  leftFoot.userData.isLeftFoot = true;

  const rightFoot = new THREE.Mesh(footGeo, mat);
  rightFoot.position.set(0.08, 0.02, 0);
  rightFoot.castShadow = true;
  rightFoot.userData.isRightFoot = true;

  return { leftFoot, rightFoot };
}

function createAntenna(
  mat: THREE.MeshStandardMaterial,
  style: AntennaStyle,
  accentColor: string
): THREE.Group {
  const antenna = new THREE.Group();
  const accent = new THREE.Color(accentColor);
  const tipMat = new THREE.MeshBasicMaterial({ color: accent });

  if (style === 'single') {
    const stalkGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
    const stalk = new THREE.Mesh(stalkGeo, mat);
    stalk.position.y = 0.06;
    antenna.add(stalk);

    const tipGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.14;
    tip.userData.isAntennaTip = true;
    antenna.add(tip);
  } else if (style === 'dual') {
    const stalkGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6);
    const tipGeo = new THREE.SphereGeometry(0.025, 6, 6);

    const leftStalk = new THREE.Mesh(stalkGeo, mat);
    leftStalk.position.set(-0.06, 0.05, 0);
    antenna.add(leftStalk);
    const leftTip = new THREE.Mesh(tipGeo, tipMat);
    leftTip.position.set(-0.06, 0.12, 0);
    leftTip.userData.isAntennaTip = true;
    antenna.add(leftTip);

    const rightStalk = new THREE.Mesh(stalkGeo, mat);
    rightStalk.position.set(0.06, 0.05, 0);
    antenna.add(rightStalk);
    const rightTip = new THREE.Mesh(tipGeo, tipMat);
    rightTip.position.set(0.06, 0.12, 0);
    rightTip.userData.isAntennaTip = true;
    antenna.add(rightTip);
  } else if (style === 'dish') {
    const stalkGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6);
    const stalk = new THREE.Mesh(stalkGeo, mat);
    stalk.position.y = 0.03;
    antenna.add(stalk);

    const dishGeo = new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dish = new THREE.Mesh(dishGeo, mat);
    dish.rotation.x = Math.PI;
    dish.position.y = 0.06;
    antenna.add(dish);

    const receiverGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const receiver = new THREE.Mesh(receiverGeo, tipMat);
    receiver.position.y = 0.06;
    receiver.userData.isAntennaTip = true;
    antenna.add(receiver);
  } else if (style === 'spike') {
    const spikeGeo = new THREE.ConeGeometry(0.03, 0.15, 8);
    const spike = new THREE.Mesh(spikeGeo, mat);
    spike.position.y = 0.075;
    antenna.add(spike);

    const tipGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.16;
    tip.userData.isAntennaTip = true;
    antenna.add(tip);
  } else if (style === 'loop') {
    const loopGeo = new THREE.TorusGeometry(0.05, 0.01, 8, 16);
    const loopMat = mat.clone();
    const loop = new THREE.Mesh(loopGeo, loopMat);
    loop.position.y = 0.05;
    antenna.add(loop);

    const tipGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.1;
    tip.userData.isAntennaTip = true;
    antenna.add(tip);
  }

  return antenna;
}

function createStatusPip(state: AgentState): THREE.Mesh {
  const pipMat = new THREE.MeshBasicMaterial({ color: STATE_COLORS[state] });
  const pipGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const pip = new THREE.Mesh(pipGeo, pipMat);
  pip.userData.isStatusPip = true;

  const glowMat = new THREE.MeshBasicMaterial({
    color: STATE_COLORS[state],
    transparent: true,
    opacity: 0.3,
  });
  const glowGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.userData.isPipGlow = true;
  pip.add(glow);

  return pip;
}

function createTool(type: ToolType, _agentColor: string): THREE.Group | null {
  const tool = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.3 });

  if (type === 'wrench') {
    const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 8);
    const handle = new THREE.Mesh(handleGeo, metalMat);
    handle.rotation.z = Math.PI / 2;
    tool.add(handle);

    const headGeo = new THREE.BoxGeometry(0.06, 0.02, 0.03);
    const head = new THREE.Mesh(headGeo, metalMat);
    head.position.x = 0.09;
    tool.add(head);
  } else if (type === 'tablet') {
    const bodyGeo = new THREE.BoxGeometry(0.1, 0.07, 0.01);
    const body = new THREE.Mesh(bodyGeo, darkMat);
    tool.add(body);

    const screenMat = new THREE.MeshBasicMaterial({ color: 0x64c8ff, transparent: true, opacity: 0.6 });
    const screenGeo = new THREE.PlaneGeometry(0.08, 0.05);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = 0.006;
    screen.userData.isToolScreen = true;
    tool.add(screen);
  } else if (type === 'brush') {
    const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.z = Math.PI / 2;
    tool.add(handle);

    const bristleGeo = new THREE.ConeGeometry(0.025, 0.05, 8);
    const bristleMat = new THREE.MeshStandardMaterial({ color: 0xa78bfa });
    const bristle = new THREE.Mesh(bristleGeo, bristleMat);
    bristle.rotation.z = -Math.PI / 2;
    bristle.position.x = 0.075;
    tool.add(bristle);
  } else if (type === 'scanner') {
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const body = new THREE.Mesh(bodyGeo, darkMat);
    tool.add(body);

    const scanMat = new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 });
    const scanGeo = new THREE.PlaneGeometry(0.05, 0.03);
    const scan = new THREE.Mesh(scanGeo, scanMat);
    scan.position.z = 0.011;
    scan.userData.isToolScreen = true;
    tool.add(scan);
  } else if (type === 'clipboard') {
    const boardGeo = new THREE.BoxGeometry(0.08, 0.1, 0.01);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x4a5568 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    tool.add(board);

    const paperMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const paperGeo = new THREE.PlaneGeometry(0.06, 0.08);
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.z = 0.006;
    tool.add(paper);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    for (let i = 0; i < 3; i++) {
      const lineGeo = new THREE.PlaneGeometry(0.04, 0.005);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 0.025 - i * 0.02, 0.007);
      tool.add(line);
    }
  } else if (type === 'chart') {
    const screenGeo = new THREE.BoxGeometry(0.1, 0.07, 0.01);
    const screen = new THREE.Mesh(screenGeo, darkMat);
    tool.add(screen);

    const barColors = [0x22d3ee, 0xa78bfa, 0x34d399];
    for (let i = 0; i < 3; i++) {
      const barMat = new THREE.MeshBasicMaterial({ color: barColors[i] });
      const barGeo = new THREE.BoxGeometry(0.015, 0.03 + i * 0.01, 0.005);
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(-0.025 + i * 0.025, -0.01 + (i * 0.005), 0.008);
      bar.userData.isChartBar = true;
      bar.userData.barIndex = i;
      tool.add(bar);
    }
  } else {
    return null;
  }

  return tool;
}

function createSparksGroup(): THREE.Group {
  const sparks = new THREE.Group();

  const sparkMat = new THREE.MeshBasicMaterial({
    color: 0xffdc64,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < 6; i++) {
    const sparkGeo = new THREE.SphereGeometry(0.015, 4, 4);
    const spark = new THREE.Mesh(sparkGeo, sparkMat.clone());
    spark.userData.sparkIndex = i;
    spark.visible = false;
    sparks.add(spark);
  }

  return sparks;
}

function createIdleSparksGroup(): THREE.Group {
  const sparks = new THREE.Group();

  const colors = [0x70e8ff, 0xffc864, 0xa0ff90, 0xff90c0];
  
  for (let i = 0; i < 8; i++) {
    const sparkMat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.8,
    });
    const sparkGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.userData.idleSparkIndex = i;
    spark.userData.orbitRadius = 0.25 + (i % 3) * 0.1;
    spark.userData.orbitSpeed = 1.5 + Math.random();
    spark.userData.phase = (i / 8) * Math.PI * 2;
    sparks.add(spark);
  }

  return sparks;
}

function createZzzHologram(): THREE.Group {
  const zzz = new THREE.Group();

  const positions = [
    { x: 0, y: 0, size: 0.08 },
    { x: 0.08, y: 0.12, size: 0.06 },
    { x: 0.14, y: 0.22, size: 0.045 },
  ];

  for (let i = 0; i < positions.length; i++) {
    const { x, y, size } = positions[i];
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#70e8ff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, y, 0);
    sprite.userData.zIndex = i;
    zzz.add(sprite);
  }

  return zzz;
}

function createSelectionRing(): THREE.Mesh {
  const ringGeo = new THREE.TorusGeometry(0.35, 0.02, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x64c8ff,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.userData.isSelectionRing = true;
  return ring;
}

function createNameSprite(name: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(8, 12, 24, 0.9)';
  ctx.roundRect(8, 8, 240, 48, 8);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.roundRect(8, 8, 240, 48, 8);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillRect(12, 16, 4, 32);

  ctx.fillStyle = 'rgba(210, 225, 245, 0.98)';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.substring(0, 16), 130, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.6, 0.15, 1);
  return sprite;
}

export function updateAgent3D(
  agent3d: Agent3D,
  agent: Agent,
  sites: Site[],
  time: number,
  dt: number
): void {
  agent3d.agent = agent;

  const targetWorldX = (agent.x - 0.5) * GARAGE_WIDTH * 0.85;
  const targetWorldZ = (agent.y - 0.5) * GARAGE_DEPTH * 0.7 - 1;

  const currentPos = agent3d.group.position;
  const dx = targetWorldX - currentPos.x;
  const dz = targetWorldZ - currentPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 0.01) {
    const speed = 2.5;
    const step = Math.min(speed * dt, dist);
    currentPos.x += (dx / dist) * step;
    currentPos.z += (dz / dist) * step;

    if (dist > 0.05) {
      agent3d.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  const isWorking = agent.state === 'building';
  const isWalking = agent.state === 'walking';
  const isIdle = agent.state === 'idle';
  const isWaiting = agent.state === 'waiting';

  if (isIdle || isWaiting) {
    if (agent3d.idleAnimation === 'none' || time > agent3d.idleAnimationStartTime + agent3d.idleAnimationDuration) {
      agent3d.idleAnimation = IDLE_ANIMATIONS[Math.floor(Math.random() * IDLE_ANIMATIONS.length)];
      agent3d.idleAnimationStartTime = time;
      agent3d.idleAnimationDuration = 3 + Math.random() * 4;
    }
  } else {
    agent3d.idleAnimation = 'none';
  }

  let bounce = 0;
  let bodyTilt = 0;
  let headTilt = 0;
  let armLeftRot = 0;
  let armRightRot = 0;
  let armLeftX = 0;
  let armRightX = 0;

  if (isWalking) {
    bounce = Math.abs(Math.sin(time * 8)) * 0.08;
    bodyTilt = Math.sin(time * 8) * 0.1;
    agent3d.leftFoot.position.y = 0.02 + Math.max(0, Math.sin(time * 8)) * 0.05;
    agent3d.rightFoot.position.y = 0.02 + Math.max(0, -Math.sin(time * 8)) * 0.05;
    armLeftRot = Math.sin(time * 8) * 0.4;
    armRightRot = -Math.sin(time * 8) * 0.4;
  } else if (isWorking) {
    bounce = Math.abs(Math.sin(time * 10)) * 0.05 + Math.abs(Math.cos(time * 15)) * 0.02;
    bodyTilt = Math.sin(time * 12) * 0.05;
    agent3d.leftFoot.position.y = 0.02;
    agent3d.rightFoot.position.y = 0.02;
    armLeftRot = Math.sin(time * 12) * 0.3;
    armRightRot = -Math.sin(time * 12) * 0.3;
  } else if (isIdle || isWaiting) {
    const idleT = time - agent3d.idleAnimationStartTime;
    const idleProgress = Math.min(idleT / agent3d.idleAnimationDuration, 1);
    
    switch (agent3d.idleAnimation) {
      case 'stretch':
        bounce = Math.sin(idleT * 1.5) * 0.08;
        armLeftRot = -Math.PI * 0.6 + Math.sin(idleT * 2) * 0.1;
        armRightRot = -Math.PI * 0.6 + Math.cos(idleT * 2) * 0.1;
        armLeftX = -0.1;
        armRightX = 0.1;
        bodyTilt = Math.sin(idleT * 1.5) * 0.05;
        break;
        
      case 'dance':
        bounce = Math.abs(Math.sin(time * 6)) * 0.1;
        bodyTilt = Math.sin(time * 4) * 0.15;
        headTilt = Math.sin(time * 3) * 0.1;
        armLeftRot = Math.sin(time * 6) * 0.6;
        armRightRot = Math.sin(time * 6 + Math.PI) * 0.6;
        agent3d.leftFoot.position.y = 0.02 + Math.max(0, Math.sin(time * 6)) * 0.04;
        agent3d.rightFoot.position.y = 0.02 + Math.max(0, -Math.sin(time * 6)) * 0.04;
        break;
        
      case 'spin_wrench':
        bounce = Math.sin(time * 2) * 0.02;
        armRightRot = Math.sin(time * 8) * 0.8;
        armLeftRot = Math.sin(time * 2) * 0.1;
        agent3d.group.rotation.y += Math.sin(idleT * 2) * 0.002;
        break;
        
      case 'nap':
        bounce = Math.sin(time * 0.8) * 0.02;
        bodyTilt = 0.1;
        headTilt = 0.15;
        armLeftRot = 0.3;
        armRightRot = 0.3;
        agent3d.leftEye.scale.y = 0.1;
        agent3d.rightEye.scale.y = 0.1;
        agent3d.zzzHologram.visible = true;
        agent3d.zzzHologram.children.forEach((z, i) => {
          z.position.y = (positions => positions[i % 3])([0.12, 0.22, 0.30]) + Math.sin(time * 2 + i * 0.5) * 0.03;
          (z as THREE.Sprite).material.opacity = 0.5 + 0.3 * Math.sin(time * 1.5 + i);
        });
        break;
        
      case 'wave':
        bounce = Math.sin(time * 3) * 0.03;
        armRightRot = -Math.PI * 0.5 + Math.sin(time * 8) * 0.3;
        armRightX = 0.15;
        headTilt = Math.sin(time * 4) * 0.1;
        break;
        
      case 'polish_antenna':
        bounce = Math.sin(time * 2) * 0.02;
        armLeftRot = -Math.PI * 0.7;
        armLeftX = 0.08;
        const polishRotation = Math.sin(time * 10) * 0.1;
        agent3d.antenna.rotation.z = polishRotation;
        agent3d.antenna.rotation.x = Math.sin(time * 8) * 0.05;
        break;
        
      case 'look_around':
        bounce = Math.sin(time * 1.5) * 0.015;
        headTilt = Math.sin(time * 0.8) * 0.25;
        agent3d.head.rotation.y = Math.sin(time * 0.5) * 0.4;
        armLeftRot = Math.sin(time * 1.5) * 0.1;
        armRightRot = Math.sin(time * 1.5 + 0.5) * 0.1;
        break;
        
      case 'bounce_excited':
        bounce = Math.abs(Math.sin(time * 10)) * 0.15;
        bodyTilt = Math.sin(time * 8) * 0.08;
        armLeftRot = Math.abs(Math.sin(time * 10)) * 0.5 - 0.5;
        armRightRot = Math.abs(Math.sin(time * 10)) * 0.5 - 0.5;
        agent3d.leftFoot.position.y = 0.02 + Math.abs(Math.sin(time * 10)) * 0.06;
        agent3d.rightFoot.position.y = 0.02 + Math.abs(Math.sin(time * 10)) * 0.06;
        agent3d.idleSparks.visible = true;
        break;
        
      case 'head_tilt':
        bounce = Math.sin(time * 1.2) * 0.01;
        headTilt = Math.sin(time * 0.6) * 0.3;
        agent3d.head.rotation.y = Math.sin(time * 0.4) * 0.2;
        break;
        
      default:
        bounce = Math.sin(time * 2) * 0.01;
        agent3d.leftFoot.position.y = 0.02;
        agent3d.rightFoot.position.y = 0.02;
    }
    
    if (agent3d.idleAnimation !== 'nap') {
      agent3d.zzzHologram.visible = false;
    }
    if (agent3d.idleAnimation !== 'bounce_excited') {
      agent3d.idleSparks.visible = false;
    }
    if (agent3d.idleAnimation !== 'look_around') {
      agent3d.head.rotation.y *= 0.9;
    }
  } else {
    agent3d.leftFoot.position.y = 0.02;
    agent3d.rightFoot.position.y = 0.02;
    agent3d.zzzHologram.visible = false;
    agent3d.idleSparks.visible = false;
  }

  if (agent3d.idleSparks.visible) {
    agent3d.idleSparks.children.forEach((spark) => {
      const s = spark as THREE.Mesh;
      const idx = s.userData.idleSparkIndex;
      const radius = s.userData.orbitRadius;
      const speed = s.userData.orbitSpeed;
      const phase = s.userData.phase;
      
      s.position.x = Math.cos(time * speed + phase) * radius;
      s.position.z = Math.sin(time * speed + phase) * radius;
      s.position.y = 0.3 + Math.sin(time * 2 + idx) * 0.15;
      
      const mat = s.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + 0.4 * Math.sin(time * 3 + idx);
    });
  }

  agent3d.body.position.y = 0.32 + bounce;
  agent3d.head.position.y = 0.65 + bounce;
  agent3d.core.position.y = 0.32 + bounce;
  agent3d.antenna.position.y = 0.85 + bounce;
  agent3d.statusPip.position.y = 0.8 + bounce;
  if (agent3d.tool) agent3d.tool.position.y = 0.35 + bounce;
  agent3d.sparks.position.y = 0.4 + bounce;
  agent3d.nameSprite.position.y = 1.3 + bounce;
  agent3d.idleSparks.position.y = 0.5 + bounce;
  agent3d.zzzHologram.position.y = 0.9 + bounce;

  agent3d.body.rotation.z = bodyTilt;
  agent3d.head.rotation.z = headTilt || bodyTilt * 0.5;

  agent3d.leftArm.rotation.x = armLeftRot;
  agent3d.rightArm.rotation.x = armRightRot;
  agent3d.leftArm.position.y = 0.32 + bounce;
  agent3d.rightArm.position.y = 0.32 + bounce;
  agent3d.leftArm.position.x = -0.24 + armLeftX;
  agent3d.rightArm.position.x = 0.24 + armRightX;

  const antennaWobble = isWorking ? Math.sin(time * 15) * 0.15 : 
    (agent3d.idleAnimation === 'polish_antenna' ? 0 : Math.sin(time * 3) * 0.05);
  if (agent3d.idleAnimation !== 'polish_antenna') {
    agent3d.antenna.rotation.z = antennaWobble;
    agent3d.antenna.rotation.x = 0;
  }

  agent3d.antenna.traverse((obj) => {
    if (obj.userData.isAntennaTip) {
      const tipMat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (isWorking) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 12);
        tipMat.opacity = pulse;
        tipMat.transparent = true;
      } else if (agent3d.idleAnimation === 'bounce_excited') {
        tipMat.opacity = 0.6 + 0.4 * Math.sin(time * 8);
        tipMat.transparent = true;
      } else {
        tipMat.opacity = 1;
        tipMat.transparent = false;
      }
    }
  });

  const coreGlow = agent3d.core.children[0] as THREE.Mesh;
  if (coreGlow?.userData.isCoreGlow) {
    const coreMat = coreGlow.material as THREE.MeshBasicMaterial;
    let corePulse: number;
    if (isWorking) {
      corePulse = 0.4 + 0.3 * Math.sin(time * 12);
    } else if (agent3d.idleAnimation === 'dance' || agent3d.idleAnimation === 'bounce_excited') {
      corePulse = 0.4 + 0.3 * Math.sin(time * 8);
    } else if (isIdle || isWaiting) {
      corePulse = 0.2 + 0.1 * Math.sin(time * 3);
    } else {
      corePulse = 0.3 + 0.2 * Math.sin(time * 5);
    }
    coreMat.opacity = corePulse;
    const coreScale = isWorking ? 1.2 : (agent3d.idleAnimation === 'bounce_excited' ? 1.15 : 1);
    coreGlow.scale.setScalar(coreScale);
  }

  if (agent3d.idleAnimation !== 'nap') {
    const blink = Math.sin(time * 1.2) > 0.96;
    const eyeScaleY = blink ? 0.15 : 1;
    agent3d.leftEye.scale.y = eyeScaleY;
    agent3d.rightEye.scale.y = eyeScaleY;
  }

  const statusColor = STATE_COLORS[agent.state];
  const pipMat = agent3d.statusPip.material as THREE.MeshBasicMaterial;
  pipMat.color.setHex(statusColor);

  const pipGlow = agent3d.statusPip.children[0] as THREE.Mesh;
  if (pipGlow?.userData.isPipGlow) {
    const pipGlowMat = pipGlow.material as THREE.MeshBasicMaterial;
    pipGlowMat.color.setHex(statusColor);
    const pipPulse = isWorking ? 0.5 + 0.3 * Math.sin(time * 15) : 0.3;
    pipGlowMat.opacity = pipPulse;
  }

  if (agent3d.tool) {
    agent3d.tool.visible = isWorking;
    if (isWorking) {
      agent3d.tool.rotation.z = Math.sin(time * 10) * 0.5;
      agent3d.tool.rotation.y = Math.sin(time * 6) * 0.3;

      agent3d.tool.traverse((obj) => {
        if (obj.userData.isToolScreen) {
          const screenMat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
          screenMat.opacity = 0.4 + 0.3 * Math.sin(time * 8);
        }
        if (obj.userData.isChartBar) {
          const barScale = 0.7 + 0.3 * Math.sin(time * 5 + obj.userData.barIndex);
          obj.scale.y = barScale;
        }
      });
    }
  }

  agent3d.sparks.visible = isWorking;
  if (isWorking) {
    agent3d.sparks.children.forEach((spark, i) => {
      const sparkMesh = spark as THREE.Mesh;
      const phase = (time * 6 + i * 1.2) % 2;
      sparkMesh.visible = phase < 1;

      if (sparkMesh.visible) {
        const life = 1 - phase;
        sparkMesh.position.set(
          Math.sin(time * 8 + i * 2) * 0.15,
          phase * 0.3,
          Math.cos(time * 6 + i * 1.5) * 0.15
        );
        sparkMesh.scale.setScalar(life);
        (sparkMesh.material as THREE.MeshBasicMaterial).opacity = life * 0.9;
      }
    });
  }

  const selectionPulse = 0.7 + 0.3 * Math.sin(time * 4);
  const selRingMat = agent3d.selectionRing.material as THREE.MeshBasicMaterial;
  selRingMat.opacity = agent3d.selectionRing.visible ? selectionPulse : 0;
  agent3d.selectionRing.rotation.z = time * 0.5;
}

export function setAgentSelected(agent3d: Agent3D, selected: boolean): void {
  agent3d.selectionRing.visible = selected;
}

export function getAgentWorldPosition(agent: Agent): THREE.Vector3 {
  const worldX = (agent.x - 0.5) * GARAGE_WIDTH * 0.85;
  const worldZ = (agent.y - 0.5) * GARAGE_DEPTH * 0.7 - 1;
  return new THREE.Vector3(worldX, 0.4, worldZ);
}
