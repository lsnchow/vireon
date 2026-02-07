"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  initializeScene,
  addOrbitControls,
  addBasicLighting,
  createAnimationLoop,
  applyWireframeToObject,
  restoreOriginalMaterials,
  normalizeObject,
  disposeObject,
  createGrid,
  setupRaycaster,
} from "@/lib/three-utils";
import { cn } from "@/lib/utils";

type ViewMode = "wireframe" | "solid" | "xray";

/* ── Theatrical loading stages ── */
const LOADING_STAGES = [
  { label: "Initializing renderer", threshold: 0 },
  { label: "Fetching model geometry", threshold: 15 },
  { label: "Decompressing mesh data", threshold: 35 },
  { label: "Generating wireframe", threshold: 55 },
  { label: "Vectorizing surfaces", threshold: 70 },
  { label: "Applying materials", threshold: 85 },
  { label: "Finalizing scene", threshold: 95 },
];

function getLoadingStage(progress: number): string {
  let stage = LOADING_STAGES[0].label;
  for (const s of LOADING_STAGES) {
    if (progress >= s.threshold) stage = s.label;
  }
  return stage;
}

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
  initialViewMode?: ViewMode;
  showControls?: boolean;
  showGrid?: boolean;
  backgroundColor?: number;
  wireframeColor?: number;
  onModelLoaded?: (model: THREE.Group) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export default function ModelViewer({
  modelUrl,
  className,
  initialViewMode = "wireframe",
  showControls = true,
  showGrid = true,
  backgroundColor = 0x0a0a0a,
  wireframeColor = 0x00ff00,
  onModelLoaded,
  onError,
  onProgress,
}: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(
    new Map()
  );
  const cleanupRef = useRef<(() => void) | null>(null);
  const animationRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(null);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, cleanup } = initializeScene({
      container: mountRef.current,
      cameraType: "perspective",
      fov: 50,
      alpha: false,
      antialias: true,
      clearColor: backgroundColor,
      clearAlpha: 1,
    });

    sceneRef.current = scene;
    cleanupRef.current = cleanup;

    camera.position.set(3, 2, 3);
    camera.lookAt(0, 0, 0);

    addBasicLighting(scene);

    const controls = addOrbitControls(camera, renderer.domElement, {
      enableDamping: true,
      dampingFactor: 0.05,
      autoRotate: false,
      minDistance: 0.5,
      maxDistance: 50,
    });
    controlsRef.current = controls;

    if (showGrid) {
      const grid = createGrid(10, 10, 0x333333, 0x1a1a1a);
      scene.add(grid);
    }

    const { updateMouse, intersectObjects } = setupRaycaster(camera);

    const handleClick = (event: MouseEvent) => {
      if (!modelRef.current) return;
      updateMouse(event, renderer.domElement);
      const intersects = intersectObjects([modelRef.current], true);

      if (intersects.length > 0) {
        const selected = intersects[0].object;
        setSelectedObject(selected);
      } else {
        setSelectedObject(null);
      }
    };

    renderer.domElement.addEventListener("click", handleClick);

    const animation = createAnimationLoop(renderer, scene, camera, () => {
      controls.update();
    });
    animationRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      if (modelRef.current) {
        disposeObject(modelRef.current);
      }
      cleanup();
    };
  }, [backgroundColor, showGrid]);

  // Handle auto-rotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Load model when URL changes
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;

    setLoading(true);
    setError(null);
    setLoadProgress(0);

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      disposeObject(modelRef.current);
      modelRef.current = null;
      originalMaterialsRef.current.clear();
    }

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;

        normalizeObject(model, 2);

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            originalMaterialsRef.current.set(child, child.material);
          }
        });

        if (viewMode === "wireframe") {
          applyWireframeToObject(model, { color: wireframeColor, opacity: 0.8 });
        } else if (viewMode === "xray") {
          applyXrayMode(model);
        }

        sceneRef.current!.add(model);
        setLoading(false);
        onModelLoaded?.(model);
      },
      (progress) => {
        const percent = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0;
        setLoadProgress(Math.round(percent));
        onProgress?.(percent);
      },
      (err) => {
        console.error("Error loading model:", err);
        const error = err instanceof Error ? err : new Error("Failed to load model");
        setError(error.message);
        setLoading(false);
        onError?.(error);
      }
    );
  }, [modelUrl, wireframeColor, onModelLoaded, onProgress, onError]);

  // Handle view mode changes
  useEffect(() => {
    if (!modelRef.current) return;

    const model = modelRef.current;

    switch (viewMode) {
      case "wireframe":
        applyWireframeToObject(model, { color: wireframeColor, opacity: 0.8 });
        break;
      case "xray":
        applyXrayMode(model);
        break;
      case "solid":
        restoreOriginalMaterials(model, originalMaterialsRef.current);
        break;
    }
  }, [viewMode, wireframeColor]);

  const applyXrayMode = (model: THREE.Object3D) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: wireframeColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      }
    });
  };

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  return (
    <div className={cn("relative w-full h-full bg-black", className)}>
      <div ref={mountRef} className="w-full h-full" />

      {/* Theatrical loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[#060d18]/95 flex flex-col items-center justify-center z-10">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vireon" className="w-14 h-14 mb-6 opacity-60" />

          {/* Spinner */}
          <div className="w-20 h-20 border-2 border-white/10 border-t-white/50 rounded-full animate-spin mb-6" />

          {/* Stage label */}
          <div className="font-mono text-sm text-white/60 mb-3 tracking-wider">
            {getLoadingStage(loadProgress)}
            <span className="animate-pulse">...</span>
          </div>

          {/* Progress bar */}
          <div className="w-80 h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-white/30 transition-all duration-500 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          {/* Percentage */}
          <div className="font-mono text-xs text-white/30">{loadProgress}%</div>

          {/* Subtle text below */}
          <div className="mt-6 font-mono text-[10px] text-white/15 uppercase tracking-widest">
            Vireon · Building Renderer
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">Error</div>
            <div className="text-gray-400 text-sm max-w-md">{error}</div>
          </div>
        </div>
      )}

      {/* No model placeholder */}
      {!modelUrl && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-gray-500">
            <div className="text-5xl mb-4 opacity-50">
              <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                <path d="M9 10h1M14 10h1M9 14h1M14 14h1" />
              </svg>
            </div>
            <div className="text-sm font-mono text-[#e8e8f0]/50">Select a building to preview</div>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && !loading && !error && modelUrl && (
        <>
          {/* View mode controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            <div className="bg-[#12121a]/80 backdrop-blur-sm border border-[#2a2a3e] rounded-lg p-1 flex gap-1">
              {(["wireframe", "solid", "xray"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono uppercase transition-colors rounded",
                    viewMode === mode
                      ? "bg-[#6c63ff] text-white"
                      : "text-[#9898b0] hover:text-[#e8e8f0] hover:bg-[#1a1a2e]"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Camera controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={cn(
                "p-2 rounded-lg border transition-colors",
                autoRotate
                  ? "bg-[#6c63ff]/20 border-[#6c63ff] text-[#6c63ff]"
                  : "bg-[#12121a]/80 border-[#2a2a3e] text-[#9898b0] hover:text-[#e8e8f0]"
              )}
              title="Toggle Auto-Rotate"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={resetCamera}
              className="p-2 rounded-lg bg-[#12121a]/80 border border-[#2a2a3e] text-[#9898b0] hover:text-[#e8e8f0] transition-colors"
              title="Reset Camera"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </div>

          {/* Info panel */}
          <div className="absolute bottom-4 left-4 bg-[#12121a]/80 backdrop-blur-sm border border-[#2a2a3e] rounded-lg p-3 z-20">
            <div className="text-[10px] font-mono text-[#9898b0] space-y-1">
              <div className="text-[#e8e8f0]/80 mb-2 text-xs">Controls</div>
              <div>Left Click + Drag: Rotate</div>
              <div>Right Click + Drag: Pan</div>
              <div>Scroll: Zoom</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
