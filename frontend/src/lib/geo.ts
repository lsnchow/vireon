/**
 * Geodesic utilities for converting metre-offset footprints
 * into real lat/lng polygons with translation & rotation.
 *
 * No external dependencies — just trig.
 */

const DEG_TO_RAD = Math.PI / 180;
const METRES_PER_DEG_LAT = 111_320;

/**
 * Convert a metre offset from a centre point into [lng, lat].
 */
function metersToLngLat(
  offsetMeters: [number, number],
  center: [number, number]
): [number, number] {
  const [mx, my] = offsetMeters;
  const [cLng, cLat] = center;
  const cosLat = Math.cos(cLat * DEG_TO_RAD);
  const dLng = mx / (METRES_PER_DEG_LAT * cosLat);
  const dLat = my / METRES_PER_DEG_LAT;
  return [cLng + dLng, cLat + dLat];
}

/**
 * Rotate a 2D point around a centre by `angleDeg` (clockwise = positive).
 */
function rotatePoint(
  point: [number, number],
  center: [number, number],
  angleDeg: number
): [number, number] {
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point[0] - center[0];
  const dy = point[1] - center[1];
  return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos];
}

/**
 * Produce a lat/lng polygon from metre-offset footprint,
 * translated to `center` and rotated by `rotation` degrees.
 */
export function getTransformedFootprint(
  footprintMeters: [number, number][],
  center: [number, number],
  rotation: number
): [number, number][] {
  const lngLatPoints = footprintMeters.map((m) => metersToLngLat(m, center));
  if (rotation === 0) return lngLatPoints;
  return lngLatPoints.map((p) => rotatePoint(p, center, rotation));
}

/**
 * Generate a unique id for a placed building instance.
 */
export function uid(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 9)
  );
}
