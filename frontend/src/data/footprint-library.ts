import type { FootprintShape } from '@/types/map';

const FOOTPRINTS_URL = '/data/footprints/footprints.json';

let cache: FootprintShape[] | null = null;
let loading: Promise<FootprintShape[]> | null = null;

/**
 * Fetch and cache the footprint shape library.
 * Safe to call multiple times — only one fetch occurs.
 */
export async function loadFootprintLibrary(): Promise<FootprintShape[]> {
  if (cache) return cache;

  if (!loading) {
    loading = fetch(FOOTPRINTS_URL)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load footprints: ${res.status}`);
        const data = (await res.json()) as FootprintShape[];
        cache = data;
        return data;
      })
      .catch((err) => {
        console.warn('Footprint library load failed:', err);
        cache = [];
        return [];
      });
  }

  return loading;
}

/** Get a shape by ID (returns undefined if library not loaded or ID not found). */
export function getFootprintById(id: string): FootprintShape | undefined {
  return cache?.find((fp) => fp.id === id);
}

/** Get all loaded footprint shapes (returns empty array if not yet loaded). */
export function getFootprintShapes(): FootprintShape[] {
  return cache ?? [];
}

/** Get a random footprint shape (returns undefined if library not loaded). */
export function getRandomFootprint(): FootprintShape | undefined {
  if (!cache || cache.length === 0) return undefined;
  return cache[Math.floor(Math.random() * cache.length)];
}
