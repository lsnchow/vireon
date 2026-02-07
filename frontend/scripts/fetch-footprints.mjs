#!/usr/bin/env node
/**
 * Fetch NYC building footprints from the deck.gl trips dataset,
 * filter for interesting (non-rectangular) shapes, convert to
 * centered meter-offset polygons, and save as a footprint shape library.
 *
 * Run: node scripts/fetch-footprints.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/data/footprints');
mkdirSync(OUT_DIR, { recursive: true });

const NYC_BUILDINGS_URL =
  'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/buildings.json';

const DEG_TO_RAD = Math.PI / 180;
const METRES_PER_DEG_LAT = 111_320;

/* ── Geometry helpers ────────────────────────────────────────── */

/** Compute the signed area of a polygon ring (in square metres). */
function ringAreaM2(ring) {
  const n = ring.length;
  if (n < 3) return 0;

  // Use the centroid lat for the cosine correction
  let sumLat = 0;
  for (const [, lat] of ring) sumLat += lat;
  const avgLat = sumLat / n;
  const cosLat = Math.cos(avgLat * DEG_TO_RAD);

  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0] * cosLat * METRES_PER_DEG_LAT;
    const yi = ring[i][1] * METRES_PER_DEG_LAT;
    const xj = ring[j][0] * cosLat * METRES_PER_DEG_LAT;
    const yj = ring[j][1] * METRES_PER_DEG_LAT;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
}

/** Compute the centroid of a ring. */
function centroid(ring) {
  let cLng = 0, cLat = 0;
  for (const [lng, lat] of ring) {
    cLng += lng;
    cLat += lat;
  }
  return [cLng / ring.length, cLat / ring.length];
}

/** Convert a [lng, lat] ring to centered [x_m, y_m] offsets. */
function toMeterOffsets(ring) {
  // Remove closing vertex if it duplicates the first
  let pts = ring;
  if (
    pts.length > 1 &&
    pts[0][0] === pts[pts.length - 1][0] &&
    pts[0][1] === pts[pts.length - 1][1]
  ) {
    pts = pts.slice(0, -1);
  }

  const [cLng, cLat] = centroid(pts);
  const cosLat = Math.cos(cLat * DEG_TO_RAD);

  const meters = pts.map(([lng, lat]) => [
    round2((lng - cLng) * METRES_PER_DEG_LAT * cosLat),
    round2((lat - cLat) * METRES_PER_DEG_LAT),
  ]);

  return meters;
}

/** Compute the area of a meter-offset ring using the shoelace formula. */
function meterRingArea(ring) {
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

/** Ramer-Douglas-Peucker line simplification. */
function simplifyRDP(points, tolerance) {
  if (points.length <= 2) return points;

  // Find the point furthest from the line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  const [x0, y0] = points[0];
  const [x1, y1] = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDist(points[i], [x0, y0], [x1, y1]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyRDP(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyRDP(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

function pointToLineDist([px, py], [x0, y0], [x1, y1]) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x0, py - y0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lenSq));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Measure how "non-rectangular" a shape is. Higher = more interesting. */
function complexityScore(meterRing) {
  const n = meterRing.length;
  if (n < 5) return 0;

  // Compute angles at each vertex — variance in angles = non-rectangular
  const angles = [];
  for (let i = 0; i < n; i++) {
    const prev = meterRing[(i - 1 + n) % n];
    const curr = meterRing[i];
    const next = meterRing[(i + 1) % n];
    const a = Math.atan2(next[1] - curr[1], next[0] - curr[0]) -
              Math.atan2(prev[1] - curr[1], prev[0] - curr[0]);
    angles.push(a);
  }

  const mean = angles.reduce((s, v) => s + v, 0) / n;
  const variance = angles.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  // Also reward more vertices
  return n * 0.5 + variance * 10;
}

/* ── Main ────────────────────────────────────────────────────── */

async function main() {
  console.log('Fetching deck.gl NYC buildings dataset...');
  const res = await fetch(NYC_BUILDINGS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const buildings = await res.json();
  console.log(`  Received ${buildings.length} buildings`);

  // Step 1: Filter and convert
  const candidates = [];

  for (let i = 0; i < buildings.length; i++) {
    const { polygon, height } = buildings[i];
    if (!polygon || polygon.length < 5) continue;

    const area = ringAreaM2(polygon);
    if (area < 200 || area > 5000) continue;

    let meters = toMeterOffsets(polygon);

    // Simplify rings with too many points
    if (meters.length > 40) {
      meters = simplifyRDP(meters, 0.5);
    }

    // Skip if simplification made it degenerate
    if (meters.length < 5) continue;

    const score = complexityScore(meters);
    const estArea = meterRingArea(meters);

    candidates.push({
      index: i,
      meters,
      height: height || 0,
      area: Math.round(estArea),
      score,
    });
  }

  console.log(`  ${candidates.length} candidates with 5+ vertices and 200–5000 m² area`);

  // Step 2: Sort by complexity and pick the top 30
  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, 30);

  console.log(`  Selected top ${selected.length} shapes by complexity`);

  // Step 3: Build the library
  const library = selected.map((c, idx) => {
    const id = `shape_nyc_${String(idx + 1).padStart(3, '0')}`;
    return {
      id,
      label: `NYC Shape ${idx + 1}`,
      footprintMeters: c.meters,
      source: {
        provider: 'deckgl_trips',
        source_index: c.index,
        originalHeight: c.height,
      },
      stats: {
        points: c.meters.length,
        areaM2Est: c.area,
      },
    };
  });

  // Step 4: Write output
  const outPath = resolve(OUT_DIR, 'footprints.json');
  writeFileSync(outPath, JSON.stringify(library, null, 2));
  console.log(`\nWrote ${library.length} footprints to ${outPath}`);

  // Print a summary
  console.log('\nLibrary summary:');
  for (const fp of library) {
    console.log(
      `  ${fp.id}: ${fp.stats.points} pts, ~${fp.stats.areaM2Est} m², height=${fp.source.originalHeight}m`
    );
  }
}

main().catch(console.error);
