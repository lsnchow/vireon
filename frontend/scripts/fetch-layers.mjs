#!/usr/bin/env node
/**
 * Fetch Kingston GeoJSON layers from Overpass Turbo and save to public/data/layers/
 * Run: node scripts/fetch-layers.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/data/layers');
mkdirSync(OUT_DIR, { recursive: true });

const BBOX = '44.21,-76.52,44.26,-76.45'; // Kingston bounding box

const QUERIES = {
  parks: `[out:json][timeout:30];
    (
      way["leisure"="park"](${BBOX});
      way["natural"="wood"](${BBOX});
      way["landuse"="recreation_ground"](${BBOX});
      relation["leisure"="park"](${BBOX});
    );
    out geom;`,

  waterways: `[out:json][timeout:30];
    (
      way["natural"="water"](${BBOX});
      way["waterway"="river"](${BBOX});
      way["waterway"="riverbank"](${BBOX});
      relation["natural"="water"](${BBOX});
    );
    out geom;`,

  roads_major: `[out:json][timeout:30];
    (
      way["highway"="primary"](${BBOX});
      way["highway"="secondary"](${BBOX});
      way["highway"="trunk"](${BBOX});
      way["highway"="tertiary"](${BBOX});
    );
    out geom;`,

  residential: `[out:json][timeout:30];
    (
      way["landuse"="residential"](${BBOX});
      relation["landuse"="residential"](${BBOX});
    );
    out geom;`,
};

function overpassToGeoJSON(data) {
  const features = [];

  for (const el of data.elements || []) {
    if (el.type === 'way' && el.geometry) {
      const coords = el.geometry.map((n) => [n.lon, n.lat]);
      const name = el.tags?.name || el.tags?.leisure || el.tags?.natural || el.tags?.landuse || el.tags?.highway || '';

      // Determine if polygon (closed way) or linestring
      const first = coords[0];
      const last = coords[coords.length - 1];
      const isClosed = first[0] === last[0] && first[1] === last[1];

      if (isClosed && coords.length >= 4) {
        features.push({
          type: 'Feature',
          properties: { name, ...el.tags },
          geometry: { type: 'Polygon', coordinates: [coords] },
        });
      } else {
        features.push({
          type: 'Feature',
          properties: { name, ...el.tags },
          geometry: { type: 'LineString', coordinates: coords },
        });
      }
    } else if (el.type === 'relation' && el.members) {
      // For relations, combine outer members into a MultiPolygon
      const name = el.tags?.name || '';
      const rings = [];

      for (const member of el.members) {
        if (member.type === 'way' && member.geometry && member.role !== 'inner') {
          const coords = member.geometry.map((n) => [n.lon, n.lat]);
          if (coords.length >= 4) {
            // Close the ring if not closed
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coords.push([...first]);
            }
            rings.push(coords);
          }
        }
      }

      if (rings.length === 1) {
        features.push({
          type: 'Feature',
          properties: { name, ...el.tags },
          geometry: { type: 'Polygon', coordinates: rings },
        });
      } else if (rings.length > 1) {
        features.push({
          type: 'Feature',
          properties: { name, ...el.tags },
          geometry: { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

async function fetchLayer(name, query) {
  console.log(`Fetching ${name}...`);
  const url = 'https://overpass-api.de/api/interpreter';
  const body = `data=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    console.error(`  Failed to fetch ${name}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const geojson = overpassToGeoJSON(data);
  console.log(`  ${name}: ${geojson.features.length} features`);
  return geojson;
}

async function main() {
  for (const [name, query] of Object.entries(QUERIES)) {
    const geojson = await fetchLayer(name, query);
    if (geojson) {
      const outPath = resolve(OUT_DIR, `${name}.geojson`);
      writeFileSync(outPath, JSON.stringify(geojson));
      console.log(`  Saved to ${outPath}`);
    }
    // Small delay to be polite to Overpass API
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('Done!');
}

main().catch(console.error);
