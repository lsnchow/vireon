"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Download, Eye, Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onSelectModel: (uid: string, downloadUrl: string) => void;
  className?: string;
}

export default function ModelSearch({ onSelectModel, className }: ModelSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sketchfab/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

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

      onSelectModel(model.uid, data.downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model");
    } finally {
      setLoadingModel(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Search form */}
      <form onSubmit={handleSearch} className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 3D models..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-green-500 text-black text-xs font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-400 transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Search for 3D models on Sketchfab</p>
            <p className="text-xs mt-1 text-gray-600">Try &quot;car&quot;, &quot;robot&quot;, or &quot;character&quot;</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {results.map((model) => (
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
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            📦
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
