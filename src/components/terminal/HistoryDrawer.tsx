"use client";

import { useState, useEffect } from "react";
import { History, Filter, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { AnalysisResult } from "@/lib/ai/types";

interface SavedAnalysisRecord {
  id: string;
  symbol: string;
  timeframe: string;
  strategy: string;
  bias: string;
  confluence_score: number;
  result: AnalysisResult;
  created_at: string;
  snapshots?: {
    storage_path: string;
    visible_range?: Record<string, unknown>;
  };
}

interface HistoryDrawerProps {
  onSelectAnalysis?: (analysis: AnalysisResult, snapshotUrl?: string) => void;
  refreshTrigger?: number;
}

export default function HistoryDrawer({
  onSelectAnalysis,
  refreshTrigger = 0,
}: HistoryDrawerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [historyItems, setHistoryItems] = useState<SavedAnalysisRecord[]>([]);
  const [biasFilter, setBiasFilter] = useState<string>("ALL");
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const res = await fetch("/api/v1/analysis?limit=10");
        if (!isCancelled && res.ok) {
          const data = await res.json();
          if (data.analyses && Array.isArray(data.analyses)) {
            setHistoryItems(data.analyses);
          }
        }
      } catch (err) {
        console.warn("Could not load analysis history:", err);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/analysis/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.warn("Failed to delete analysis:", err);
    }
  };

  const filteredItems = historyItems.filter((item) => {
    if (biasFilter === "ALL") return true;
    return item.bias.toUpperCase() === biasFilter;
  });

  const displayItems = filteredItems.length > 0 ? filteredItems : [];

  if (collapsed) {
    return (
      <footer className="h-8 bg-surface-container border-t border-outline-variant flex items-center justify-between px-4 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <History className="w-3.5 h-3.5 text-on-surface-variant" />
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            History ({historyItems.length})
          </span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="text-on-surface-variant hover:text-on-surface p-1 flex items-center space-x-1 text-xs"
        >
          <span>Expand</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </footer>
    );
  }

  return (
    <footer className="h-28 bg-surface-container border-t border-outline-variant flex flex-col shrink-0 select-none">
      {/* Drawer Header */}
      <div className="px-4 py-1.5 bg-surface border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            History
          </span>
          <span className="font-mono text-[10px] bg-surface-container-highest px-1.5 py-0.2 rounded text-on-surface-variant">
            {historyItems.length}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-on-surface-variant relative">
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="hover:text-on-surface flex items-center space-x-1 px-1.5 py-0.5 rounded border border-outline/60 text-[11px]"
            >
              <Filter className="w-3 h-3" />
              <span>{biasFilter}</span>
            </button>
            {filterOpen && (
              <div className="absolute right-0 bottom-full mb-1 bg-surface border border-outline rounded shadow-xl py-1 z-50 text-[11px] w-28">
                {["ALL", "BULLISH", "BEARISH", "NEUTRAL"].map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBiasFilter(b);
                      setFilterOpen(false);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-surface-high transition-colors"
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed(true)}
            className="hover:text-on-surface p-1"
            title="Collapse"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable History Cards */}
      <div className="flex-1 px-3 py-2 flex items-center space-x-3 overflow-x-auto custom-scrollbar">
        {displayItems.length === 0 ? (
          <div className="text-xs text-on-surface-variant/70 italic px-2">
            No saved analyses yet. Click Analyze Chart to save an analysis here.
          </div>
        ) : (
          displayItems.map((item) => {
            const isBull = item.bias.toUpperCase() === "BULLISH";
            const isBear = item.bias.toUpperCase() === "BEARISH";
            const dateStr = new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnalysis && onSelectAnalysis(item.result, item.snapshots?.storage_path)}
                className="bg-surface rounded p-2 min-w-[260px] max-w-[280px] flex items-center justify-between shrink-0 transition-all border border-outline hover:border-primary/50 cursor-pointer group"
              >
                <div className="truncate pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-headline font-bold text-xs text-on-surface">
                      {item.symbol} {item.timeframe}
                    </span>
                    <span
                      className={`font-mono text-[9px] px-1 rounded border ${
                        isBull
                          ? "bg-primary/10 text-primary border-primary/30"
                          : isBear
                          ? "bg-bearish/10 text-bearish border-bearish/30"
                          : "bg-surface-high text-on-surface-variant border-outline"
                      }`}
                    >
                      {item.strategy}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-on-surface-variant mt-0.5">
                    {dateStr} · {item.result?.summary ? item.result.summary.slice(0, 32) + "..." : "Saved setup"}
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <span
                    className={`font-mono text-xs font-bold block ${
                      isBull ? "text-primary" : isBear ? "text-bearish" : "text-on-surface-variant"
                    }`}
                  >
                    {item.confluence_score}%
                  </span>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className="font-body text-[9px] text-on-surface-variant uppercase">
                      {item.bias}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-bearish text-on-surface-variant p-0.5 transition-opacity"
                      title="Delete record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </footer>
  );
}
