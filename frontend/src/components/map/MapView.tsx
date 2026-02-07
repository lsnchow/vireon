'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { PolygonLayer, GeoJsonLayer } from '@deck.gl/layers';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import type { MapViewState, PickingInfo } from '@deck.gl/core';

import { getTransformedFootprint } from '@/lib/geo';
import { getBuildingById } from '@/data/buildings';
import type { PlacedBuilding, RenderableBuilding, OverlayToggles } from '@/types/map';
import { KINGSTON_VIEW_STATE, MAP_STYLE } from '@/types/map';
import type { FeatureCollection } from '@/lib/geo-analysis';

/* ── Lighting ── */
const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.0 });
const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 2.0,
  position: [-76.48, 44.23, 8000],
});
const lightingEffect = new LightingEffect({ ambientLight, pointLight });

const MATERIAL = {
  ambient: 0.2,
  diffuse: 0.7,
  shininess: 32,
  specularColor: [60, 64, 70] as [number, number, number],
};
const SELECTED_COLOR: [number, number, number] = [120, 180, 255];
const WIREFRAME_COLOR: [number, number, number, number] = [255, 255, 255, 90];

/* ── Component ── */
interface MapViewProps {
  placedBuildings: PlacedBuilding[];
  selectedId: string | null;
  overlays: OverlayToggles;
  onSelect: (id: string | null) => void;
  onUpdateBuilding: (
    id: string,
    updates: Partial<Pick<PlacedBuilding, 'center' | 'rotation' | 'height'>>
  ) => void;
  onHover?: (info: PickingInfo | null) => void;
  /** Pre-loaded GeoJSON layers (from CivicLensApp) */
  cityLayers?: {
    parks: FeatureCollection | null;
    waterways: FeatureCollection | null;
    roads: FeatureCollection | null;
    residential: FeatureCollection | null;
  };
}

export default function MapView({
  placedBuildings,
  selectedId,
  overlays,
  onSelect,
  onUpdateBuilding,
  onHover,
  cityLayers,
}: MapViewProps) {
  const [viewState, setViewState] = useState<MapViewState>(KINGSTON_VIEW_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const [glReady, setGlReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  /* ── GeoJSON layer data — use props if provided, else load locally ── */
  const [localParks, setLocalParks] = useState<FeatureCollection | null>(null);
  const [localWaterways, setLocalWaterways] = useState<FeatureCollection | null>(null);
  const [localRoads, setLocalRoads] = useState<FeatureCollection | null>(null);
  const [localResidential, setLocalResidential] = useState<FeatureCollection | null>(null);

  const parksGeo = cityLayers?.parks ?? localParks;
  const waterwaysGeo = cityLayers?.waterways ?? localWaterways;
  const roadsGeo = cityLayers?.roads ?? localRoads;
  const residentialGeo = cityLayers?.residential ?? localResidential;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cityLayers) return; // layers provided by parent
    const load = async (path: string) => {
      try {
        const res = await fetch(path);
        if (res.ok) return (await res.json()) as FeatureCollection;
      } catch {
        /* ok */
      }
      return null;
    };
    load('/data/layers/parks.geojson').then(setLocalParks);
    load('/data/layers/waterways.geojson').then(setLocalWaterways);
    load('/data/layers/roads_major.geojson').then(setLocalRoads);
    load('/data/layers/residential.geojson').then(setLocalResidential);
  }, [cityLayers]);

  /* Build renderable polygons */
  const renderData: RenderableBuilding[] = useMemo(() => {
    return placedBuildings
      .map((pb) => {
        const template = getBuildingById(pb.templateId);
        if (!template) return null;
        return {
          id: pb.id,
          templateId: pb.templateId,
          polygon: getTransformedFootprint(
            template.footprintMeters,
            pb.center,
            pb.rotation
          ),
          height: pb.height,
          color: pb.id === selectedId ? SELECTED_COLOR : template.color,
          isSelected: pb.id === selectedId,
        };
      })
      .filter(Boolean) as RenderableBuilding[];
  }, [placedBuildings, selectedId]);

  /* ── Layers ── */
  const layers = useMemo(() => {
    const result: any[] = [];

    if (overlays.parks && parksGeo) {
      result.push(
        new GeoJsonLayer({
          id: 'parks-overlay',
          data: parksGeo as any,
          filled: true,
          stroked: true,
          getFillColor: [46, 213, 115, 60],
          getLineColor: [46, 213, 115, 180],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
        })
      );
    }

    if (overlays.waterways && waterwaysGeo) {
      result.push(
        new GeoJsonLayer({
          id: 'waterways-overlay',
          data: waterwaysGeo as any,
          filled: true,
          stroked: true,
          getFillColor: [30, 144, 255, 50],
          getLineColor: [30, 144, 255, 180],
          getLineWidth: 3,
          lineWidthMinPixels: 1,
          pickable: true,
        })
      );
    }

    if (overlays.residential && residentialGeo) {
      result.push(
        new GeoJsonLayer({
          id: 'residential-overlay',
          data: residentialGeo as any,
          filled: true,
          stroked: true,
          getFillColor: [255, 71, 87, 30],
          getLineColor: [255, 71, 87, 120],
          getLineWidth: 2,
          lineWidthMinPixels: 1,
          pickable: true,
        })
      );
    }

    if (overlays.corridors && roadsGeo) {
      result.push(
        new GeoJsonLayer({
          id: 'corridors-overlay',
          data: roadsGeo as any,
          filled: false,
          stroked: true,
          getLineColor: [255, 165, 2, 200],
          getLineWidth: 6,
          lineWidthMinPixels: 2,
          pickable: true,
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
  }, [
    renderData,
    selectedId,
    placedBuildings,
    overlays,
    parksGeo,
    waterwaysGeo,
    roadsGeo,
    residentialGeo,
  ]);

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

  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (onHover) {
        onHover(info.object ? info : null);
      }
    },
    [onHover]
  );

  /* Suppress known luma.gl ResizeObserver init error */
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message?.includes('maxTextureDimension2D')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return true;
      }
    };
    window.addEventListener('error', handler, true);
    return () => window.removeEventListener('error', handler, true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ position: 'absolute', inset: '0', background: '#0a0a0f' }}
      />
    );
  }

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
      onHover={handleHover}
      onWebGLInitialized={() => setGlReady(true)}
      getCursor={({ isDragging: d }) => (d ? 'grabbing' : 'grab')}
      style={{ position: 'absolute', inset: '0' }}
    >
      <Map reuseMaps mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
