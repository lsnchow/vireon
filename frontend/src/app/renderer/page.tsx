"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  Minus,
  Plus,
} from "lucide-react";
import { BUILDINGS } from "@/data/buildings";
import type { BuildingTemplate } from "@/types/map";
import { cn } from "@/lib/utils";

const ModelViewer = dynamic(
  () => import("@/components/renderer/ModelViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#060d18]">
        <div className="text-white/40 font-mono text-sm animate-pulse">
          Initializing 3D Engine...
        </div>
      </div>
    ),
  }
);

export default function RendererPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingTemplate | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [heightOverride, setHeightOverride] = useState<number | null>(null);

  /* Load 3D model for selected building */
  const handleSelectBuilding = useCallback(
    async (building: BuildingTemplate) => {
      setSelectedBuilding(building);
      setHeightOverride(building.defaultHeight);

      if (!building.sketchfabUid) {
        setModelUrl(null);
        return;
      }

      setLoadingModel(building.id);
      try {
        const res = await fetch(`/api/sketchfab/download?uid=${building.sketchfabUid}`);
        const data = await res.json();
        if (res.ok && data.downloadUrl) {
          setModelUrl(data.downloadUrl);
        } else {
          setModelUrl(null);
        }
      } catch {
        setModelUrl(null);
      } finally {
        setLoadingModel(null);
      }
    },
    []
  );

  /* Navigate to simulation with selected building */
  const handleUseInSimulation = useCallback(() => {
    if (!selectedBuilding) return;
    const params = new URLSearchParams({ building: selectedBuilding.id });
    if (heightOverride && heightOverride !== selectedBuilding.defaultHeight) {
      params.set("h", String(heightOverride));
    }
    router.push(`/sim?${params.toString()}`);
  }, [selectedBuilding, heightOverride, router]);

  return (
    <div className="h-screen w-screen bg-[#060d18] text-white flex flex-col overflow-hidden font-mono">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[rgba(6,13,24,0.85)] backdrop-blur-xl z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-white/40" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/40" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vireon" className="w-7 h-7" />
            <span className="text-sm text-white uppercase tracking-widest">Vireon</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 uppercase tracking-widest hidden sm:block">
            Building Renderer
          </span>
          {selectedBuilding && (
            <button
              onClick={handleUseInSimulation}
              className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/[0.06] px-4 py-2 text-xs text-white transition-colors hover:bg-white/[0.15] uppercase tracking-wider"
            >
              Use in Simulation
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — building catalog */}
        <aside
          className={cn(
            "border-r border-white/[0.06] bg-[rgba(6,13,24,0.95)] flex-shrink-0 transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-80" : "w-0"
          )}
        >
          <div className="w-80 h-full flex flex-col">
            <div className="p-4 border-b border-white/[0.06]">
              <h2 className="text-xs font-medium text-white uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                Catalog
              </h2>
              <p className="text-[10px] text-white/30 mt-1">
                Select a building to preview in 3D
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {BUILDINGS.map((building) => {
                const isSelected = selectedBuilding?.id === building.id;
                const isLoading = loadingModel === building.id;

                return (
                  <button
                    key={building.id}
                    onClick={() => handleSelectBuilding(building)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
                      isLoading && "opacity-60 cursor-wait"
                    )}
                  >
                    {isLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-white truncate">
                      {building.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 3D Viewer */}
        <main className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <ModelViewer
              modelUrl={modelUrl || undefined}
              className="w-full h-full"
              initialViewMode="solid"
              showControls={true}
              showGrid={true}
              wireframeColor={0x6c63ff}
              backgroundColor={0x060d18}
            />
          </div>

          {/* Bottom bar */}
          {selectedBuilding && (
            <div className="h-16 border-t border-white/[0.06] bg-[rgba(6,13,24,0.9)] backdrop-blur-xl flex items-center px-4 gap-4 z-20">
              {/* Selected building name */}
              <div className="flex-shrink-0">
                <div className="text-xs font-medium text-white">
                  {selectedBuilding.name}
                </div>
                <div className="text-[10px] text-white/30">
                  {selectedBuilding.type} &middot; {selectedBuilding.floors} floors
                </div>
              </div>

              <div className="h-8 w-px bg-white/[0.06]" />

              {/* Height override */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-white/30" />
                <span className="text-[10px] text-white/30">Height:</span>
                <button
                  onClick={() =>
                    setHeightOverride(Math.max(3, (heightOverride ?? selectedBuilding.defaultHeight) - 3))
                  }
                  className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="range"
                  min={3}
                  max={120}
                  step={1}
                  value={heightOverride ?? selectedBuilding.defaultHeight}
                  onChange={(e) => setHeightOverride(Number(e.target.value))}
                  className="w-24"
                />
                <button
                  onClick={() =>
                    setHeightOverride(Math.min(120, (heightOverride ?? selectedBuilding.defaultHeight) + 3))
                  }
                  className="rounded bg-white/[0.04] p-1 text-white/40 hover:bg-white/[0.08] hover:text-white"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="w-10 text-right text-xs text-white">
                  {heightOverride ?? selectedBuilding.defaultHeight}m
                </span>
              </div>

              <div className="flex-1" />

              {/* CTA */}
              <button
                onClick={handleUseInSimulation}
                className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/[0.06] px-5 py-2 text-xs text-white transition-colors hover:bg-white/[0.15] uppercase tracking-wider"
              >
                Use in Simulation
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
