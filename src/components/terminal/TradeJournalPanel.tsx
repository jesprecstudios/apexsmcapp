"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit3,
  Tag,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface JournalEntry {
  id: string;
  symbol: string;
  direction: "buy" | "sell";
  entry: number;
  sl: number;
  tp: number;
  notes: string;
  tags: string[];
  outcome: "win" | "loss" | "open";
  pnl: number;
  createdAt: string;
}

const STORAGE_KEY = "apexsmc_trade_journal";

function loadJournal(): JournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJournal(entries: JournalEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

interface TradeJournalPanelProps {
  symbol: string;
}

export default function TradeJournalPanel({ symbol }: TradeJournalPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol,
    direction: "buy" as "buy" | "sell",
    entry: "",
    sl: "",
    tp: "",
    notes: "",
    tags: "",
    outcome: "open" as "win" | "loss" | "open",
  });

  useEffect(() => {
    setEntries(loadJournal());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryPrice = parseFloat(formData.entry) || 0;
    const slPrice = parseFloat(formData.sl) || 0;
    const tpPrice = parseFloat(formData.tp) || 0;

    let pnl = 0;
    if (formData.outcome === "win") {
      pnl = Math.abs(tpPrice - entryPrice);
    } else if (formData.outcome === "loss") {
      pnl = -Math.abs(slPrice - entryPrice);
    }

    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}`,
      symbol: formData.symbol || symbol,
      direction: formData.direction,
      entry: entryPrice,
      sl: slPrice,
      tp: tpPrice,
      notes: formData.notes,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      outcome: formData.outcome,
      pnl,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    saveJournal(updated);
    setShowForm(false);
    setFormData({
      symbol,
      direction: "buy",
      entry: "",
      sl: "",
      tp: "",
      notes: "",
      tags: "",
      outcome: "open",
    });
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveJournal(updated);
  };

  // Stats
  const wins = entries.filter((e) => e.outcome === "win").length;
  const losses = entries.filter((e) => e.outcome === "loss").length;
  const total = entries.length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-headline font-bold text-sm text-on-surface">Trade Journal</h2>
            <p className="text-[10px] text-on-surface-variant font-body">
              {total} entries · {winRate}% win rate
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary transition-colors cursor-pointer"
          title="Log New Trade"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary Stats */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-surface-container border border-outline text-center">
            <div className="font-mono text-sm font-bold text-bullish">{wins}</div>
            <div className="text-[9px] text-on-surface-variant font-body">Wins</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container border border-outline text-center">
            <div className="font-mono text-sm font-bold text-bearish">{losses}</div>
            <div className="text-[9px] text-on-surface-variant font-body">Losses</div>
          </div>
          <div className="p-2.5 rounded-lg bg-surface-container border border-outline text-center">
            <div className="font-mono text-sm font-bold text-primary">{winRate}%</div>
            <div className="text-[9px] text-on-surface-variant font-body">Win Rate</div>
          </div>
        </div>
      )}

      {/* New Trade Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg bg-surface-container border border-primary/30 space-y-3 animate-in fade-in duration-200"
        >
          <h4 className="font-headline font-bold text-xs text-on-surface">Log New Trade</h4>

          {/* Symbol + Direction */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="bg-surface border border-outline rounded-lg px-3 py-1.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: "buy" })}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer ${
                  formData.direction === "buy"
                    ? "bg-bullish/20 text-bullish border border-bullish/40"
                    : "bg-surface border border-outline text-on-surface-variant"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>BUY</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, direction: "sell" })}
                className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer ${
                  formData.direction === "sell"
                    ? "bg-bearish/20 text-bearish border border-bearish/40"
                    : "bg-surface border border-outline text-on-surface-variant"
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>SELL</span>
              </button>
            </div>
          </div>

          {/* Entry / SL / TP */}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              step="any"
              placeholder="Entry"
              value={formData.entry}
              onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
              className="bg-surface border border-outline rounded-lg px-2 py-1.5 text-xs text-on-surface font-mono outline-none focus:border-primary"
            />
            <input
              type="number"
              step="any"
              placeholder="SL"
              value={formData.sl}
              onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
              className="bg-surface border border-outline rounded-lg px-2 py-1.5 text-xs text-on-surface font-mono outline-none focus:border-bearish"
            />
            <input
              type="number"
              step="any"
              placeholder="TP"
              value={formData.tp}
              onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
              className="bg-surface border border-outline rounded-lg px-2 py-1.5 text-xs text-on-surface font-mono outline-none focus:border-bullish"
            />
          </div>

          {/* Outcome */}
          <div className="grid grid-cols-3 gap-1">
            {(["open", "win", "loss"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setFormData({ ...formData, outcome: o })}
                className={`py-1 rounded text-[10px] font-bold uppercase border transition-colors cursor-pointer ${
                  formData.outcome === o
                    ? o === "win"
                      ? "bg-bullish/20 text-bullish border-bullish/40"
                      : o === "loss"
                        ? "bg-bearish/20 text-bearish border-bearish/40"
                        : "bg-primary/20 text-primary border-primary/40"
                    : "bg-surface border-outline text-on-surface-variant"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          {/* Notes + Tags */}
          <textarea
            placeholder="Notes (e.g., strong demand zone retest)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-surface font-body outline-none focus:border-primary resize-none"
          />
          <input
            type="text"
            placeholder="Tags (comma separated: smc, ob, fvg)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="w-full bg-surface border border-outline rounded-lg px-3 py-1.5 text-xs text-on-surface font-body outline-none focus:border-primary"
          />

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-headline font-bold text-xs uppercase cursor-pointer transition-colors"
          >
            Save Trade Entry
          </button>
        </form>
      )}

      {/* Journal Entries */}
      <div className="space-y-2">
        {entries.length === 0 && !showForm ? (
          <div className="text-center py-8 text-xs text-on-surface-variant font-body space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-on-surface-variant/30" />
            <p>Your trade journal is empty.</p>
            <p className="text-[10px]">Click <span className="text-primary font-semibold">+</span> to log your first trade.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg bg-surface-container border border-outline/70 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {entry.direction === "buy" ? (
                    <TrendingUp className="w-3.5 h-3.5 text-bullish" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-bearish" />
                  )}
                  <span className="font-headline font-bold text-on-surface">{entry.symbol}</span>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      entry.outcome === "win"
                        ? "bg-bullish/15 text-bullish"
                        : entry.outcome === "loss"
                          ? "bg-bearish/15 text-bearish"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    {entry.outcome.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 text-on-surface-variant hover:text-bearish transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex space-x-4 font-mono text-[10px] text-on-surface-variant">
                <span>Entry: <span className="text-on-surface">{entry.entry.toFixed(4)}</span></span>
                <span>SL: <span className="text-bearish">{entry.sl.toFixed(4)}</span></span>
                <span>TP: <span className="text-bullish">{entry.tp.toFixed(4)}</span></span>
              </div>

              {entry.notes && (
                <p className="text-[10px] text-on-surface-variant italic">{entry.notes}</p>
              )}

              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-mono bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded border border-outline flex items-center space-x-0.5"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              <span className="text-[9px] text-on-surface-variant/60 font-mono block">
                {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
