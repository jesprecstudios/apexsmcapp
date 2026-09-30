"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock, AlertTriangle, TrendingUp, Filter } from "lucide-react";

interface EconomicEvent {
  id: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  date: Date;
  forecast: string;
  previous: string;
  actual?: string;
}

interface EconomicCalendarPanelProps {
  symbol: string;
}

const CURRENCIES = ["ALL", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"];

function generateCalendarEvents(): EconomicEvent[] {
  const now = new Date();
  const events: Omit<EconomicEvent, "id" | "date">[] = [
    { currency: "USD", event: "Non-Farm Payrolls", impact: "high", forecast: "185K", previous: "175K" },
    { currency: "USD", event: "CPI (YoY)", impact: "high", forecast: "3.1%", previous: "3.2%" },
    { currency: "USD", event: "FOMC Interest Rate Decision", impact: "high", forecast: "5.25%", previous: "5.25%" },
    { currency: "USD", event: "Initial Jobless Claims", impact: "medium", forecast: "210K", previous: "215K" },
    { currency: "USD", event: "Retail Sales (MoM)", impact: "medium", forecast: "0.4%", previous: "0.3%" },
    { currency: "EUR", event: "ECB Interest Rate Decision", impact: "high", forecast: "4.25%", previous: "4.50%" },
    { currency: "EUR", event: "CPI (YoY)", impact: "high", forecast: "2.4%", previous: "2.6%" },
    { currency: "EUR", event: "German IFO Business Climate", impact: "medium", forecast: "87.5", previous: "86.9" },
    { currency: "GBP", event: "BoE Interest Rate Decision", impact: "high", forecast: "5.00%", previous: "5.25%" },
    { currency: "GBP", event: "GDP (QoQ)", impact: "high", forecast: "0.2%", previous: "0.1%" },
    { currency: "GBP", event: "Employment Change", impact: "medium", forecast: "25K", previous: "32K" },
    { currency: "JPY", event: "BoJ Interest Rate Decision", impact: "high", forecast: "0.10%", previous: "0.00%" },
    { currency: "JPY", event: "Tokyo CPI (YoY)", impact: "medium", forecast: "2.3%", previous: "2.2%" },
    { currency: "AUD", event: "RBA Interest Rate Decision", impact: "high", forecast: "4.35%", previous: "4.35%" },
    { currency: "CAD", event: "BoC Interest Rate Decision", impact: "high", forecast: "4.50%", previous: "4.75%" },
    { currency: "CHF", event: "SNB Interest Rate Decision", impact: "high", forecast: "1.50%", previous: "1.75%" },
    { currency: "USD", event: "ISM Manufacturing PMI", impact: "medium", forecast: "48.2", previous: "47.8" },
    { currency: "USD", event: "Durable Goods Orders", impact: "medium", forecast: "0.6%", previous: "-0.8%" },
    { currency: "EUR", event: "PMI Manufacturing", impact: "low", forecast: "46.1", previous: "45.8" },
    { currency: "GBP", event: "Retail Sales (MoM)", impact: "low", forecast: "0.3%", previous: "-0.1%" },
  ];

  return events.map((e, i) => {
    const hoursOffset = i * 4 + Math.floor(Math.random() * 12) - 6;
    const eventDate = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
    return {
      ...e,
      id: `event-${i}`,
      date: eventDate,
      actual: eventDate < now ? e.forecast : undefined,
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 0) return "Released";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function EconomicCalendarPanel({ symbol }: EconomicCalendarPanelProps) {
  const [filterCurrency, setFilterCurrency] = useState("ALL");
  const events = useMemo(() => generateCalendarEvents(), []);

  const filteredEvents = useMemo(() => {
    if (filterCurrency === "ALL") return events;
    return events.filter((e) => e.currency === filterCurrency);
  }, [events, filterCurrency]);

  const impactColor = {
    high: "text-bearish bg-bearish/15 border-bearish/30",
    medium: "text-gold bg-gold/15 border-gold/30",
    low: "text-on-surface-variant bg-surface-container border-outline",
  };

  const impactDot = {
    high: "bg-bearish",
    medium: "bg-gold",
    low: "bg-on-surface-variant/40",
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-headline font-bold text-sm text-on-surface">Economic Calendar</h2>
          <p className="text-[10px] text-on-surface-variant font-body">
            {filteredEvents.length} upcoming events · {filteredEvents.filter((e) => e.impact === "high").length} high impact
          </p>
        </div>
      </div>

      {/* Currency Filter */}
      <div className="flex items-center space-x-1.5">
        <Filter className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
        <div className="flex flex-wrap gap-1">
          {CURRENCIES.map((cur) => (
            <button
              key={cur}
              onClick={() => setFilterCurrency(cur)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                filterCurrency === cur
                  ? "bg-primary text-on-primary border-primary glow-primary-sm"
                  : "bg-surface-container text-on-surface-variant border-outline hover:border-primary/50"
              }`}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filteredEvents.map((event) => {
          const isPast = event.date < new Date();
          return (
            <div
              key={event.id}
              className={`p-3 rounded-lg border text-xs transition-colors ${
                isPast
                  ? "bg-surface-container/50 border-outline/40 opacity-60"
                  : "bg-surface-container border-outline hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-[10px] bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded border border-outline">
                    {event.currency}
                  </span>
                  <span className="font-headline font-semibold text-on-surface">
                    {event.event}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${impactDot[event.impact]} ${!isPast && event.impact === "high" ? "animate-pulse" : ""}`} />
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${impactColor[event.impact]}`}>
                    {event.impact.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 font-mono text-[10px]">
                  <span className="text-on-surface-variant">
                    Forecast: <span className="text-on-surface font-semibold">{event.forecast}</span>
                  </span>
                  <span className="text-on-surface-variant">
                    Previous: <span className="text-on-surface">{event.previous}</span>
                  </span>
                  {event.actual && (
                    <span className="text-on-surface-variant">
                      Actual: <span className="text-primary font-bold">{event.actual}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1 text-[10px] font-mono shrink-0">
                  <Clock className="w-3 h-3 text-on-surface-variant" />
                  <span className={isPast ? "text-on-surface-variant" : "text-primary font-semibold"}>
                    {getTimeUntil(event.date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
