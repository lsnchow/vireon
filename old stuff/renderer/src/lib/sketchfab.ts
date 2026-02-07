/**
 * Sketchfab API Service
 * Handles authentication, search, and model downloading
 */

const SKETCHFAB_API_BASE = 'https://api.sketchfab.com/v3';

export interface SketchfabModel {
  uid: string;
  name: string;
  description: string;
  thumbnails: {
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  user: {
    username: string;
    displayName: string;
  };
  viewCount: number;
  likeCount: number;
  isDownloadable: boolean;
  license: {
    slug: string;
    label: string;
  };
}

export interface SketchfabSearchResult {
  results: SketchfabModel[];
  cursors: {
    next: string | null;
    previous: string | null;
  };
}

export interface SketchfabDownloadInfo {
  glb?: {
    url: string;
    size: number;
    expires: number;
  };
  gltf?: {
    url: string;
    size: number;
    expires: number;
  };
}

/**
 * Search for models on Sketchfab
 */
export async function searchModels(
  query: string,
  apiKey: string,
  options?: {
    downloadable?: boolean;
    animated?: boolean;
    staffpicked?: boolean;
    count?: number;
    cursor?: string;
  }
): Promise<SketchfabSearchResult> {
  const params = new URLSearchParams({
    q: query,
    type: 'models',
    downloadable: String(options?.downloadable ?? true),
    count: String(options?.count ?? 24),
  });

  if (options?.animated !== undefined) {
    params.append('animated', String(options.animated));
  }

  if (options?.staffpicked !== undefined) {
    params.append('staffpicked', String(options.staffpicked));
  }

  if (options?.cursor) {
    params.append('cursor', options.cursor);
  }

  const response = await fetch(`${SKETCHFAB_API_BASE}/search?${params}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Sketchfab search failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get model details by UID
 */
export async function getModelDetails(
  uid: string,
  apiKey: string
): Promise<SketchfabModel> {
  const response = await fetch(`${SKETCHFAB_API_BASE}/models/${uid}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get model details: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get download URL for a model
 */
export async function getDownloadUrl(
  uid: string,
  apiKey: string
): Promise<SketchfabDownloadInfo> {
  const response = await fetch(
    `${SKETCHFAB_API_BASE}/models/${uid}/download`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Model is not downloadable or you lack permissions');
    }
    throw new Error(`Failed to get download URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get thumbnail URL for a model
 */
export function getThumbnailUrl(
  model: SketchfabModel,
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  const sizeMap = {
    small: 200,
    medium: 400,
    large: 720,
  };

  const targetWidth = sizeMap[size];
  const images = model.thumbnails.images;

  // Find closest match
  const sorted = [...images].sort(
    (a, b) =>
      Math.abs(a.width - targetWidth) - Math.abs(b.width - targetWidth)
  );

  return sorted[0]?.url || '';
}
