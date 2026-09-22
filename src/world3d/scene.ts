/**
 * Three.js scene setup with orbit controls, lighting, and camera
 * Tony Stark-style garage HQ with holographic atmosphere
 * Premium PS5-style graphics: better lighting, mild bloom, crisp silhouettes
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface World3DContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  clock: THREE.Clock;
  composer: EffectComposer;
}

export function createWorld3D(container: HTMLElement): World3DContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1018);
  scene.fog = new THREE.Fog(0x0c1018, 12, 40);

  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;

  const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
  camera.position.set(0, 4, 12);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = 'grab';

  const composer = new EffectComposer(renderer);
  
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    0.35,
    0.6,
    0.7
  );
  composer.addPass(bloomPass);
  
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 25;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.target.set(0, 1, 0);
  controls.enablePan = true;
  controls.panSpeed = 0.5;
  controls.rotateSpeed = 0.6;
  controls.update();

  setupLighting(scene);

  const clock = new THREE.Clock();

  return { scene, camera, renderer, controls, clock, composer };
}

function setupLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0x4060a0, 0.8);
  scene.add(ambient);

  const hemiLight = new THREE.HemisphereLight(0x6090d0, 0x203040, 0.6);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  const mainLight = new THREE.DirectionalLight(0xdce8ff, 1.2);
  mainLight.position.set(2, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 30;
  mainLight.shadow.camera.left = -15;
  mainLight.shadow.camera.right = 15;
  mainLight.shadow.camera.top = 15;
  mainLight.shadow.camera.bottom = -15;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xa0c0e0, 0.4);
  fillLight.position.set(-5, 5, -3);
  scene.add(fillLight);

  const ceilingLightPositions = [-6, -2, 2, 6];
  for (const xPos of ceilingLightPositions) {
    const light = new THREE.PointLight(0xc0e0ff, 2.5, 14);
    light.position.set(xPos, 5.5, 0);
    light.castShadow = false;
    scene.add(light);
  }

  const holoLight1 = new THREE.PointLight(0x50f8ff, 1.5, 10);
  holoLight1.position.set(-3, 2, 1);
  scene.add(holoLight1);

  const holoLight2 = new THREE.PointLight(0x50f8ff, 1.5, 10);
  holoLight2.position.set(3, 2, -1);
  scene.add(holoLight2);

  const holoLight3 = new THREE.PointLight(0x40e0ff, 1.0, 8);
  holoLight3.position.set(0, 3, -3);
  scene.add(holoLight3);

  const rimLight = new THREE.DirectionalLight(0x60a0e0, 0.6);
  rimLight.position.set(0, 2, -8);
  scene.add(rimLight);

  const floorBounce = new THREE.PointLight(0x304060, 0.5, 20);
  floorBounce.position.set(0, 0.5, 2);
  scene.add(floorBounce);
}

export function resizeWorld3D(ctx: World3DContext, container: HTMLElement): void {
  const width = container.clientWidth;
  const height = container.clientHeight;
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(width, height);
  ctx.composer.setSize(width, height);
}

export function disposeWorld3D(ctx: World3DContext): void {
  ctx.renderer.dispose();
  ctx.controls.dispose();
  ctx.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}
