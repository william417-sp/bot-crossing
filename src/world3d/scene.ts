/**
 * Three.js scene setup with orbit controls, lighting, and camera
 * Tony Stark-style garage HQ with holographic atmosphere
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface World3DContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  clock: THREE.Clock;
}

export function createWorld3D(container: HTMLElement): World3DContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b14);
  scene.fog = new THREE.Fog(0x080b14, 8, 35);

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
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cursor = 'grab';

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

  return { scene, camera, renderer, controls, clock };
}

function setupLighting(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0x1a2a40, 0.4);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xc8dcff, 0.5);
  mainLight.position.set(0, 8, 4);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 25;
  mainLight.shadow.camera.left = -15;
  mainLight.shadow.camera.right = 15;
  mainLight.shadow.camera.top = 15;
  mainLight.shadow.camera.bottom = -15;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  const ceilingLightPositions = [-6, -2, 2, 6];
  for (const xPos of ceilingLightPositions) {
    const light = new THREE.PointLight(0xa0c8ff, 1.5, 12);
    light.position.set(xPos, 5.5, 0);
    light.castShadow = false;
    scene.add(light);
  }

  const holoLight1 = new THREE.PointLight(0x3cf0ff, 0.8, 8);
  holoLight1.position.set(-3, 2, 1);
  scene.add(holoLight1);

  const holoLight2 = new THREE.PointLight(0x3cf0ff, 0.8, 8);
  holoLight2.position.set(3, 2, -1);
  scene.add(holoLight2);

  const rimLight = new THREE.DirectionalLight(0x4080c0, 0.3);
  rimLight.position.set(0, 2, -8);
  scene.add(rimLight);
}

export function resizeWorld3D(ctx: World3DContext, container: HTMLElement): void {
  const width = container.clientWidth;
  const height = container.clientHeight;
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(width, height);
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
