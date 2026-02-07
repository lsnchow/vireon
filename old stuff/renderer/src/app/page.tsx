"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Menu, X, Github, Layers } from "lucide-react";
import ModelSearch from "@/components/ModelSearch";
import { cn } from "@/lib/utils";

// Dynamic import for Three.js components (no SSR)
const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="text-green-500 font-mono text-sm animate-pulse">
        Initializing 3D Engine...
      </div>
    </div>
  ),
});

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  const handleModelSelect = (uid: string, downloadUrl: string) => {
    setCurrentModelId(uid);
    setCurrentModelUrl(downloadUrl);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/50 backdrop-blur-md z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
              <Layers className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">ModelForge</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono hidden sm:block">
            3D Model Viewer
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-80 border-r border-white/10 bg-black/30 flex-shrink-0 transition-all duration-300 overflow-hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0"
          )}
        >
          <div className="w-80 h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-sm font-bold text-white/80 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Model Search
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Search Sketchfab for downloadable 3D models
              </p>
            </div>
            <ModelSearch
              onSelectModel={handleModelSelect}
              className="flex-1 overflow-hidden"
            />
          </div>
        </aside>

        {/* Viewer */}
        <main className="flex-1 relative">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          {/* Model viewer */}
          <ModelViewer
            modelUrl={currentModelUrl || undefined}
            className="w-full h-full"
            initialViewMode="wireframe"
            showControls={true}
            showGrid={true}
            wireframeColor={0x00ff00}
          />

          {/* Decorative corner elements */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-green-500/30 pointer-events-none z-20" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-green-500/30 pointer-events-none z-20" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-green-500/30 pointer-events-none z-20" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-green-500/30 pointer-events-none z-20" />

          {/* Status bar */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/50 border-t border-white/10 flex items-center px-4 z-20">
            <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
              <span className="flex items-center gap-1">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  currentModelUrl ? "bg-green-500" : "bg-gray-600"
                )} />
                {currentModelUrl ? "Model Loaded" : "No Model"}
              </span>
              {currentModelId && (
                <span className="text-gray-600">ID: {currentModelId.slice(0, 8)}...</span>
              )}
              <span className="ml-auto">Powered by Sketchfab</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
