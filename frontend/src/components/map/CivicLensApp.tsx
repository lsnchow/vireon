'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import { useCivicLens } from '@/hooks/useCivicLens';
import MapView from '@/components/map/MapView';
import BuildingLibrary from '@/components/map/BuildingLibrary';
import PlacementToolbar from '@/components/map/PlacementToolbar';
import ScenarioBar from '@/components/map/ScenarioBar';
import ImpactScorecard from '@/components/map/ImpactScorecard';
import HoverTooltip from '@/components/map/HoverTooltip';
import { KINGSTON_CENTER } from '@/types/map';
import type { ImpactResult, RenderableBuilding } from '@/types/map';
import { getBuildingById } from '@/data/buildings';
import { getTransformedFootprint } from '@/lib/geo';
import {
  computeAllImpacts,
  suggestMitigation,
  type CityLayers,
  type BuildingInput,
} from '@/lib/impact-engine';
import type { FeatureCollection } from '@/lib/geo-analysis';

export default function CivicLensApp() {
  const {
    state,
    selectedBuilding,
    addBuilding,
    selectBuilding,
    updateBuilding,
    deleteBuilding,
    loadScenario,
    clearAll,
    toggleOverlay,
    toggleSidebar,
    setImpacts,
    setMitigation,
    applyMitigation,
  } = useCivicLens();

  /* ── GeoJSON layers (shared between MapView and impact engine) ── */
  const [layers, setLayers] = useState<CityLayers>({
    parks: null,
    waterways: null,
    roads: null,
    residential: null,
  });

  useEffect(() => {
    const load = async (path: string): Promise<FeatureCollection | null> => {
      try {
        const res = await fetch(path);
        if (res.ok) return (await res.json()) as FeatureCollection;
      } catch {
        /* layer file missing — ok */
      }
      return null;
    };

    Promise.all([
      load('/data/layers/parks.geojson'),
      load('/data/layers/waterways.geojson'),
      load('/data/layers/roads_major.geojson'),
      load('/data/layers/residential.geojson'),
    ]).then(([parks, waterways, roads, residential]) => {
      setLayers({ parks, waterways, roads, residential });
    });
  }, []);

  /* ── Compute impacts whenever buildings change ── */
  const layersRef = useRef(layers);
  layersRef.current = layers;

  useEffect(() => {
    if (state.placedBuildings.length === 0) {
      setImpacts({});
      return;
    }

    const currentLayers = layersRef.current;
    const newImpacts: Record<string, ImpactResult> = {};

    for (const pb of state.placedBuildings) {
      const template = getBuildingById(pb.templateId);
      if (!template) continue;

      const polygon = getTransformedFootprint(
        template.footprintMeters,
        pb.center,
        pb.rotation
      );

      const input: BuildingInput = {
        id: pb.id,
        polygon,
        height: pb.height,
        costEstimate: template.costEstimate,
        type: template.type,
        description: template.description,
      };

      newImpacts[pb.id] = computeAllImpacts(input, currentLayers);
    }

    setImpacts(newImpacts);
  }, [state.placedBuildings, layers, setImpacts]);

  /* ── Add building at Kingston centre ── */
  const handleAddBuilding = useCallback(
    (templateId: string) => {
      addBuilding(templateId, KINGSTON_CENTER);
    },
    [addBuilding]
  );

  /* ── Mitigate action ── */
  const handleMitigate = useCallback(() => {
    if (!selectedBuilding) return;
    const template = getBuildingById(selectedBuilding.templateId);
    if (!template) return;

    const polygon = getTransformedFootprint(
      template.footprintMeters,
      selectedBuilding.center,
      selectedBuilding.rotation
    );

    const input: BuildingInput = {
      id: selectedBuilding.id,
      polygon,
      height: selectedBuilding.height,
      costEstimate: template.costEstimate,
      type: template.type,
    };

    const currentImpact = state.impacts[selectedBuilding.id];
    if (!currentImpact) return;

    const result = suggestMitigation(input, currentImpact, layersRef.current);
    if (result) {
      setMitigation(result);
      // Apply the mitigation
      applyMitigation(
        selectedBuilding.id,
        result.newCenter,
        result.newHeight
      );
    }
  }, [selectedBuilding, state.impacts, setMitigation, applyMitigation]);

  /* ── Hover state ── */
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    buildingName?: string;
    impact?: ImpactResult | null;
    featureName?: string;
  } | null>(null);

  const handleHover = useCallback(
    (info: PickingInfo | null) => {
      if (!info || !info.object) {
        setHoverInfo(null);
        return;
      }

      const { x, y, layer, object } = info;

      if (layer?.id === 'placed-buildings') {
        const rb = object as RenderableBuilding;
        const template = getBuildingById(rb.templateId);
        setHoverInfo({
          x,
          y,
          buildingName: template?.name ?? 'Building',
          impact: state.impacts[rb.id] ?? null,
        });
      } else if (layer?.id?.includes('-overlay')) {
        const props = (object as any)?.properties;
        setHoverInfo({
          x,
          y,
          featureName: props?.name ?? '',
        });
      } else {
        setHoverInfo(null);
      }
    },
    [state.impacts]
  );

  /* ── Selected building impact ── */
  const selectedImpact = selectedBuilding
    ? state.impacts[selectedBuilding.id] ?? null
    : null;

  const selectedTemplateName = selectedBuilding
    ? getBuildingById(selectedBuilding.templateId)?.name ?? 'Building'
    : '';

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map layer */}
      <MapView
        placedBuildings={state.placedBuildings}
        selectedId={state.selectedId}
        overlays={state.overlays}
        onSelect={selectBuilding}
        onUpdateBuilding={updateBuilding}
        onHover={handleHover}
        cityLayers={layers}
      />

      {/* Building Library sidebar */}
      <BuildingLibrary
        isOpen={state.sidebarOpen}
        onToggle={toggleSidebar}
        onAddBuilding={handleAddBuilding}
        placedCount={state.placedBuildings.length}
      />

      {/* Scenario & overlay controls (top-right) */}
      <ScenarioBar
        activeScenarioId={state.activeScenarioId}
        overlays={state.overlays}
        onLoadScenario={loadScenario}
        onClearAll={clearAll}
        onToggleOverlay={toggleOverlay}
      />

      {/* Impact scorecard (right side, shown when a building is selected) */}
      {selectedBuilding && (
        <ImpactScorecard
          impact={selectedImpact}
          mitigation={state.mitigation}
          buildingName={selectedTemplateName}
        />
      )}

      {/* Placement toolbar (bottom-center, shown when a building is selected) */}
      {selectedBuilding && (
        <PlacementToolbar
          building={selectedBuilding}
          onUpdate={(updates) => updateBuilding(selectedBuilding.id, updates)}
          onDelete={() => deleteBuilding(selectedBuilding.id)}
          onDeselect={() => selectBuilding(null)}
          onMitigate={handleMitigate}
          impactScore={selectedImpact?.overallAcceptance}
        />
      )}

      {/* Hover tooltip */}
      {hoverInfo && (
        <HoverTooltip
          x={hoverInfo.x}
          y={hoverInfo.y}
          buildingName={hoverInfo.buildingName}
          impact={hoverInfo.impact}
          featureName={hoverInfo.featureName}
        />
      )}

      {/* Branding watermark */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-30 text-[10px] font-medium text-[#9898b0]/50">
        CivicLens · Kingston
      </div>
    </div>
  );
}
