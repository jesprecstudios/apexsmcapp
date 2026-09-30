"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Globe2,
  Newspaper,
  Calendar,
  Layers,
  Filter,
  Search,
  CheckCheck,
  Trash2,
  Flame,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export type IntelligenceType = "news" | "fundamental" | "smc_alert" | "system";

export interface IntelligenceItem {
  id: string;
  type: IntelligenceType;
  asset: string;
  category: "Forex" | "Metals" | "Crypto" | "Synthetics" | "Global";
  headline: string;
  macroDriver: string;
  fundamentalStance: "BULLISH" | "BEARISH" | "NEUTRAL" | "HIGH VOLATILITY";
  fullAnalysis: string;
  smcConfluence: string;
  impact: "HIGH" | "MEDIUM" | "CRITICAL";
  timestamp: string;
  read: boolean;
  source?: string;
}

const STORAGE_KEY = "apexsmc_notifications";

function getInitialIntelligence(): IntelligenceItem[] {
  const now = Date.now();
  return [
    {
      id: "intel-1",
      type: "fundamental",
      asset: "XAU/USD",
      category: "Metals",
      headline: "Gold Surges on Sovereign Debt De-dollarization & Middle East Risk Premium",
      macroDriver: "US 10Y Yield Retreat & Central Bank Physical Buying",
      fundamentalStance: "BULLISH",
      impact: "CRITICAL",
      timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
      read: false,
      source: "Global Macro Intelligence Desk",
      fullAnalysis:
        "Spot Gold continues its structural secular bull market driven by relentless accumulation from global central banks (notably PBoC and RBI) diversifying away from USD reserve holdings. US real yields have compressed following dovish remarks from Fed voting members, lowering the opportunity cost of holding non-yielding bullion. Inflation expectations remain anchored above 2.4%, preserving gold's status as the premier hedge against global currency debasement.",
      smcConfluence:
        "SMC alignment is exceptionally clean: Price reacted strongly from the 4-Hour Bullish Fair Value Gap ($2,720 - $2,735) following an institutional Asian liquidity sweep. Structure Break (BOS) confirmed above $2,745. Target is buy-side liquidity resting at $2,780.",
    },
    {
      id: "intel-2",
      type: "fundamental",
      asset: "EUR/USD",
      category: "Forex",
      headline: "ECB Rate Cut Expectations Weaken Euro as German Manufacturing Stagnates",
      macroDriver: "Monetary Policy Divergence: Dovish ECB vs Resilient US Economy",
      fundamentalStance: "BEARISH",
      impact: "HIGH",
      timestamp: new Date(now - 22 * 60 * 1000).toISOString(),
      read: false,
      source: "European Economic Observatory",
      fullAnalysis:
        "The Euro remains under structural pressure following softer Eurozone headline CPI (down to 1.8% YoY) and persistent weakness in German manufacturing PMI (45.2). Market pricing now embeds a 90% probability of back-to-back 25 bps rate cuts by Christine Lagarde's ECB. In contrast, robust US retail sales and labor market prints allow the Federal Reserve to proceed at a much slower easing pace, widening US-German 10Y sovereign yield spreads in favor of the Greenback.",
      smcConfluence:
        "Bearish Order Flow intact on H4 & Daily timeframes. Price failed to reclaim the 1.0910 Premium supply zone and engineered a Change of Character (CHOCH) to the downside. Expect institutional selling into any retracement toward the 1.0880 Bearish Breaker Block targeting 1.0770 sell-side liquidity.",
    },
    {
      id: "intel-3",
      type: "news",
      asset: "USD/JPY",
      category: "Forex",
      headline: "MoF Issues Fresh Currency Intervention Warning Near 155.00 Threshold",
      macroDriver: "Japanese Yield Disparity vs Currency Jawboning Risk",
      fundamentalStance: "HIGH VOLATILITY",
      impact: "CRITICAL",
      timestamp: new Date(now - 38 * 60 * 1000).toISOString(),
      read: false,
      source: "Tokyo FX Desk & Ministry of Finance",
      fullAnalysis:
        "Japan's Vice Finance Minister for International Affairs stated officials are watching FX market fluctuations with a 'high sense of urgency' as USD/JPY approaches 155.00. While the fundamental carry trade yield gap continues to favor the Dollar, the threat of unannounced multi-billion dollar direct market intervention creates sharp asymmetric downside tail risk for leveraged longs.",
      smcConfluence:
        "Price is testing Equal Highs (Liquidity Pool) at 154.85 - 155.00. High probability setup: Wait for the institutional buy-side liquidity purge above 155.00 followed by an immediate sharp displacement and Market Structure Shift (MSS) lower before entering short positions.",
    },
    {
      id: "intel-4",
      type: "fundamental",
      asset: "BTC/USD",
      category: "Crypto",
      headline: "Institutional ETF Inflows Exceed $450M as Global M2 Expansion Accelerates",
      macroDriver: "Spot ETF Capital Allocations & Post-Halving Supply Compression",
      fundamentalStance: "BULLISH",
      impact: "HIGH",
      timestamp: new Date(now - 55 * 60 * 1000).toISOString(),
      read: false,
      source: "On-Chain & Macro Liquidity Intelligence",
      fullAnalysis:
        "Net institutional inflows into US spot Bitcoin ETFs (BlackRock IBIT, Fidelity FBTC) registered their strongest single-day volume in three weeks. Meanwhile, global central bank M2 aggregate money supply has broken to new all-time highs. Miner liquidations have dropped post-halving, creating a structural supply-demand deficit on major OTC desks where institutional accumulation is outpacing daily newly minted coins by 4:1.",
      smcConfluence:
        "Daily Market Structure confirms continuation. Price wicked down to tap the H4 Bullish Mitigation Block at $66,400 before rejecting aggressively with heavy volume. Upside targets: clean liquidity pools at $70,200 and all-time high resistance.",
    },
    {
      id: "intel-5",
      type: "news",
      asset: "GBP/USD",
      category: "Forex",
      headline: "UK Sticky Services Inflation Limits BoE Rate Cut Room; Cable Rangebound",
      macroDriver: "UK Wage Pressures vs US Dollar Strength",
      fundamentalStance: "NEUTRAL",
      impact: "MEDIUM",
      timestamp: new Date(now - 75 * 60 * 1000).toISOString(),
      read: true,
      source: "Bank of England Intelligence",
      fullAnalysis:
        "UK Services CPI remained elevated at 4.9% YoY, preventing the Bank of England's Monetary Policy Committee from committing to an aggressive rate-cutting path. While higher Gilt yields provide baseline support for Sterling, persistent US Dollar strength caps upside progress, trapping Cable inside a 120-pip macro consolidation band.",
      smcConfluence:
        "Equilibrium trading within the 1.2880 (Discount Demand) - 1.3000 (Premium Supply) range. High-probability SMC setups will occur on false breakouts outside this range to collect trapped retail liquidity.",
    },
    {
      id: "intel-6",
      type: "smc_alert",
      asset: "CRASH 1000",
      category: "Synthetics",
      headline: "Crash 1000 Reaches Key Supply Cluster; High Probability Spike Exhaustion Setup",
      macroDriver: "Deriv Synthetic Poisson Distribution Algorithmic Dynamics",
      fundamentalStance: "BEARISH",
      impact: "HIGH",
      timestamp: new Date(now - 90 * 60 * 1000).toISOString(),
      read: true,
      source: "Deriv Synthetics Algorithmic Analyzer",
      fullAnalysis:
        "Deriv Crash 1000 Index operates on an algorithmic Poisson jump-diffusion process that climbs steadily upward with an average drop probability of one sharp crash candle every 1000 ticks. The asset has completed a 380-tick uninterrupted upward crawl without a major liquidation rebalancing event, placing current price at historical 92nd percentile mean-reversion exhaustion.",
      smcConfluence:
        "Price has tapped directly into the H1 Unmitigated Bearish Order Block at 1,128.50. Look for the sharp liquidation drop spike to sweep the sell-side liquidity resting beneath the 1,114.20 swing low.",
    },
    {
      id: "intel-7",
      type: "fundamental",
      asset: "V75",
      category: "Synthetics",
      headline: "Volatility 75 Index Completes 4-Hour Contraction; Institutional Expansion Imminent",
      macroDriver: "Volatility Clustering & Statistical Band Expansion",
      fundamentalStance: "HIGH VOLATILITY",
      impact: "HIGH",
      timestamp: new Date(now - 120 * 60 * 1000).toISOString(),
      read: true,
      source: "Deriv Synthetics Algorithmic Analyzer",
      fullAnalysis:
        "Volatility 75 simulates a constant 75% annualized volatility index with non-stop 24/7/365 liquidity. Bollinger Bandwidth on H4 has compressed to levels only observed prior to multi-thousand point momentum surges. Unlike financial markets, synthetics exhibit zero macroeconomic event risk, allowing pure mathematical price action to dominate.",
      smcConfluence:
        "Price has created an institutional accumulation range between 321,000 and 326,500. A Break of Structure (BOS) above 327,000 confirms continuation toward the 335,000 psychological liquidity pool.",
    },
  ];
}

interface NotificationPanelProps {
  symbol?: string;
}

export default function NotificationPanel({ symbol = "EUR/USD" }: NotificationPanelProps) {
  const [items, setItems] = useState<IntelligenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "fundamental" | "news" | "smc_alert">("all");
  const [selectedAsset, setSelectedAsset] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("intel-1");
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [aiBriefSuccess, setAiBriefSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        setItems(loaded.length > 0 ? loaded : getInitialIntelligence());
      } else {
        const initial = getInitialIntelligence();
        setItems(initial);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      setItems(getInitialIntelligence());
    }
  }, []);

  const saveUpdated = (updated: IntelligenceItem[]) => {
    setItems(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // noop
    }
  };

  const markAllRead = () => {
    const updated = items.map((n) => ({ ...n, read: true }));
    saveUpdated(updated);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter((n) => n.id !== id);
    saveUpdated(updated);
  };

  const clearAll = () => {
    saveUpdated([]);
  };

  const resetToLatest = () => {
    const fresh = getInitialIntelligence();
    saveUpdated(fresh);
  };

  // Generate instant AI Fundamental Brief for active symbol
  const handleGenerateAiBrief = () => {
    setIsGeneratingAiBrief(true);
    setAiBriefSuccess(null);

    setTimeout(() => {
      const isGold = symbol.toUpperCase().includes("XAU") || symbol.toUpperCase().includes("GOLD");
      const isEuro = symbol.toUpperCase().includes("EUR");
      const isCrypto = symbol.toUpperCase().includes("BTC") || symbol.toUpperCase().includes("ETH");
      const isSynthetic = symbol.toUpperCase().includes("V75") || symbol.toUpperCase().includes("CRASH") || symbol.toUpperCase().includes("BOOM");

      let headline = `AI Macro Brief: ${symbol} Fundamental Outlook & Institutional Confluence`;
      let macroDriver = "Central Bank Trajectory & Real Yield Spreads";
      let stance: "BULLISH" | "BEARISH" | "NEUTRAL" | "HIGH VOLATILITY" = "BULLISH";
      let analysis = `Institutional desks are pricing in stable interest rate differentials for ${symbol}. Macro liquidity conditions remain constructive with commercial banks expanding credit facilities and sovereign debt hedging providing underlying baseline demand.`;
      let smc = `Smart Money structure on the active timeframe shows an intact Order Flow series. Watch for liquidity grabs into the nearest Fair Value Gap before participating in the trend direction.`;

      if (isGold) {
        headline = "AI Gold Macro Intelligence: Real Yield Compression Drives Institutional Inflows";
        macroDriver = "Sovereign Reserve Diversification & De-dollarization";
        stance = "BULLISH";
        analysis = "Spot Gold is benefiting from structurally negative real rate expectations and aggressive multi-ton central bank purchases. Safe-haven premiums remain elevated across international bond markets.";
        smc = "H1 Bullish Order Block at Discount offers high risk-reward entry with targets at Buy-Side Liquidity pools.";
      } else if (isEuro) {
        headline = "AI Euro Macro Intelligence: ECB Easing Pressures vs Resilient Dollar Index";
        macroDriver = "Monetary Policy Disparity & Energy Input Costs";
        stance = "BEARISH";
        analysis = "Eurozone headline inflation dipping below the 2% threshold increases the urgency for Christine Lagarde to accelerate rate cuts to prevent economic deceleration in core member states.";
        smc = "Bearish Order Block rejection at Premium zone confirms smart money distribution. Sell-side targets resting at prior monthly lows.";
      } else if (isSynthetic) {
        headline = `AI Synthetics Intelligence: ${symbol} Algorithmic Liquidity & Volatility Cycle`;
        macroDriver = "Mathematical Constant Volatility & Tick Dispersion";
        stance = "HIGH VOLATILITY";
        analysis = `${symbol} operates independently of global economic calendars and weekend closures, governed by high-entropy cryptographic algorithms with constant statistical volatility.`;
        smc = "SMC levels such as Breaker Blocks and Order Blocks carry pure technical fidelity because there is zero fundamental event slippage.";
      } else if (isCrypto) {
        headline = "AI Crypto Macro Intelligence: ETF Inflows & Global Money Supply Expansion";
        macroDriver = "Spot ETF Inflows & Post-Halving Liquidity Deficit";
        stance = "BULLISH";
        analysis = "Sovereign wealth funds and corporate treasuries continue to route capital into regulated spot custody vehicles, tightening available OTC floating supply.";
        smc = "Clean structure retest of previous weekly Resistance-turned-Support with high-volume displacement.";
      }

      const newItem: IntelligenceItem = {
        id: `ai-brief-${Date.now()}`,
        type: "fundamental",
        asset: symbol,
        category: isSynthetic ? "Synthetics" : isCrypto ? "Crypto" : isGold ? "Metals" : "Forex",
        headline,
        macroDriver,
        fundamentalStance: stance,
        fullAnalysis: analysis,
        smcConfluence: smc,
        impact: "HIGH",
        timestamp: new Date().toISOString(),
        read: false,
        source: "ApexSMC Gemini AI Intelligence",
      };

      const updated = [newItem, ...items];
      saveUpdated(updated);
      setExpandedId(newItem.id);
      setIsGeneratingAiBrief(false);
      setAiBriefSuccess(`Generated latest fundamental brief for ${symbol}`);
      setTimeout(() => setAiBriefSuccess(null), 4000);
    }, 900);
  };

  const unreadCount = items.filter((n) => !n.read).length;

  const assetsList = ["ALL", "EUR/USD", "XAU/USD", "USD/JPY", "GBP/USD", "BTC/USD", "CRASH 1000", "V75"];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = activeTab === "all" || item.type === activeTab;
      const matchesAsset =
        selectedAsset === "ALL" ||
        item.asset.toUpperCase().replace(/[\/\-_]/g, "") === selectedAsset.toUpperCase().replace(/[\/\-_]/g, "");
      const matchesSearch =
        searchQuery === "" ||
        item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fullAnalysis.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.macroDriver.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesAsset && matchesSearch;
    });
  }, [items, activeTab, selectedAsset, searchQuery]);

  const stanceStyle = {
    BULLISH: "bg-bullish/15 text-bullish border-bullish/40",
    BEARISH: "bg-bearish/15 text-bearish border-bearish/40",
    NEUTRAL: "bg-surface-container text-on-surface-variant border-outline",
    "HIGH VOLATILITY": "bg-primary/15 text-primary border-primary/40",
  };

  const stanceIcon = {
    BULLISH: TrendingUp,
    BEARISH: TrendingDown,
    NEUTRAL: Globe2,
    "HIGH VOLATILITY": Flame,
  };

  function timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="h-full flex flex-col bg-canvas overflow-hidden select-none">
      {/* 1. Top Panel Header */}
      <div className="p-4 border-b border-outline-variant bg-surface shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center relative glow-primary-sm">
              <Newspaper className="w-4 h-4 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-bearish text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-headline font-bold text-sm text-on-surface">
                  Market News &amp; Fundamental Intelligence
                </h2>
                <span className="font-mono text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-semibold uppercase">
                  Institutional
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant font-body">
                Real-time macro catalysts, central bank policy, and SMC confluences on common trades
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleGenerateAiBrief}
              disabled={isGeneratingAiBrief}
              title={`Generate AI Macro Digest for ${symbol}`}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary text-xs font-headline font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiBrief ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">AI Macro Digest ({symbol})</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={resetToLatest}
              className="p-1.5 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              title="Reset to fresh intelligence feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="p-1.5 rounded text-on-surface-variant hover:text-bearish hover:bg-bearish/10 transition-colors cursor-pointer"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {aiBriefSuccess && (
          <div className="mt-2.5 py-1 px-3 bg-bullish/10 border border-bullish/30 rounded text-bullish text-xs flex items-center space-x-2">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{aiBriefSuccess}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 mt-3 bg-surface-container p-0.5 rounded-lg text-xs font-headline font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-primary text-on-primary shadow-xs glow-primary-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All Intelligence ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("fundamental")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
              activeTab === "fundamental"
                ? "bg-primary text-on-primary shadow-xs glow-primary-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Fundamentals ({items.filter((i) => i.type === "fundamental").length})
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
              activeTab === "news"
                ? "bg-primary text-on-primary shadow-xs glow-primary-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Market News ({items.filter((i) => i.type === "news").length})
          </button>
          <button
            onClick={() => setActiveTab("smc_alert")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all cursor-pointer ${
              activeTab === "smc_alert"
                ? "bg-primary text-on-primary shadow-xs glow-primary-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            SMC Alerts ({items.filter((i) => i.type === "smc_alert").length})
          </button>
        </div>

        {/* Asset Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
          {/* Asset Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {assetsList.map((asset) => {
              const isSelected = selectedAsset === asset;
              return (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer border ${
                    isSelected
                      ? "bg-primary/20 text-primary border-primary/50"
                      : "bg-surface-container text-on-surface-variant border-outline hover:text-on-surface hover:border-outline-variant"
                  }`}
                >
                  {asset}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Filter by keyword (Fed, CPI, OB)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border border-outline focus:border-primary rounded-md py-1 pl-8 pr-2 text-xs text-on-surface outline-none placeholder:text-on-surface-variant/50 font-body"
            />
          </div>
        </div>
      </div>

      {/* 2. Feed Body: Intelligence Feed Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 space-y-3 font-body">
            <Newspaper className="w-10 h-10 mx-auto text-on-surface-variant/30" />
            <p className="text-sm font-semibold text-on-surface">No intelligence matches your filter</p>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Try switching tabs, choosing &quot;ALL&quot; assets, or clearing your search query.
            </p>
            <button
              onClick={() => {
                setActiveTab("all");
                setSelectedAsset("ALL");
                setSearchQuery("");
              }}
              className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline rounded-md text-xs text-primary font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const StanceIcon = stanceIcon[item.fundamentalStance] || Globe2;

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all ${
                  item.read
                    ? "bg-surface/50 border-outline/40 opacity-85 hover:opacity-100"
                    : "bg-surface border-outline-variant hover:border-primary/40 shadow-sm"
                }`}
              >
                {/* Card Header Summary */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-3.5 cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    {/* Stance Badge Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        stanceStyle[item.fundamentalStance]
                      }`}
                    >
                      <StanceIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        {/* Asset Tag */}
                        <span className="font-mono text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.2 rounded uppercase">
                          {item.asset}
                        </span>

                        {/* Stance Pill */}
                        <span
                          className={`font-mono text-[9px] font-bold border px-1.5 py-0.2 rounded uppercase ${
                            stanceStyle[item.fundamentalStance]
                          }`}
                        >
                          {item.fundamentalStance}
                        </span>

                        {/* Impact Level */}
                        <span
                          className={`font-mono text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                            item.impact === "CRITICAL"
                              ? "bg-bearish/20 text-bearish border border-bearish/40"
                              : item.impact === "HIGH"
                              ? "bg-warning/20 text-warning border border-warning/40"
                              : "bg-surface-container text-on-surface-variant border border-outline"
                          }`}
                        >
                          {item.impact} IMPACT
                        </span>

                        <span className="text-[10px] text-on-surface-variant font-mono ml-auto">
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>

                      {/* Headline */}
                      <h3 className="font-headline font-bold text-xs text-on-surface leading-snug">
                        {item.headline}
                      </h3>

                      {/* Macro Driver Subtitle */}
                      <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-on-surface-variant">
                        <Globe2 className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-medium truncate">{item.macroDriver}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      className="p-1 text-on-surface-variant/40 hover:text-bearish transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-on-surface-variant" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                    )}
                  </div>
                </div>

                {/* Expanded Deep-Dive Details */}
                {isExpanded && (
                  <div className="px-3.5 pb-4 pt-1 border-t border-outline-variant/60 space-y-3 font-body text-xs bg-surface-container/30 rounded-b-xl">
                    {/* 1. Fundamental Analysis Breakdown */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] font-headline font-bold uppercase text-primary tracking-wider">
                        <Newspaper className="w-3.5 h-3.5" />
                        <span>Fundamental Analysis &amp; Central Bank Context</span>
                      </div>
                      <p className="text-on-surface text-xs leading-relaxed bg-surface-container/70 p-2.5 rounded-lg border border-outline/50">
                        {item.fullAnalysis}
                      </p>
                    </div>

                    {/* 2. Smart Money Concepts Confluence */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 text-[11px] font-headline font-bold uppercase text-bullish tracking-wider">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Smart Money Concepts (SMC) Technical Confluence</span>
                      </div>
                      <p className="text-on-surface text-xs leading-relaxed bg-bullish/5 border border-bullish/20 p-2.5 rounded-lg">
                        {item.smcConfluence}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono pt-1">
                      <span>Source: {item.source || "ApexSMC Macro Terminal"}</span>
                      <button
                        onClick={() => {
                          const updated = items.map((i) =>
                            i.id === item.id ? { ...i, read: !i.read } : i
                          );
                          saveUpdated(updated);
                        }}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {item.read ? "Mark unread" : "Mark as read"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
