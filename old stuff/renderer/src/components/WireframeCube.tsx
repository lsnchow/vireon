"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  initializeScene,
  createWireframeMaterial,
  createAnimationLoop,
  disposeObject,
} from "@/lib/three-utils";
import { cn } from "@/lib/utils";

interface WireframeCubeProps {
  className?: string;
  color?: number;
  rotationSpeed?: number;
  size?: number;
}

export default function WireframeCube({
  className,
  color = 0x00ff00,
  rotationSpeed = 0.01,
  size = 1,
}: WireframeCubeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const { scene, camera, renderer, cleanup } = initializeScene({
      container: mountRef.current,
      cameraType: "perspective",
      fov: 50,
      alpha: true,
      clearAlpha: 0,
    });

    camera.position.set(2, 1.5, 2);
    camera.lookAt(0, 0, 0);

    // Create wireframe cube
    const geometry = new THREE.BoxGeometry(size, size, size, 4, 4, 4);
    const material = createWireframeMaterial({ color, opacity: 0.8 });
    const cube = new THREE.Mesh(geometry, material);
    cubeRef.current = cube;
    scene.add(cube);

    // Add edges for sharper look
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    cube.add(edges);

    // Animation
    const { start, stop } = createAnimationLoop(renderer, scene, camera, () => {
      if (cubeRef.current) {
        cubeRef.current.rotation.x += rotationSpeed * 0.5;
        cubeRef.current.rotation.y += rotationSpeed;
      }
    });

    start();

    return () => {
      stop();
      if (cubeRef.current) {
        disposeObject(cubeRef.current);
      }
      cleanup();
    };
  }, [color, rotationSpeed, size]);

  return <div ref={mountRef} className={cn("w-full h-full", className)} />;
}
