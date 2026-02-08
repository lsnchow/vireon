'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { PickingInfo } from '@deck.gl/core';
import { useCivicLens } from '@/hooks/useCivicLens';
import { useSimulation } from '@/hooks/useSimulation';
import MapView from '@/components/map/MapView';
import PlacementToolbar from '@/components/map/PlacementToolbar';
// import ScenarioBar from '@/components/map/ScenarioBar';
import ImpactScorecard from '@/components/map/ImpactScorecard';
import HoverTooltip from '@/components/map/HoverTooltip';
import SimulatePanel from '@/components/map/SimulatePanel';
import AgentReactionCards from '@/components/map/AgentReactionCards';
import { KINGSTON_CENTER } from '@/types/map';
import type { ImpactResult, RenderableBuilding } from '@/types/map';
import { getBuildingById, getEffectiveFootprint } from '@/data/buildings';
import { getTransformedFootprint } from '@/lib/geo';
import { loadFootprintLibrary, getFootprintById } from '@/data/footprint-library';
import {
  computeAllImpacts,
  suggestMitigation,
  type CityLayers,
  type BuildingInput,
} from '@/lib/impact-engine';
import type { FeatureCollection } from '@/lib/geo-analysis';

interface CivicLensAppProps {
  /** Building ID selected in the renderer (passed via URL) */
  initialBuildingId?: string;
  /** Optional height override from the renderer */
  heightOverride?: number;
}

export default function CivicLensApp({
  initialBuildingId,
  heightOverride,
}: CivicLensAppProps = {}) {
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
    setImpacts,
    setMitigation,
    applyMitigation,
  } = useCivicLens();

  /* ── Simulation (agent reactions) ── */
  const sim = useSimulation();
  const [showAgentCards, setShowAgentCards] = useState(false);

  // Auto-show agent cards when simulation completes
  useEffect(() => {
    if (sim.phase === 'complete' && sim.result) {
      setShowAgentCards(true);
    }
  }, [sim.phase, sim.result]);

  const initialPlacedRef = useRef(false);

  /* ── Auto-place the initial building from renderer ── */
  useEffect(() => {
    if (!initialBuildingId || initialPlacedRef.current) return;

    const template = getBuildingById(initialBuildingId);
    if (!template) return;

    initialPlacedRef.current = true;
    addBuilding(initialBuildingId, KINGSTON_CENTER);
  }, [initialBuildingId, addBuilding]);

  /* ── Apply height override once the building is placed ── */
  const heightAppliedRef = useRef(false);
  useEffect(() => {
    if (!initialBuildingId || !heightOverride || heightAppliedRef.current) return;
    const placed = state.placedBuildings.find(
      (b) => b.templateId === initialBuildingId
    );
    if (placed) {
      heightAppliedRef.current = true;
      const template = getBuildingById(initialBuildingId);
      if (template && heightOverride !== template.defaultHeight) {
        updateBuilding(placed.id, { height: heightOverride });
      }
    }
  }, [initialBuildingId, heightOverride, state.placedBuildings, updateBuilding]);

  /* ── Preload footprint shape library ── */
  const [footprintsReady, setFootprintsReady] = useState(false);
  useEffect(() => {
    loadFootprintLibrary().then(() => setFootprintsReady(true));
  }, []);

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

      const footprint = getEffectiveFootprint(template, getFootprintById);
      const polygon = getTransformedFootprint(
        footprint,
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
  }, [state.placedBuildings, layers, footprintsReady, setImpacts]);

  /* ── Mitigate action ── */
  const handleMitigate = useCallback(() => {
    if (!selectedBuilding) return;
    const template = getBuildingById(selectedBuilding.templateId);
    if (!template) return;

    const footprint = getEffectiveFootprint(template, getFootprintById);
    const polygon = getTransformedFootprint(
      footprint,
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

    const result = suggestMitigation(input, currentImpact, layersRef.current, footprint, selectedBuilding.rotation);
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

  /* ── Selected building impact ── */
  const selectedImpact = selectedBuilding
    ? state.impacts[selectedBuilding.id] ?? null
    : null;

  const selectedTemplateName = selectedBuilding
    ? getBuildingById(selectedBuilding.templateId)?.name ?? 'Building'
    : '';

  /* ── Simulation trigger ── */
  const handleSimulate = useCallback(() => {
    if (!selectedBuilding || !selectedImpact) return;
    sim.simulate(selectedBuilding, selectedImpact);
  }, [selectedBuilding, selectedImpact, sim]);

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

  return (
    <div className="relative h-screen w-screen overflow-hidden font-mono">
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

      {/* Overlay toggles (top-right) */}
      <div className="fixed right-4 top-4 z-50">
        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[rgba(6,13,24,0.85)] p-1.5 shadow-lg backdrop-blur-xl">
          {([
            { key: 'parks' as const, label: 'Parks', color: 'bg-green-600/30 text-green-300 border-green-500/50', icon: '🌳' },
            { key: 'waterways' as const, label: 'Water', color: 'bg-blue-600/30 text-blue-300 border-blue-500/50', icon: '💧' },
            { key: 'residential' as const, label: 'Residential', color: 'bg-red-600/20 text-red-300 border-red-500/50', icon: '🏠' },
            { key: 'corridors' as const, label: 'Roads', color: 'bg-orange-600/20 text-orange-300 border-orange-500/50', icon: '🛣' },
          ]).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => toggleOverlay(key)}
              className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                state.overlays[key]
                  ? color
                  : 'border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Impact scorecard (right side, shown after simulation completes) */}
      {selectedBuilding && sim.phase === 'complete' && (
        <ImpactScorecard
          impact={selectedImpact}
          mitigation={state.mitigation}
          buildingName={selectedTemplateName}
          aggregateResult={sim.result?.aggregate ?? null}
        />
      )}

      {/* Placement toolbar (bottom-center, shown when a building is selected) */}
      {selectedBuilding && (
        <PlacementToolbar
          building={selectedBuilding}
          onUpdate={(updates) => updateBuilding(selectedBuilding.id, updates)}
          onMitigate={handleMitigate}
        />
      )}

      {/* Simulate panel (model selector + progress bar) */}
      {selectedBuilding && selectedImpact && (
        <SimulatePanel
          phase={sim.phase}
          selectedModel={sim.selectedModel}
          onModelChange={sim.setSelectedModel}
          models={sim.models}
          status={sim.status}
          error={sim.error}
          onSimulate={handleSimulate}
          onReset={sim.reset}
          disabled={!selectedImpact}
        />
      )}

      {/* Agent reaction cards (shown after simulation) */}
      {showAgentCards && sim.result && (
        <AgentReactionCards
          agents={sim.result.agents}
          aggregate={sim.result.aggregate}
          onClose={() => setShowAgentCards(false)}
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

      {/* Back to Catalog link */}
      <a
        href="/renderer"
        className="fixed top-3 left-3 z-40 flex items-center gap-1.5 rounded-lg bg-[rgba(6,13,24,0.85)] border border-white/[0.06] px-3 py-2 text-[10px] font-mono text-white/40 hover:text-white hover:border-white/10 backdrop-blur-xl transition-all uppercase tracking-wider"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Catalog
      </a>

      {/* Branding watermark */}
      <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="w-5 h-5 opacity-20" />
        <span className="text-[9px] font-mono font-medium text-white/20 uppercase tracking-widest">
          Vireon · Kingston
        </span>
      </div>
    </div>
  );
}
