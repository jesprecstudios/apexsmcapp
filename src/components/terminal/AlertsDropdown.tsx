"use client";

import { useState } from "react";
import { Bell, Plus, Check, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface AlertItem {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: "above" | "below";
  createdAt: string;
}

interface AlertsDropdownProps {
  symbol: string;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertsDropdown({
  symbol,
  currentPrice,
  isOpen,
  onClose,
}: AlertsDropdownProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: "alert-1",
      symbol,
      targetPrice: parseFloat((currentPrice * 1.008).toFixed(2)),
      condition: "above",
      createdAt: "10m ago",
    },
    {
      id: "alert-2",
      symbol,
      targetPrice: parseFloat((currentPrice * 0.992).toFixed(2)),
      condition: "below",
      createdAt: "25m ago",
    },
  ]);
  const [newPrice, setNewPrice] = useState<string>(String(currentPrice));
  const [condition, setCondition] = useState<"above" | "below">("above");

  if (!isOpen) return null;

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(newPrice);
    if (!p) return;
    const newAlert: AlertItem = {
      id: `alert-${Date.now()}`,
      symbol,
      targetPrice: p,
      condition,
      createdAt: "Just now",
    };
    setAlerts([newAlert, ...alerts]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-outline rounded-xl shadow-2xl z-50 overflow-hidden font-body animate-in fade-in-50 zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-primary" />
          <span className="font-headline font-bold text-xs text-on-surface">Price Alerts</span>
          <span className="font-mono text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-surface text-xs font-mono"
        >
          Close
        </button>
      </div>

      {/* Add Alert Inline Form */}
      <form onSubmit={handleAddAlert} className="p-3 border-b border-outline/70 bg-surface-container/60 space-y-2">
        <div className="flex gap-2">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as "above" | "below")}
            className="bg-surface-container border border-outline rounded text-xs px-2 py-1 text-on-surface outline-none"
          >
            <option value="above">Price &ge;</option>
            <option value="below">Price &le;</option>
          </select>
          <input
            type="number"
            step="any"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="flex-1 bg-surface-container border border-outline focus:border-primary rounded text-xs px-2 py-1 font-mono text-on-surface outline-none"
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-on-primary rounded text-xs font-bold flex items-center cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Alerts List */}
      <div className="max-h-60 overflow-y-auto custom-scrollbar divide-y divide-outline/40">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-on-surface-variant">
            No active price alerts set
          </div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="p-3 flex items-center justify-between hover:bg-surface-container transition-colors">
              <div className="flex items-center space-x-2 text-xs">
                {a.condition === "above" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-bullish shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-bearish shrink-0" />
                )}
                <div>
                  <div className="font-mono font-bold text-on-surface">
                    {a.symbol} {a.condition === "above" ? "≥" : "≤"} {a.targetPrice}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">{a.createdAt}</span>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAlert(a.id)}
                className="p-1 text-on-surface-variant hover:text-bearish transition-colors cursor-pointer"
                title="Remove alert"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
