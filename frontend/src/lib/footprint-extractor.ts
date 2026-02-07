/**
 * Footprint Extraction Pipeline
 * 
 * Converts a 3D GLTF/GLB model (Three.js Group) into a 2D polygon footprint
 * suitable for deck.gl's PolygonLayer.
 * 
 * Steps:
 * 1. Traverse all meshes, collect world-space vertex positions
 * 2. Project all vertices onto the XZ plane (ground plane)
 * 3. Compute the convex hull of the 2D point cloud
 * 4. Get bounding box height from Y dimension
 * 5. Center the polygon around origin (meter offsets from center)
 * 6. Return { footprintMeters, height }
 */

import * as THREE from 'three';

export interface BuildingFootprint {
  /** Polygon vertices as [x_meters, y_meters] offsets from center */
  footprintMeters: [number, number][];
  /** Building height in meters (Y dimension) */
  height: number;
  /** Original bounding box dimensions */
  dimensions: { width: number; depth: number; height: number };
}

/**
 * Extract a 2D footprint polygon from a Three.js scene/group.
 * The model should be in its original scale (not normalized).
 */
export function extractFootprint(
  scene: THREE.Group,
  options?: {
    /** Scale factor to convert model units to meters. Default: 1 */
    scaleFactor?: number;
    /** Minimum number of hull points. Default: 4 */
    minPoints?: number;
    /** Maximum number of hull points for simplification. Default: 24 */
    maxPoints?: number;
  }
): BuildingFootprint {
  const scaleFactor = options?.scaleFactor ?? 1;
  const maxPoints = options?.maxPoints ?? 24;

  // Step 1: Collect all world-space vertices
  const points2D: [number, number][] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  scene.updateMatrixWorld(true);

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.geometry) return;

    const geometry = child.geometry;
    const positionAttr = geometry.getAttribute('position');
    if (!positionAttr) return;

    const vertex = new THREE.Vector3();

    // Sample vertices (skip some for very dense meshes)
    const step = positionAttr.count > 10000 ? Math.ceil(positionAttr.count / 5000) : 1;

    for (let i = 0; i < positionAttr.count; i += step) {
      vertex.fromBufferAttribute(positionAttr, i);
      // Transform to world space
      child.localToWorld(vertex);

      // Track Y bounds for height
      if (vertex.y < minY) minY = vertex.y;
      if (vertex.y > maxY) maxY = vertex.y;

      // Step 2: Project onto XZ plane (x, z become our 2D coordinates)
      points2D.push([vertex.x * scaleFactor, vertex.z * scaleFactor]);
    }
  });

  if (points2D.length < 3) {
    // Fallback: return a small square
    return {
      footprintMeters: [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ],
      height: 10,
      dimensions: { width: 10, depth: 10, height: 10 },
    };
  }

  // Step 3: Compute convex hull
  let hull = convexHull(points2D);

  // Step 4: Calculate height
  const height = Math.max(1, (maxY - minY) * scaleFactor);

  // Step 5: Center the polygon around origin
  let cx = 0;
  let cy = 0;
  for (const [x, y] of hull) {
    cx += x;
    cy += y;
  }
  cx /= hull.length;
  cy /= hull.length;

  hull = hull.map(([x, y]) => [x - cx, y - cy] as [number, number]);

  // Simplify if too many points
  if (hull.length > maxPoints) {
    hull = simplifyPolygon(hull, maxPoints);
  }

  // Calculate dimensions
  const xs = hull.map((p) => p[0]);
  const ys = hull.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...ys) - Math.min(...ys);

  return {
    footprintMeters: hull,
    height,
    dimensions: { width, depth, height },
  };
}

/**
 * Extract footprint from a model that has been normalized (scaled to fit a certain size).
 * We need to account for the normalization to get real-world-ish dimensions.
 */
export function extractFootprintFromNormalizedModel(
  scene: THREE.Group,
  options?: {
    /** Assumed real-world height in meters for the building. Default: auto from aspect ratio */
    assumedHeight?: number;
  }
): BuildingFootprint {
  // First extract with scale=1 to get proportions
  const raw = extractFootprint(scene, { scaleFactor: 1 });

  // If no assumed height, use proportions to guess a reasonable height
  // Most buildings are 10-50m tall. Use the aspect ratio to estimate.
  const rawMaxDim = Math.max(raw.dimensions.width, raw.dimensions.depth, raw.dimensions.height);
  const assumedHeight = options?.assumedHeight ?? Math.max(10, raw.dimensions.height / rawMaxDim * 30);

  // Scale everything proportionally so height matches the assumed height
  const scale = assumedHeight / raw.dimensions.height;

  return {
    footprintMeters: raw.footprintMeters.map(([x, y]) => [x * scale, y * scale] as [number, number]),
    height: assumedHeight,
    dimensions: {
      width: raw.dimensions.width * scale,
      depth: raw.dimensions.depth * scale,
      height: assumedHeight,
    },
  };
}

/**
 * Compute the convex hull of a set of 2D points using Andrew's monotone chain algorithm.
 * Returns points in counter-clockwise order.
 */
function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const n = pts.length;

  if (n <= 2) return pts;

  // Build lower hull
  const lower: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) {
      lower.pop();
    }
    lower.push(pts[i]);
  }

  // Build upper hull
  const upper: [number, number][] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) {
      upper.pop();
    }
    upper.push(pts[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

/**
 * Cross product of vectors OA and OB where O is origin point.
 * Positive = counter-clockwise, negative = clockwise, 0 = collinear.
 */
function cross(O: [number, number], A: [number, number], B: [number, number]): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

/**
 * Simplify a polygon to have at most `maxPoints` vertices.
 * Uses a simple method: keep the vertices with the largest angles (most important).
 */
function simplifyPolygon(
  polygon: [number, number][],
  maxPoints: number
): [number, number][] {
  if (polygon.length <= maxPoints) return polygon;

  // Calculate the importance of each vertex (angle deviation from straight line)
  const importance: { index: number; value: number }[] = polygon.map((_, i) => {
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    // Calculate angle at this vertex
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];

    const crossProduct = Math.abs(dx1 * dy2 - dy1 * dx2);
    return { index: i, value: crossProduct };
  });

  // Sort by importance (keep the most important ones)
  importance.sort((a, b) => b.value - a.value);

  // Keep the top maxPoints indices
  const keepIndices = new Set(
    importance.slice(0, maxPoints).map((item) => item.index)
  );

  // Return vertices in original order
  return polygon.filter((_, i) => keepIndices.has(i));
}
