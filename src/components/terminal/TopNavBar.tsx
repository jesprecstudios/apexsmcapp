"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SYMBOL_CATALOG, getSymbolMeta } from "@/lib/charting/data-generator";
import { useLiveQuote } from "@/hooks/useLiveQuote";
import {
  CandlestickChart,
  Sparkles,
  ChevronDown,
  SlidersHorizontal,
  Bell,
  Maximize2,
  LogOut,
  Search,
  Zap,
  Globe2,
  Upload,
  CircleSlash,
} from "lucide-react";

import AlertsDropdown from "./AlertsDropdown";

interface TopNavBarProps {
  currentSymbol: string;
  currentTimeframe: string;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (tf: string) => void;
  onSnapshotAnalyze: () => void;
  onOpenManualUpload?: () => void;
  isAnalyzing?: boolean;
  onOpenSettings?: () => void;
}

const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"];

export default function TopNavBar({
  currentSymbol,
  currentTimeframe,
  onSymbolChange,
  onTimeframeChange,
  onSnapshotAnalyze,
  onOpenManualUpload,
  isAnalyzing = false,
  onOpenSettings,
}: TopNavBarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<"synthetic" | "traditional">("synthetic");
  const [searchQuery, setSearchQuery] = useState("");

  const activeMeta = getSymbolMeta(currentSymbol);
  const quote = useLiveQuote(currentSymbol, currentTimeframe);

  // Group symbols into Synthetic and Traditional categories
  const allSymbols = useMemo(() => Object.values(SYMBOL_CATALOG), []);

  const filteredSymbols = useMemo(() => {
    return allSymbols.filter((s) => {
      const matchesTab =
        activeCategoryTab === "synthetic"
          ? s.category === "synthetic"
          : s.category !== "synthetic";
      const matchesSearch =
        s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.derivSymbol && s.derivSymbol.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [allSymbols, activeCategoryTab, searchQuery]);

  const handleLogout = async () => {
    try {
      document.cookie = "apexsmc_demo_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="bg-surface text-on-surface flex justify-between items-center w-full px-4 h-14 border-b border-outline-variant z-40 shrink-0 select-none">
      {/* Left Section: Monogram Logo & Symbol Selector */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        {/* Brand Monogram */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center border border-primary/40 glow-primary-sm">
            <CandlestickChart className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline text-lg font-bold tracking-tight text-on-surface">
            ApexSMC
          </span>
          <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
            PRO
          </span>
        </div>

        <div className="h-4 w-px bg-outline hidden sm:block"></div>

        {/* Enhanced Ticker Switcher with Deriv Synthetics & Traditional Tabs */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center bg-surface-container border border-outline rounded-lg px-2.5 py-1 space-x-2 cursor-pointer hover:border-primary/50 transition-colors"
          >
            {activeMeta.category === "synthetic" ? (
              <span className="flex items-center text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.2 rounded">
                <Zap className="w-3 h-3 mr-0.5 text-primary" /> DERIV 24/7
              </span>
            ) : (
              <span className="flex items-center text-[10px] font-mono font-bold bg-surface-container-high text-on-surface-variant border border-outline px-1.5 py-0.2 rounded">
                <Globe2 className="w-3 h-3 mr-0.5" /> {activeMeta.category.toUpperCase()}
              </span>
            )}

            <span className="font-headline font-bold text-xs tracking-wider text-on-surface">
              {activeMeta.symbol}
            </span>
            <span className="text-on-surface-variant text-[11px] hidden xl:inline">
              {activeMeta.name}
            </span>
            {quote.available ? (
              <>
                <span className="font-mono text-xs font-semibold text-primary">
                  {quote.price.toLocaleString(undefined, {
                    minimumFractionDigits: activeMeta.decimals,
                    maximumFractionDigits: activeMeta.decimals,
                  })}
                </span>
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    (quote.changePct ?? 0) >= 0 ? "text-bullish" : "text-bearish"
                  }`}
                >
                  {quote.changePct === undefined ? "" : `${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%`}
                </span>
              </>
            ) : (
              <span
                title="No live feed configured. Add a Twelve Data key for forex/metals/crypto, or a Deriv app_id for synthetic indices."
                className="hidden sm:flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant bg-surface-container-high border border-outline px-1.5 py-0.5 rounded"
              >
                <CircleSlash className="w-2.5 h-2.5" />
                No feed
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>

          {/* Ticker Dropdown Modal */}
          {dropdownOpen && (
            <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-surface border border-outline rounded-xl shadow-2xl py-2 z-50 animate-in fade-in-50 duration-150">
              {/* Category Filter Tabs */}
              <div className="flex border-b border-outline-variant px-2 pb-2 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab("synthetic")}
                  className={`flex-1 py-1 px-2 rounded text-[11px] font-headline font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-colors ${
                    activeCategoryTab === "synthetic"
                      ? "bg-primary text-on-primary glow-primary-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Deriv Synthetics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab("traditional")}
                  className={`flex-1 py-1 px-2 rounded text-[11px] font-headline font-bold uppercase tracking-wider flex items-center justify-center space-x-1 transition-colors ${
                    activeCategoryTab === "traditional"
                      ? "bg-primary text-on-primary glow-primary-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Globe2 className="w-3 h-3" />
                  <span>Forex &amp; Metals</span>
                </button>
              </div>

              {/* Search Field */}
              <div className="px-2 pt-2 pb-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    placeholder="Search asset (e.g. V75, Crash 1000, EUR)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container border border-outline focus:border-primary rounded-md py-1 pl-8 pr-2 text-xs text-on-surface font-body outline-none placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              {/* Timeframe (also reachable on small screens, where the
                  header pills are hidden) */}
              <div className="px-2 pt-2 pb-1 lg:hidden">
                <div className="text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Timeframe
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => {
                        onTimeframeChange(tf);
                        setDropdownOpen(false);
                      }}
                      className={`py-1 rounded text-[11px] font-mono font-semibold border transition-colors ${
                        tf === currentTimeframe
                          ? "bg-primary text-on-primary border-primary"
                          : "bg-surface-container text-on-surface-variant border-outline hover:border-primary/50"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset List */}
              <div className="max-h-64 overflow-y-auto py-1 divide-y divide-outline-variant/40">
                {filteredSymbols.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-on-surface-variant font-body">
                    No matching assets found
                  </div>
                ) : (
                  filteredSymbols.map((s) => {
                    const isSelected = s.symbol === currentSymbol;
                    return (
                      <button
                        key={s.symbol}
                        onClick={() => {
                          onSymbolChange(s.symbol);
                          setDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-surface-container-high transition-colors ${
                          isSelected ? "bg-surface-container border-l-2 border-primary text-primary" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-headline font-bold tracking-wide text-on-surface">
                              {s.symbol}
                            </span>
                            {s.category === "synthetic" && (
                              <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/30 px-1 rounded uppercase">
                                {s.derivSymbol || "24/7"}
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-on-surface-variant font-body truncate max-w-[160px]">
                            {s.name}
                          </span>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <span className="text-[10px] text-on-surface-variant">
                            {s.category === "synthetic" ? "24/7" : s.category.toUpperCase()}
                          </span>
                          <span className="block text-[10px] text-primary">
                            Spread: {s.spread}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* Timeframe Selector Pills */}
        <div className="hidden lg:flex items-center bg-surface-container border border-outline rounded-lg p-0.5 space-x-0.5 font-mono text-xs font-medium">
          {TIMEFRAMES.map((tf) => {
            const isActive = tf === currentTimeframe;
            return (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  isActive
                    ? "bg-primary text-on-primary font-bold shadow-sm glow-primary-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Section: Snapshot & Analyze Action, Settings, User Logout */}
      <div className="flex items-center space-x-3">
        {/* Manual upload for third-party charts we cannot capture ourselves */}
        {onOpenManualUpload && (
          <button
            onClick={onOpenManualUpload}
            title="Upload a chart snapshot (TradingView, broker platform)"
            className="flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-wider py-2 px-3 rounded-lg border border-outline text-on-surface-variant hover:text-on-surface hover:border-primary/50 hover:bg-surface-container transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Upload</span>
          </button>
        )}

        {/* Core CTA: Analyze Chart */}
        <button
          onClick={onSnapshotAnalyze}
          disabled={isAnalyzing}
          className={`flex items-center space-x-2 font-headline text-xs font-bold uppercase tracking-wider py-2 px-3 sm:px-4 rounded-lg transition-all active:scale-95 cursor-pointer ${
            isAnalyzing
              ? "bg-surface-container border border-primary/50 text-primary opacity-80 cursor-wait"
              : "bg-primary hover:bg-primary/90 text-on-primary glow-primary shadow-lg"
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">
            {isAnalyzing ? "Analyzing..." : "Analyze Chart"}
          </span>
          <span className="sm:hidden">{isAnalyzing ? "..." : "Analyze"}</span>
        </button>

        <div className="h-4 w-px bg-outline"></div>

        {/* Terminal Controls */}
        <div className="flex items-center space-x-1">
          {/* Price Alerts Dropdown */}
          <div className="relative">
            <button
              title="Price Alerts"
              onClick={() => setAlertsOpen(!alertsOpen)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                alertsOpen
                  ? "text-primary bg-primary/20 glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <AlertsDropdown
              symbol={currentSymbol}
              currentPrice={quote.available ? quote.price : activeMeta.basePrice}
              isOpen={alertsOpen}
              onClose={() => setAlertsOpen(false)}
            />
            {alertsOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAlertsOpen(false)}
              />
            )}
          </div>

          {/* Full Screen Toggle */}
          <button
            title="Full Screen"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors hidden sm:block cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Terminal Settings */}
          <button
            title="Terminal Settings"
            onClick={onOpenSettings}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            title="Log Out"
            onClick={handleLogout}
            className="p-2 text-bearish/80 hover:text-bearish hover:bg-bearish/10 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
