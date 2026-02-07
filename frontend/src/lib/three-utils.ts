/**
 * Core Three.js Utilities
 * Reusable functions for scene setup, controls, and rendering
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface SceneConfig {
  container: HTMLDivElement;
  cameraType?: 'perspective' | 'orthographic';
  fov?: number;
  alpha?: boolean;
  antialias?: boolean;
  clearColor?: number;
  clearAlpha?: number;
}

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  cleanup: () => void;
}

/**
 * Initialize a Three.js scene with camera and renderer
 */
export function initializeScene(config: SceneConfig): SceneSetup {
  const {
    container,
    cameraType = 'perspective',
    fov = 75,
    alpha = true,
    antialias = true,
    clearColor = 0x000000,
    clearAlpha = 0,
  } = config;

  const scene = new THREE.Scene();
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;

  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  if (cameraType === 'orthographic') {
    const frustumSize = 4;
    camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );
  } else {
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  }

  const renderer = new THREE.WebGLRenderer({ antialias, alpha });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(clearColor, clearAlpha);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.appendChild(renderer.domElement);

  const handleResize = () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    const newAspect = newWidth / newHeight;

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = newAspect;
    } else {
      const frustumSize = 4;
      camera.left = (-frustumSize * newAspect) / 2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };

  window.addEventListener('resize', handleResize);

  const cleanup = () => {
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };

  return { scene, camera, renderer, cleanup };
}

/**
 * Add orbit controls to a scene
 */
export function addOrbitControls(
  camera: THREE.Camera,
  domElement: HTMLElement,
  options?: {
    enableDamping?: boolean;
    dampingFactor?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    minDistance?: number;
    maxDistance?: number;
    enablePan?: boolean;
  }
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = options?.enableDamping ?? true;
  controls.dampingFactor = options?.dampingFactor ?? 0.05;
  controls.autoRotate = options?.autoRotate ?? false;
  controls.autoRotateSpeed = options?.autoRotateSpeed ?? 0.5;
  controls.minDistance = options?.minDistance ?? 1;
  controls.maxDistance = options?.maxDistance ?? 100;
  controls.enablePan = options?.enablePan ?? true;

  return controls;
}

/**
 * Add basic lighting to a scene
 */
export function addBasicLighting(scene: THREE.Scene): void {
  // Strong ambient fill to eliminate dark spots
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  // Primary directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // Secondary directional from opposite side (fill shadows)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
  fillLight.position.set(-5, 8, -7.5);
  scene.add(fillLight);

  // Hemisphere light for sky/ground gradient fill
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(hemiLight);
}

/**
 * Add hemisphere lighting
 */
export function addHemisphereLight(
  scene: THREE.Scene,
  skyColor: number = 0xffffff,
  groundColor: number = 0x080820,
  intensity: number = 2
): THREE.HemisphereLight {
  const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(hemiLight);
  return hemiLight;
}

/**
 * Create a wireframe material
 */
export function createWireframeMaterial(options?: {
  color?: number;
  opacity?: number;
  transparent?: boolean;
  side?: THREE.Side;
}): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: options?.color ?? 0xffffff,
    wireframe: true,
    transparent: options?.transparent ?? true,
    opacity: options?.opacity ?? 0.6,
    side: options?.side ?? THREE.FrontSide,
  });
}

/**
 * Setup raycaster for object interaction
 */
export interface RaycasterSetup {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  updateMouse: (event: MouseEvent, element: HTMLElement) => void;
  intersectObjects: (
    objects: THREE.Object3D[],
    recursive?: boolean
  ) => THREE.Intersection[];
}

export function setupRaycaster(camera: THREE.Camera): RaycasterSetup {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const updateMouse = (event: MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
  };

  const intersectObjects = (objects: THREE.Object3D[], recursive = true) => {
    return raycaster.intersectObjects(objects, recursive);
  };

  return { raycaster, mouse, updateMouse, intersectObjects };
}

/**
 * Apply wireframe to all meshes in an object
 */
export function applyWireframeToObject(
  object: THREE.Object3D,
  options?: {
    color?: number;
    opacity?: number;
  }
): Map<THREE.Mesh, THREE.Material | THREE.Material[]> {
  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      originalMaterials.set(child, child.material);
      child.material = createWireframeMaterial({
        color: options?.color ?? 0x00ff00,
        opacity: options?.opacity ?? 0.8,
      });
    }
  });

  return originalMaterials;
}

/**
 * Restore original materials to an object
 */
export function restoreOriginalMaterials(
  object: THREE.Object3D,
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const original = originalMaterials.get(child);
      if (original) {
        child.material = original;
      }
    }
  });
}

/**
 * Calculate bounding box center
 */
export function getObjectCenter(object: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

/**
 * Calculate bounding box size
 */
export function getObjectSize(object: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

/**
 * Center and scale an object to fit in view
 */
export function normalizeObject(
  object: THREE.Object3D,
  targetSize: number = 2
): void {
  const center = getObjectCenter(object);
  const size = getObjectSize(object);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDim;

  object.position.sub(center);
  object.scale.setScalar(scale);
}

/**
 * Create animation loop
 */
export function createAnimationLoop(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  onUpdate?: (deltaTime: number) => void
): { start: () => void; stop: () => void } {
  let animationFrameId: number | null = null;
  let lastTime = 0;

  const animate = (time: number) => {
    animationFrameId = requestAnimationFrame(animate);

    const deltaTime = time - lastTime;
    lastTime = time;

    if (onUpdate) {
      onUpdate(deltaTime);
    }

    renderer.render(scene, camera);
  };

  const start = () => {
    if (animationFrameId === null) {
      lastTime = performance.now();
      animate(lastTime);
    }
  };

  const stop = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  return { start, stop };
}

/**
 * Dispose of Three.js objects
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  Object.keys(material).forEach((key) => {
    const value = (material as unknown as Record<string, unknown>)[key];
    if (value && value instanceof THREE.Texture) {
      value.dispose();
    }
  });

  material.dispose();
}

/**
 * Create a grid helper
 */
export function createGrid(
  size: number = 10,
  divisions: number = 10,
  color1: number = 0x444444,
  color2: number = 0x222222
): THREE.GridHelper {
  return new THREE.GridHelper(size, divisions, color1, color2);
}
