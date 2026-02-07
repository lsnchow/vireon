/**
 * Lightweight geo-spatial analysis utilities for the impact engine.
 * No external dependencies — pure math.
 *
 * All coordinates are [longitude, latitude] (GeoJSON standard).
 */

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

/* ─── Distance ─── */

/** Haversine distance between two [lng, lat] points, in metres. */
export function haversineDistance(
  a: [number, number],
  b: [number, number]
): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Distance from a point to the closest point on a line segment [a, b], in metres. */
export function pointToSegmentDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  // Project in a local Cartesian approximation
  const cosLat = Math.cos(p[1] * DEG_TO_RAD);
  const px = p[0] * cosLat;
  const py = p[1];
  const ax = a[0] * cosLat;
  const ay = a[1];
  const bx = b[0] * cosLat;
  const by = b[1];

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  }

  const cx = ax + t * dx;
  const cy = ay + t * dy;

  // Convert back to haversine for accurate distance
  return haversineDistance(p, [cx / cosLat, cy]);
}

/** Distance from a point to the nearest point on a LineString, in metres. */
export function pointToLineDistance(
  point: [number, number],
  lineCoords: number[][]
): number {
  let minD = Infinity;
  for (let i = 0; i < lineCoords.length - 1; i++) {
    const a = lineCoords[i] as [number, number];
    const b = lineCoords[i + 1] as [number, number];
    const d = pointToSegmentDistance(point, a, b);
    if (d < minD) minD = d;
  }
  return minD;
}

/** Distance from a point to the nearest edge of a polygon ring, in metres. */
export function pointToPolygonEdgeDistance(
  point: [number, number],
  ring: number[][]
): number {
  let minD = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i] as [number, number];
    const b = ring[i + 1] as [number, number];
    const d = pointToSegmentDistance(point, a, b);
    if (d < minD) minD = d;
  }
  return minD;
}

/** Check if a point is inside a polygon ring (ray-casting). */
export function pointInPolygon(
  point: [number, number],
  ring: number[][]
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/* ─── Polygon utilities ─── */

/** Compute area of a polygon ring in square metres (Shoelace on projected coords). */
export function polygonAreaM2(ring: number[][]): number {
  if (ring.length < 3) return 0;
  const cosLat = Math.cos((ring[0][1] as number) * DEG_TO_RAD);
  const METRES_PER_DEG_LAT = 111_320;

  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = (ring[i][0] as number) * cosLat * METRES_PER_DEG_LAT;
    const yi = (ring[i][1] as number) * METRES_PER_DEG_LAT;
    const xj = (ring[j][0] as number) * cosLat * METRES_PER_DEG_LAT;
    const yj = (ring[j][1] as number) * METRES_PER_DEG_LAT;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
}

/** Centroid of a polygon ring as [lng, lat]. */
export function polygonCentroid(ring: number[][]): [number, number] {
  let cLng = 0,
    cLat = 0;
  const n = ring.length;
  for (const [lng, lat] of ring) {
    cLng += lng;
    cLat += lat;
  }
  return [cLng / n, cLat / n];
}

/* ─── GeoJSON traversal ─── */

export type FeatureCollection = {
  type: 'FeatureCollection';
  features: Feature[];
};

export type Feature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: Geometry;
};

export type Geometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }
  | { type: 'Point'; coordinates: number[] }
  | { type: string; coordinates: any };

/**
 * Minimum distance (in metres) from a point to any feature in a FeatureCollection.
 * For polygons: returns 0 if the point is inside.
 * For lines: returns min perpendicular distance.
 */
export function minDistanceToFeatures(
  point: [number, number],
  fc: FeatureCollection
): number {
  let minD = Infinity;

  for (const feature of fc.features) {
    const d = distanceToGeometry(point, feature.geometry);
    if (d < minD) minD = d;
    if (minD === 0) return 0;
  }

  return minD;
}

function distanceToGeometry(
  point: [number, number],
  geom: Geometry
): number {
  switch (geom.type) {
    case 'Polygon': {
      const ring = geom.coordinates[0];
      if (pointInPolygon(point, ring)) return 0;
      return pointToPolygonEdgeDistance(point, ring);
    }
    case 'MultiPolygon': {
      let minD = Infinity;
      for (const poly of geom.coordinates) {
        const ring = poly[0];
        if (pointInPolygon(point, ring)) return 0;
        const d = pointToPolygonEdgeDistance(point, ring);
        if (d < minD) minD = d;
      }
      return minD;
    }
    case 'LineString':
      return pointToLineDistance(point, geom.coordinates);
    case 'MultiLineString': {
      let minD = Infinity;
      for (const line of geom.coordinates) {
        const d = pointToLineDistance(point, line);
        if (d < minD) minD = d;
      }
      return minD;
    }
    case 'Point':
      return haversineDistance(point, geom.coordinates as [number, number]);
    default:
      return Infinity;
  }
}

/**
 * Find the nearest feature centroid in a FeatureCollection.
 * Returns the centroid and distance.
 */
export function nearestFeatureCentroid(
  point: [number, number],
  fc: FeatureCollection
): { centroid: [number, number]; distance: number } | null {
  let best: { centroid: [number, number]; distance: number } | null = null;

  for (const feature of fc.features) {
    const c = geometryCentroid(feature.geometry);
    if (!c) continue;
    const d = haversineDistance(point, c);
    if (!best || d < best.distance) {
      best = { centroid: c, distance: d };
    }
  }

  return best;
}

function geometryCentroid(geom: Geometry): [number, number] | null {
  switch (geom.type) {
    case 'Polygon':
      return polygonCentroid(geom.coordinates[0]);
    case 'MultiPolygon':
      return polygonCentroid(geom.coordinates[0][0]);
    case 'LineString': {
      const mid = Math.floor(geom.coordinates.length / 2);
      return geom.coordinates[mid] as [number, number];
    }
    case 'Point':
      return geom.coordinates as [number, number];
    default:
      return null;
  }
}
