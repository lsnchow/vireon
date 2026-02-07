'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { PolygonLayer, GeoJsonLayer } from '@deck.gl/layers';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import type { MapViewState, PickingInfo } from '@deck.gl/core';

import { getTransformedFootprint } from '@/lib/geo';
import { getBuildingById, BUILDINGS } from '@/data/buildings';
import type { PlacedBuilding, RenderableBuilding, OverlayToggles } from '@/types';
import { KINGSTON_VIEW_STATE, MAP_STYLE } from '@/types';

/* ── Kingston overlay GeoJSON (P1 — inline simplified) ── */
const PARKS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Breakwater Park' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-76.4745, 44.228], [-76.472, 44.228],
          [-76.472, 44.2305], [-76.4745, 44.2305], [-76.4745, 44.228],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'City Park' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-76.478, 44.226], [-76.4745, 44.226],
          [-76.4745, 44.229], [-76.478, 44.229], [-76.478, 44.226],
        ]],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Lake Ontario Park' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-76.494, 44.218], [-76.489, 44.218],
          [-76.489, 44.222], [-76.494, 44.222], [-76.494, 44.218],
        ]],
      },
    },
  ],
};

const SENSITIVE_ZONES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Heritage Conservation District' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [-76.484, 44.228], [-76.477, 44.228],
          [-76.477, 44.233], [-76.484, 44.233], [-76.484, 44.228],
        ]],
      },
    },
  ],
};

const CORRIDORS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Princess St. Corridor' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-76.5, 44.2315], [-76.49, 44.231], [-76.48, 44.2305], [-76.47, 44.23],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Ontario St. Corridor' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-76.481, 44.238], [-76.481, 44.23], [-76.481, 44.224],
        ],
      },
    },
  ],
};

/* ── Lighting ── */
const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.0 });
const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 2.0,
  position: [-76.48, 44.23, 8000],
});
const lightingEffect = new LightingEffect({ ambientLight, pointLight });

const MATERIAL = { ambient: 0.2, diffuse: 0.7, shininess: 32, specularColor: [60, 64, 70] as [number, number, number] };
const SELECTED_COLOR: [number, number, number] = [120, 180, 255];
const WIREFRAME_COLOR: [number, number, number, number] = [255, 255, 255, 90];

/* ── Component ── */
interface MapViewProps {
  placedBuildings: PlacedBuilding[];
  selectedId: string | null;
  overlays: OverlayToggles;
  onSelect: (id: string | null) => void;
  onUpdateBuilding: (id: string, updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>>) => void;
}

export default function MapView({
  placedBuildings,
  selectedId,
  overlays,
  onSelect,
  onUpdateBuilding,
}: MapViewProps) {
  const [viewState, setViewState] = useState<MapViewState>(KINGSTON_VIEW_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [glReady, setGlReady] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  /* Build renderable polygons */
  const renderData: RenderableBuilding[] = useMemo(() => {
    return placedBuildings.map((pb) => {
      const template = getBuildingById(pb.templateId);
      if (!template) return null;
      return {
        id: pb.id,
        templateId: pb.templateId,
        polygon: getTransformedFootprint(template.footprintMeters, pb.center, pb.rotation),
        height: pb.height,
        color: pb.id === selectedId ? SELECTED_COLOR : template.color,
        isSelected: pb.id === selectedId,
      };
    }).filter(Boolean) as RenderableBuilding[];
  }, [placedBuildings, selectedId]);

  /* ── Layers ── */
  const layers = useMemo(() => {
    const result: any[] = [];

    // Overlay: Parks
    if (overlays.parks) {
      result.push(
        new GeoJsonLayer({
          id: 'parks-overlay',
          data: PARKS_GEOJSON as any,
          filled: true,
          stroked: true,
          getFillColor: [46, 213, 115, 60],
          getLineColor: [46, 213, 115, 180],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
        })
      );
    }

    // Overlay: Sensitive zones
    if (overlays.sensitiveZones) {
      result.push(
        new GeoJsonLayer({
          id: 'sensitive-overlay',
          data: SENSITIVE_ZONES_GEOJSON as any,
          filled: true,
          stroked: true,
          getFillColor: [255, 71, 87, 40],
          getLineColor: [255, 71, 87, 160],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
        })
      );
    }

    // Overlay: Corridors
    if (overlays.corridors) {
      result.push(
        new GeoJsonLayer({
          id: 'corridors-overlay',
          data: CORRIDORS_GEOJSON as any,
          filled: false,
          stroked: true,
          getLineColor: [255, 165, 2, 200],
          getLineWidth: 6,
          lineWidthMinPixels: 2,
        })
      );
    }

    // Placed buildings
    result.push(
      new PolygonLayer<RenderableBuilding>({
        id: 'placed-buildings',
        data: renderData,
        pickable: true,
        extruded: true,
        wireframe: true,
        opacity: 0.8,
        getPolygon: (d) => d.polygon,
        getElevation: (d) => d.height,
        getFillColor: (d) => d.color as [number, number, number],
        getLineColor: WIREFRAME_COLOR,
        material: MATERIAL,
        updateTriggers: {
          getFillColor: [selectedId],
          getPolygon: [placedBuildings],
          getElevation: [placedBuildings],
        },
      })
    );

    return result;
  }, [renderData, selectedId, placedBuildings, overlays]);

  /* ── Interaction handlers ── */
  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (info.layer?.id === 'placed-buildings' && info.object) {
        onSelect((info.object as RenderableBuilding).id);
      } else {
        onSelect(null);
      }
    },
    [onSelect]
  );

  const handleDragStart = useCallback(
    (info: PickingInfo) => {
      if (info.layer?.id === 'placed-buildings' && info.object) {
        const obj = info.object as RenderableBuilding;
        dragIdRef.current = obj.id;
        setIsDragging(true);
        onSelect(obj.id);
      }
    },
    [onSelect]
  );

  const handleDrag = useCallback(
    (info: PickingInfo) => {
      if (dragIdRef.current && info.coordinate) {
        onUpdateBuilding(dragIdRef.current, {
          center: [info.coordinate[0], info.coordinate[1]],
        });
      }
    },
    [onUpdateBuilding]
  );

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setIsDragging(false);
  }, []);

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => {
        if (!isDragging) setViewState(vs as MapViewState);
      }}
      layers={glReady ? layers : []}
      effects={glReady ? [lightingEffect] : []}
      controller={{
        dragPan: !isDragging,
        dragRotate: !isDragging,
      }}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onWebGLInitialized={() => setGlReady(true)}
      getCursor={({ isDragging: d }) => (d ? 'grabbing' : 'grab')}
      style={{ position: 'absolute', inset: '0' }}
    >
      <Map reuseMaps mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
