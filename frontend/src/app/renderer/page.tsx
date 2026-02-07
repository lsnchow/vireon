"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Heart,
  Download,
  ArrowUpDown,
  Minus,
  Plus,
} from "lucide-react";
import { BUILDINGS, TYPE_BADGES } from "@/data/buildings";
import type { BuildingTemplate } from "@/types/map";
import { cn } from "@/lib/utils";

const ModelViewer = dynamic(
  () => import("@/components/renderer/ModelViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#6c63ff] font-mono text-sm animate-pulse">
          Initializing 3D Engine...
        </div>
      </div>
    ),
  }
);

/* ── Sketchfab thumbnail cache ── */
interface ThumbnailInfo {
  thumbnailUrl: string;
  author: string;
  viewCount: number;
  likeCount: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function RendererPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingTemplate | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [heightOverride, setHeightOverride] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, ThumbnailInfo>>({});
  const [thumbnailsLoading, setThumbnailsLoading] = useState(true);

  /* Load Sketchfab thumbnails for all buildings on mount */
  useEffect(() => {
    async function loadThumbnails() {
      setThumbnailsLoading(true);
      const results: Record<string, ThumbnailInfo> = {};

      await Promise.all(
        BUILDINGS.filter((b) => b.sketchfabUid).map(async (b) => {
          try {
            const res = await fetch(`/api/sketchfab/details?uid=${b.sketchfabUid}`);
            if (res.ok) {
              const data = await res.json();
              results[b.id] = {
                thumbnailUrl: data.thumbnailUrl || "",
                author: data.author || "Sketchfab",
                viewCount: data.viewCount || 0,
                likeCount: data.likeCount || 0,
              };
            }
          } catch {
            /* ok */
          }
        })
      );

      setThumbnails(results);
      setThumbnailsLoading(false);
    }

    loadThumbnails();
  }, []);

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
    <div className="h-screen w-screen bg-[#0a0a0f] text-[#e8e8f0] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-[#2a2a3e] flex items-center justify-between px-4 bg-[#12121a]/80 backdrop-blur-md z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#1a1a2e] rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-[#9898b0]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[#9898b0]" />
            )}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 border border-[#2a2a3e] rounded flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[#6c63ff]"
              >
                <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                <path d="M9 10h1M14 10h1M9 14h1M14 14h1" />
              </svg>
            </div>
            <span className="font-semibold text-lg tracking-tight">CivicLens</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9898b0] font-mono hidden sm:block">
            Building Renderer
          </span>
          {selectedBuilding && (
            <button
              onClick={handleUseInSimulation}
              className="flex items-center gap-2 rounded-lg bg-[#6c63ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5a52e0]"
            >
              Use in Simulation
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — building catalog */}
        <aside
          className={cn(
            "border-r border-[#2a2a3e] bg-[#12121a]/95 flex-shrink-0 transition-all duration-300 overflow-hidden",
            sidebarOpen ? "w-80" : "w-0"
          )}
        >
          <div className="w-80 h-full flex flex-col">
            <div className="p-4 border-b border-[#2a2a3e]">
              <h2 className="text-sm font-semibold text-[#e8e8f0] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#6c63ff] rounded-full" />
                Building Catalog
              </h2>
              <p className="text-[10px] text-[#9898b0] mt-1">
                Select a building to preview in 3D, then use it in the simulation
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {thumbnailsLoading && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-[#6c63ff]" />
                  <p className="text-xs text-[#9898b0]">Loading catalog...</p>
                </div>
              )}

              {!thumbnailsLoading &&
                BUILDINGS.map((building) => {
                  const thumb = thumbnails[building.id];
                  const badge = TYPE_BADGES[building.type] ?? TYPE_BADGES.commercial;
                  const isSelected = selectedBuilding?.id === building.id;
                  const isLoading = loadingModel === building.id;

                  return (
                    <button
                      key={building.id}
                      onClick={() => handleSelectBuilding(building)}
                      disabled={isLoading}
                      className={cn(
                        "flex gap-3 w-full p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-[#6c63ff]/60 bg-[#6c63ff]/10"
                          : "border-[#2a2a3e] bg-[#1a1a2e] hover:border-[#6c63ff]/30 hover:bg-[#22223a]",
                        isLoading && "opacity-60 cursor-wait"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-[#0a0a0f] rounded-md overflow-hidden flex-shrink-0 relative">
                        {thumb?.thumbnailUrl ? (
                          <Image
                            src={thumb.thumbnailUrl}
                            alt={building.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#9898b0]/30">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                            </svg>
                          </div>
                        )}
                        {isLoading && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-[#6c63ff]" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-[#e8e8f0] truncate">
                          {building.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[9px] text-[#9898b0]">
                            {building.floors}F &middot; {building.defaultHeight}m
                          </span>
                        </div>
                        {building.description && (
                          <p className="text-[9px] text-[#9898b0] mt-1 line-clamp-2 leading-tight">
                            {building.description}
                          </p>
                        )}
                        {thumb && (
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-[#9898b0]/70">
                            <span className="flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              {formatNumber(thumb.viewCount)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-2.5 h-2.5" />
                              {formatNumber(thumb.likeCount)}
                            </span>
                          </div>
                        )}
                      </div>
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
              backgroundColor={0x0a0a0f}
            />
          </div>

          {/* Bottom bar */}
          {selectedBuilding && (
            <div className="h-16 border-t border-[#2a2a3e] bg-[#12121a]/95 backdrop-blur-md flex items-center px-4 gap-4 z-20">
              {/* Selected building name */}
              <div className="flex-shrink-0">
                <div className="text-xs font-medium text-[#e8e8f0]">
                  {selectedBuilding.name}
                </div>
                <div className="text-[10px] text-[#9898b0]">
                  {selectedBuilding.type} &middot; {selectedBuilding.floors} floors
                </div>
              </div>

              <div className="h-8 w-px bg-[#2a2a3e]" />

              {/* Height override */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#9898b0]" />
                <span className="text-[10px] text-[#9898b0]">Height:</span>
                <button
                  onClick={() =>
                    setHeightOverride(Math.max(3, (heightOverride ?? selectedBuilding.defaultHeight) - 3))
                  }
                  className="rounded bg-[#1a1a2e] p-1 text-[#9898b0] hover:bg-[#22223a] hover:text-[#e8e8f0]"
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
                  className="rounded bg-[#1a1a2e] p-1 text-[#9898b0] hover:bg-[#22223a] hover:text-[#e8e8f0]"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="w-10 text-right text-xs font-mono text-[#e8e8f0]">
                  {heightOverride ?? selectedBuilding.defaultHeight}m
                </span>
              </div>

              <div className="flex-1" />

              {/* CTA */}
              <button
                onClick={handleUseInSimulation}
                className="flex items-center gap-2 rounded-lg bg-[#6c63ff] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#5a52e0] shadow-lg shadow-[#6c63ff]/20"
              >
                Use in Simulation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
