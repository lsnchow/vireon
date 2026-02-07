"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Eye, Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURATED_MODELS } from "@/data/curated-models";

interface SearchResult {
  uid: string;
  name: string;
  thumbnailUrl: string;
  author: string;
  viewCount: number;
  likeCount: number;
  isDownloadable: boolean;
}

interface ModelSearchProps {
  onSelectModel: (uid: string, downloadUrl: string, name?: string) => void;
  className?: string;
}

export default function ModelSearch({ onSelectModel, className }: ModelSearchProps) {
  const [models, setModels] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load curated models on mount by fetching details for each UID
  useEffect(() => {
    async function loadCuratedModels() {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          CURATED_MODELS.map(async (model) => {
            try {
              const res = await fetch(`/api/sketchfab/details?uid=${model.uid}`);
              if (res.ok) {
                const data = await res.json();
                return { ...data, uid: model.uid, name: data.name || model.name };
              }
              return {
                uid: model.uid,
                name: model.name,
                thumbnailUrl: "",
                author: "Sketchfab",
                viewCount: 0,
                likeCount: 0,
                isDownloadable: true,
              };
            } catch {
              return {
                uid: model.uid,
                name: model.name,
                thumbnailUrl: "",
                author: "Sketchfab",
                viewCount: 0,
                likeCount: 0,
                isDownloadable: true,
              };
            }
          })
        );

        setModels(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setLoading(false);
      }
    }

    loadCuratedModels();
  }, []);

  const handleSelectModel = async (model: SearchResult) => {
    if (!model.isDownloadable) {
      setError("This model is not downloadable");
      return;
    }

    setLoadingModel(model.uid);
    setError(null);

    try {
      const res = await fetch(`/api/sketchfab/download?uid=${model.uid}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get download URL");
      }

      onSelectModel(model.uid, data.downloadUrl, model.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model");
    } finally {
      setLoadingModel(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center text-gray-500 py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-500" />
            <p className="text-sm">Loading building library...</p>
          </div>
        )}

        {!loading && models.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No models available</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {models.map((model) => (
            <ModelCard
              key={model.uid}
              model={model}
              loading={loadingModel === model.uid}
              onSelect={() => handleSelectModel(model)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ModelCardProps {
  model: SearchResult;
  loading: boolean;
  onSelect: () => void;
}

function ModelCard({ model, loading, onSelect }: ModelCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={loading || !model.isDownloadable}
      className={cn(
        "flex gap-3 p-3 bg-white/5 border border-white/10 rounded-lg text-left transition-all hover:border-green-500/50 hover:bg-white/10 group",
        loading && "opacity-50 cursor-wait",
        !model.isDownloadable && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 bg-black/50 rounded-md overflow-hidden flex-shrink-0 relative">
        {model.thumbnailUrl ? (
          <Image
            src={model.thumbnailUrl}
            alt={model.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
            &#x1f3e2;
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white text-sm font-medium truncate group-hover:text-green-400 transition-colors">
          {model.name}
        </h3>
        <p className="text-gray-500 text-xs truncate mt-0.5">by {model.author}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(model.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatNumber(model.likeCount)}
          </span>
          {model.isDownloadable && (
            <span className="flex items-center gap-1 text-green-500">
              <Download className="w-3 h-3" />
              Available
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
