"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  HelpCircle,
  Send,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
  RotateCcw,
  GitMerge,
  Target,
  Copy,
  Check,
} from "lucide-react";
import { AnalysisResult, AnalysisStrategy, PriceLevel, ReasoningItem } from "@/lib/ai/types";
import { STRATEGY_REGISTRY } from "@/lib/ai/strategy-registry";

interface AIAnalysisPanelProps {
  symbol: string;
  timeframe: string;
  strategy: AnalysisStrategy;
  onStrategyChange: (strategy: AnalysisStrategy) => void;
  /** Account settings, needed before any lot size can be shown. */
  riskProfile?: { accountBalance: number; riskPercent: number } | null;
  isAnalyzing?: boolean;
  analysis: AnalysisResult | null;
  onRunInquiry?: (inquiry: string) => void;
  onRefresh?: () => void;
}

// ─── Helpers to split a single analysis result across tabs ───────────────────

/** Keywords that signal SMC-specific content */
const SMC_KEYWORDS = [
  "order block", "ob", "fair value gap", "fvg", "liquidity", "bos",
  "break of structure", "choch", "change of character", "displacement",
  "premium", "discount", "imbalance", "mitigation", "sweep", "institutional",
  "smart money", "market structure", "swing high", "swing low",
];

/** Keywords that signal chart-pattern content */
const PATTERN_KEYWORDS = [
  "double top", "double bottom", "head and shoulders", "triangle",
  "wedge", "flag", "pennant", "channel", "rectangle", "cup and handle",
  "ascending", "descending", "broadening", "pattern", "neckline",
  "breakout", "continuation", "formation", "measured move", "geometric",
];

/** Keywords that signal reversal content */
const REVERSAL_KEYWORDS = [
  "reversal", "engulfing", "pin bar", "pinbar", "hammer", "shooting star",
  "doji", "morning star", "evening star", "tweezer", "harami", "candle",
  "candlestick", "wick", "rejection", "exhaustion", "divergence",
  "overbought", "oversold", "reversal signal",
];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function filterReasoning(items: ReasoningItem[], keywords: string[]): ReasoningItem[] {
  return items.filter(
    (r) =>
      matchesKeywords(r.observation, keywords) ||
      matchesKeywords(r.interpretation, keywords)
  );
}

function filterLevels(levels: PriceLevel[], keywords: string[]): PriceLevel[] {
  return levels.filter(
    (l) =>
      matchesKeywords(l.label, keywords) ||
      matchesKeywords(l.evidence, keywords)
  );
}

// SMC level types from the typed enum
const SMC_LEVEL_TYPES = new Set(["order_block", "fair_value_gap", "liquidity"]);
const REVERSAL_LEVEL_TYPES = new Set(["invalidation", "support", "resistance"]);

// ─── Component ──────────────────────────────────────────────────────────────

export default function AIAnalysisPanel({
  symbol,
  timeframe,
  strategy,
  onStrategyChange,
  riskProfile,
  isAnalyzing = false,
  analysis,
  onRunInquiry,
  onRefresh,
}: AIAnalysisPanelProps) {
  const [inquiry, setInquiry] = useState("");
  const [copiedSignal, setCopiedSignal] = useState(false);

  const strategies: Array<{ id: AnalysisStrategy; label: string; tooltip: string; icon: typeof Layers }> = [
    { id: "smc", label: "SMC", tooltip: "Smart Money Concepts & Order Flow", icon: Zap },
    { id: "chart_patterns", label: "Patterns", tooltip: "Classical Chart Patterns", icon: BarChart3 },
    { id: "candlestick_reversals", label: "Reversals", tooltip: "Candlestick Reversal Signals", icon: RotateCcw },
    { id: "combined", label: "Confluence", tooltip: "Multi-Factor Synthesis", icon: GitMerge },
    { id: "signals", label: "Signals", tooltip: "Actionable Trade Setup (Entry, SL, TP)", icon: Target },
  ];

  const quickPrompts = [
    "What invalidates this setup?",
    "Explain FVG fill probability",
    "Where is the nearest liquidity sweep?",
    "Calculate R:R for secondary target",
  ];

  const handleInquirySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inquiry.trim() && onRunInquiry) {
      onRunInquiry(inquiry.trim());
      setInquiry("");
    }
  };

  // ─── Derive filtered subsets for each tab ──────────────────────────────────
  const tabContent = useMemo(() => {
    if (!analysis) return null;

    // SMC tab
    const smcLevels = analysis.keyLevels.filter(
      (l) => SMC_LEVEL_TYPES.has(l.levelType) || matchesKeywords(l.label, SMC_KEYWORDS) || matchesKeywords(l.evidence, SMC_KEYWORDS)
    );
    const smcReasoning = filterReasoning(analysis.reasoning, SMC_KEYWORDS);
    // If keyword filtering yields nothing, show all (the combined analysis may use terms we didn't anticipate)
    const smcLevelsFinal = smcLevels.length > 0 ? smcLevels : analysis.keyLevels.filter((l) => SMC_LEVEL_TYPES.has(l.levelType));
    const smcReasoningFinal = smcReasoning.length > 0 ? smcReasoning : analysis.reasoning.slice(0, 3);

    // Patterns tab
    const patternLevels = filterLevels(analysis.keyLevels, PATTERN_KEYWORDS);
    const patternReasoning = filterReasoning(analysis.reasoning, PATTERN_KEYWORDS);
    const patternLevelsFinal = patternLevels.length > 0 ? patternLevels : analysis.keyLevels.filter((l) => l.levelType === "support" || l.levelType === "resistance");
    const patternReasoningFinal = patternReasoning.length > 0 ? patternReasoning : analysis.reasoning.filter((r) => !matchesKeywords(r.observation + r.interpretation, SMC_KEYWORDS)).slice(0, 3);

    // Reversals tab
    const reversalLevels = analysis.keyLevels.filter(
      (l) => REVERSAL_LEVEL_TYPES.has(l.levelType) || matchesKeywords(l.label, REVERSAL_KEYWORDS) || matchesKeywords(l.evidence, REVERSAL_KEYWORDS)
    );
    const reversalReasoning = filterReasoning(analysis.reasoning, REVERSAL_KEYWORDS);
    const reversalLevelsFinal = reversalLevels.length > 0 ? reversalLevels : analysis.keyLevels.filter((l) => l.levelType === "invalidation" || l.levelType === "target");
    const reversalReasoningFinal = reversalReasoning.length > 0 ? reversalReasoning : analysis.reasoning.slice(-2);

    return {
      smc: { levels: smcLevelsFinal, reasoning: smcReasoningFinal },
      patterns: { levels: patternLevelsFinal, reasoning: patternReasoningFinal },
      reversals: { levels: reversalLevelsFinal, reasoning: reversalReasoningFinal },
    };
  }, [analysis]);

  const isBullish = analysis?.bias === "bullish";
  const isBearish = analysis?.bias === "bearish";

  const primaryScenario = analysis?.scenarios?.[0];
  const tradePlan = analysis?.tradePlan;
  const calculatedRR = tradePlan ? `1 : ${tradePlan.rr.toFixed(2)}` : "N/A";

  // ─── Shared sub-renderers ──────────────────────────────────────────────────

  const renderBiasHero = () => {
    if (!analysis) return null;
    return (
      <div
        className={`border rounded-lg p-3 relative overflow-hidden transition-colors ${
          isBullish
            ? "bg-navy/70 border-primary/50 text-primary"
            : isBearish
            ? "bg-bearish/10 border-bearish/50 text-bearish"
            : "bg-surface-container border-outline text-on-surface"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                isBullish
                  ? "bg-primary/20 text-primary"
                  : isBearish
                  ? "bg-bearish/20 text-bearish"
                  : "bg-surface-high text-on-surface-variant"
              }`}
            >
              {isBullish ? (
                <ArrowUpRight className="w-4 h-4 font-bold" />
              ) : isBearish ? (
                <ArrowDownRight className="w-4 h-4 font-bold" />
              ) : (
                <Minus className="w-4 h-4 font-bold" />
              )}
            </div>
            <div>
              <span className="font-headline text-sm font-extrabold tracking-tight uppercase block leading-none">
                {analysis.bias} BIAS
              </span>
              <span className="text-[10px] text-on-surface-variant block font-mono mt-0.5">
                {symbol} · {timeframe}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`font-mono text-base font-bold block leading-none ${
                isBullish ? "text-primary" : isBearish ? "text-bearish" : "text-on-surface"
              }`}
            >
              {analysis.confluence.score}%
            </span>
            <span className="text-[9px] text-on-surface-variant block font-body uppercase tracking-wider mt-0.5">
              Confluence
            </span>
          </div>
        </div>

        {/* Meter Progress Bar */}
        <div className="w-full bg-surface-container rounded-full h-2 mb-1.5 overflow-hidden border border-outline">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isBullish
                ? "bg-gradient-to-r from-primary to-emerald-400 glow-primary-sm"
                : isBearish
                ? "bg-gradient-to-r from-bearish to-rose-400"
                : "bg-on-surface-variant/50"
            }`}
            style={{ width: `${analysis.confluence.score}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
          <span>Status: {analysis.status}</span>
          <span className={isBullish ? "text-primary font-semibold" : isBearish ? "text-bearish font-semibold" : ""}>
            {analysis.confluence.score >= 70
              ? "High Conviction Setup"
              : analysis.confluence.score >= 40
              ? "Moderate Evidence"
              : "Low Conviction / Neutral"}
          </span>
        </div>
      </div>
    );
  };

  const renderKeyLevels = (levels: PriceLevel[]) => {
    if (levels.length === 0) return null;
    return (
      <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-outline/70 pb-2">
          <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface">
            Key Price Levels
          </span>
          {calculatedRR !== "N/A" && (
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
              R:R = {calculatedRR}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {levels.slice(0, 6).map((level, idx) => (
            <div
              key={idx}
              className={`bg-surface p-2 rounded border ${
                level.levelType === "invalidation"
                  ? "border-bearish/40"
                  : level.levelType === "target"
                  ? "border-primary/40"
                  : level.levelType === "order_block" || level.levelType === "fair_value_gap"
                  ? "border-gold/40"
                  : "border-outline"
              }`}
            >
              <span className="text-[10px] text-on-surface-variant uppercase block font-body font-medium truncate">
                {level.label}
              </span>
              <span
                className={`font-bold text-xs ${
                  level.levelType === "invalidation"
                    ? "text-bearish"
                    : level.levelType === "target"
                    ? "text-primary"
                    : level.levelType === "order_block" || level.levelType === "fair_value_gap"
                    ? "text-gold"
                    : "text-on-surface"
                }`}
              >
                {level.price}
              </span>
              <span className="text-[9px] text-on-surface-variant block mt-0.5 truncate">
                {level.evidence}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReasoning = (items: ReasoningItem[], title: string) => {
    if (items.length === 0) return null;
    return (
      <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
        <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface block">
          {title}
        </span>
        <div className="space-y-1.5 text-xs">
          {items.map((item, idx) => (
            <div key={idx} className="bg-surface p-2 rounded border border-outline/60 text-xs">
              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono mb-0.5">
                <span className="text-primary font-medium">{item.evidenceSource}</span>
                <span>{item.timeframe}</span>
              </div>
              <div className="font-semibold text-on-surface text-[11px]">
                {item.observation}
              </div>
              <div className="text-on-surface-variant text-[11px] mt-0.5">
                {item.interpretation}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Tab-specific content ──────────────────────────────────────────────────

  const renderSMCContent = () => {
    if (!analysis || !tabContent) return null;
    return (
      <>
        {renderBiasHero()}

        {/* Executive Summary */}
        <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-1">
          <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Market Structure Overview
          </span>
          <p className="text-xs text-on-surface leading-relaxed font-body">
            {analysis.summary}
          </p>
        </div>

        {renderKeyLevels(tabContent.smc.levels)}
        {renderReasoning(tabContent.smc.reasoning, "SMC Structure Notes")}
      </>
    );
  };

  const renderPatternsContent = () => {
    if (!analysis || !tabContent) return null;
    const patternItems = tabContent.patterns;
    return (
      <>
        {renderBiasHero()}

        {/* Pattern Summary */}
        <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-1">
          <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Chart Pattern Analysis
          </span>
          <p className="text-xs text-on-surface leading-relaxed font-body">
            {patternItems.reasoning.length > 0
              ? `${patternItems.reasoning.length} chart pattern observations identified. ${
                  patternItems.levels.length > 0
                    ? `Key structural levels at ${patternItems.levels.map((l) => l.price).join(", ")}.`
                    : ""
                }`
              : "No distinct classical patterns detected in the current visible range. Price action is evaluated through SMC and reversal lenses."}
          </p>
        </div>

        {renderKeyLevels(patternItems.levels)}
        {renderReasoning(patternItems.reasoning, "Pattern Observations")}

        {/* If no patterns found, show a helpful explanation */}
        {patternItems.reasoning.length === 0 && patternItems.levels.length === 0 && (
          <div className="bg-surface-container/40 border border-outline/60 rounded-lg p-4 text-center space-y-2">
            <BarChart3 className="w-6 h-6 text-on-surface-variant/40 mx-auto" />
            <p className="text-[11px] text-on-surface-variant font-body">
              No classical chart patterns (triangles, flags, H&S) were identified in this analysis. 
              Check the <span className="text-primary font-semibold cursor-pointer" onClick={() => onStrategyChange("smc")}>SMC</span> or{" "}
              <span className="text-primary font-semibold cursor-pointer" onClick={() => onStrategyChange("candlestick_reversals")}>Reversals</span> tabs for structural insights.
            </p>
          </div>
        )}
      </>
    );
  };

  const renderReversalsContent = () => {
    if (!analysis || !tabContent) return null;
    const reversalItems = tabContent.reversals;
    return (
      <>
        {renderBiasHero()}

        {/* Reversal Assessment */}
        <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
          <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Reversal Signal Assessment
          </span>
          <div className="flex items-center space-x-3">
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-headline font-bold ${
                isBullish
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : isBearish
                  ? "bg-bearish/10 border-bearish/40 text-bearish"
                  : "bg-surface-container border-outline text-on-surface-variant"
              }`}
            >
              {isBullish ? "Bullish Reversal Bias" : isBearish ? "Bearish Reversal Bias" : "No Clear Reversal"}
            </div>
            <span className="text-[10px] text-on-surface-variant font-mono">
              Confidence: {analysis.confluence.score}%
            </span>
          </div>
          <p className="text-xs text-on-surface leading-relaxed font-body">
            {analysis.summary}
          </p>
        </div>

        {/* Invalidation / Target levels */}
        {renderKeyLevels(reversalItems.levels)}

        {/* Primary Scenario (if available) */}
        {primaryScenario && (
          <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span>{primaryScenario.name}</span>
              </span>
              <span
                className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                  primaryScenario.direction === "bullish"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-bearish/10 text-bearish border-bearish/30"
                }`}
              >
                {primaryScenario.direction}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="bg-surface p-2 rounded border border-outline/70">
                <span className="text-[10px] font-medium text-on-surface-variant block uppercase">
                  Trigger Condition
                </span>
                <span className="text-on-surface text-xs font-body">{primaryScenario.trigger}</span>
              </div>
              <div className="bg-surface p-2 rounded border border-outline/70">
                <span className="text-[10px] font-medium text-on-surface-variant block uppercase">
                  Rationale
                </span>
                <span className="text-on-surface text-xs font-body">{primaryScenario.rationale}</span>
              </div>
            </div>
          </div>
        )}

        {renderReasoning(reversalItems.reasoning, "Reversal Notes")}

        {/* Limitations as invalidation notes */}
        {analysis.limitations.length > 0 && (
          <div className="bg-surface-container/60 border border-outline/80 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-400 font-headline text-[10px] uppercase font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Invalidation Notes</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-on-surface-variant pt-1 font-body">
              {analysis.limitations.map((limit, idx) => (
                <li key={idx}>{limit}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderConfluenceContent = () => {
    if (!analysis) return null;
    return (
      <>
        {renderBiasHero()}

        {/* Executive Summary */}
        <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-1">
          <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Market Overview
          </span>
          <p className="text-xs text-on-surface leading-relaxed font-body">
            {analysis.summary}
          </p>
        </div>

        {/* Confluence Factor Breakdown */}
        {analysis.confluence.factors.length > 0 && (
          <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2.5">
            <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface block">
              Confluence Factors ({analysis.confluence.score}%)
            </span>
            <div className="space-y-1.5 text-xs">
              {analysis.confluence.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2 bg-surface p-2 rounded border border-outline/60"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="leading-snug flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-on-surface block">
                        {factor.name}
                      </span>
                      <span className="font-mono text-[10px] text-primary">
                        +{factor.contribution} pts
                      </span>
                    </div>
                    <span className="text-on-surface-variant text-[11px]">
                      {factor.evidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All key levels */}
        {renderKeyLevels(analysis.keyLevels)}

        {/* Trade Plan */}
        {primaryScenario && (
          <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span>{primaryScenario.name}</span>
              </span>
              <span
                className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                  primaryScenario.direction === "bullish"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-bearish/10 text-bearish border-bearish/30"
                }`}
              >
                {primaryScenario.direction}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="bg-surface p-2 rounded border border-outline/70">
                <span className="text-[10px] font-medium text-on-surface-variant block uppercase">
                  Trigger Condition
                </span>
                <span className="text-on-surface text-xs font-body">
                  {primaryScenario.trigger}
                </span>
              </div>

              <div className="bg-surface p-2 rounded border border-outline/70">
                <span className="text-[10px] font-medium text-on-surface-variant block uppercase">
                  Technical Rationale
                </span>
                <span className="text-on-surface text-xs font-body">
                  {primaryScenario.rationale}
                </span>
              </div>
            </div>

            {/* Trade Ticket */}
            {tradePlan ? (
              <div className="bg-surface border border-outline rounded p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-on-surface-variant uppercase">
                    Trade Ticket
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                      tradePlan.direction === "bullish"
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-bearish/10 text-bearish border-bearish/30"
                    }`}
                  >
                    {tradePlan.direction} {tradePlan.orderType}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">
                      {tradePlan.orderType === "market" ? "Entry" : "Entry / Limit"}
                    </dt>
                    <dd className="font-mono text-on-surface">
                      {tradePlan.limitPrice != null && tradePlan.orderType !== "market"
                        ? tradePlan.limitPrice
                        : tradePlan.entryPrice}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">Stop Loss</dt>
                    <dd className="font-mono text-bearish">{tradePlan.stopLossPrice}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">Stop</dt>
                    <dd className="font-mono text-on-surface">
                      {tradePlan.stopDistancePips.toFixed(1)} pips
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">R:R at TP1</dt>
                    <dd
                      className={`font-mono ${
                        tradePlan.rr >= 2
                          ? "text-primary"
                          : tradePlan.rr >= 1
                            ? "text-on-surface"
                            : "text-bearish"
                      }`}
                    >
                      1 : {tradePlan.rr.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">Position Size</dt>
                    <dd className="font-mono text-on-surface font-semibold">
                      {tradePlan.lots.toFixed(2)} lots
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-on-surface-variant">Risk</dt>
                    <dd className="font-mono text-on-surface">
                      {tradePlan.riskAmount.toFixed(2)} ({tradePlan.riskPercent * 100}%)
                    </dd>
                  </div>
                </dl>

                {tradePlan.takeProfits.length > 0 && (
                  <ul className="space-y-1 border-t border-outline/60 pt-2">
                    {tradePlan.takeProfits.map((tp) => (
                      <li key={tp.label} className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-[11px] text-primary shrink-0">
                          {tp.label} {tp.price}
                        </span>
                        <span className="font-mono text-[10px] text-on-surface-variant shrink-0">
                          1:{tp.rr.toFixed(2)} · close {tp.closePercent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {tradePlan.warnings.length > 0 && (
                  <ul className="space-y-1 border-t border-outline/60 pt-2">
                    {tradePlan.warnings.map((warning) => (
                      <li key={warning} className="text-[10px] text-on-surface-variant flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-px text-warning" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {tradePlan.sizingLadder.length > 0 && (
                  <div className="border-t border-outline/60 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] uppercase text-on-surface-variant">
                        Lot size by account size
                      </span>
                      <span className="text-[9px] text-on-surface-variant">
                        at {(tradePlan.riskPercent * 100).toFixed(2)}% risk
                      </span>
                    </div>
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="text-on-surface-variant">
                          <th className="text-left font-normal pb-0.5">Account</th>
                          <th className="text-right font-normal pb-0.5">Lots</th>
                          <th className="text-right font-normal pb-0.5">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradePlan.sizingLadder.map((row) => {
                          const isYours = Math.abs(row.accountBalance - tradePlan.accountBalance) < 0.005;
                          return (
                            <tr
                              key={row.accountBalance}
                              className={
                                isYours
                                  ? "text-primary font-semibold"
                                  : row.tooSmall
                                    ? "text-on-surface-variant/50"
                                    : "text-on-surface"
                              }
                            >
                              <td className="py-0.5">
                                ${row.accountBalance.toLocaleString()}
                                {isYours && (
                                  <span className="text-[9px] ml-1 text-on-surface-variant">yours</span>
                                )}
                              </td>
                              <td className="text-right py-0.5">
                                {row.tooSmall ? "too small" : row.lots.toFixed(2)}
                              </td>
                              <td className="text-right py-0.5">
                                {row.tooSmall ? "—" : `$${row.riskAmount.toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-[9px] text-on-surface-variant/80 border-t border-outline/40 pt-1.5">
                  Sized from your {tradePlan.accountBalance.toLocaleString()} balance at{" "}
                  {(tradePlan.riskPercent * 100).toFixed(2)}% risk. Verify levels on your
                  broker before placing an order.
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-outline/60 rounded p-2 space-y-1">
                <span className="text-[10px] uppercase text-on-surface-variant block">
                  {riskProfile?.accountBalance ? "No executable plan" : "Lot size needs your account size"}
                </span>
                <p className="text-[11px] text-on-surface-variant">
                  {riskProfile?.accountBalance ? (
                    <>
                      This setup has no confirmed entry and structural stop, so no position size
                      can be derived. Treat it as a wait.
                    </>
                  ) : (
                    <>
                      Lot size is a function of your account balance, so it cannot be stated
                      without one. Add your balance and risk percentage in Settings, then re-run
                      this analysis to get a size and the full scaling ladder.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* All Reasoning */}
        {renderReasoning(analysis.reasoning, "Market Structure Notes")}

        {/* Limitations */}
        {analysis.limitations.length > 0 && (
          <div className="bg-surface-container/60 border border-outline/80 rounded-lg p-3 space-y-1 text-xs">
            <div className="flex items-center space-x-1.5 text-amber-400 font-headline text-[10px] uppercase font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Risk &amp; Invalidation Notes</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-on-surface-variant pt-1 font-body">
              {analysis.limitations.map((limit, idx) => (
                <li key={idx}>{limit}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderSignalsContent = () => {
    if (!analysis) return null;

    const tradeSetup = analysis.aiDrawings?.tradeSetup;
    const tradePlan = analysis.tradePlan;
    const primaryScenario = analysis.scenarios?.[0];

    const isLong =
      tradeSetup?.direction === "long" ||
      tradePlan?.direction === "bullish" ||
      primaryScenario?.direction === "bullish" ||
      analysis.bias === "bullish";

    const directionLabel = isLong ? "BUY / LONG" : "SELL / SHORT";
    const directionBadge = isLong
      ? "bg-bullish/15 border-bullish/40 text-bullish"
      : "bg-bearish/15 border-bearish/40 text-bearish";

    const entryPrice =
      tradeSetup?.entry ??
      (tradePlan?.limitPrice != null && tradePlan?.orderType !== "market"
        ? tradePlan.limitPrice
        : tradePlan?.entryPrice) ??
      primaryScenario?.entryPrice ??
      0;

    const stopLossPrice =
      tradeSetup?.stopLoss ??
      tradePlan?.stopLossPrice ??
      primaryScenario?.invalidationPrice ??
      0;

    const tp1 =
      tradeSetup?.tp1 ??
      tradePlan?.takeProfits?.[0]?.price ??
      primaryScenario?.targetPrices?.[0] ??
      0;

    const tp2 =
      tradeSetup?.tp2 ??
      tradePlan?.takeProfits?.[1]?.price ??
      primaryScenario?.targetPrices?.[1] ??
      null;

    const tp3 =
      tradeSetup?.tp3 ??
      tradePlan?.takeProfits?.[2]?.price ??
      primaryScenario?.targetPrices?.[2] ??
      null;

    const rrRatio = tradeSetup?.riskRewardRatio ?? tradePlan?.rr ?? 2.5;
    const stopDistance = Math.abs(entryPrice - stopLossPrice);

    const handleCopySignal = () => {
      const text = `[ApexSMC Signal]\nAsset: ${symbol} (${timeframe})\nDirection: ${directionLabel}\nEntry: ${entryPrice}\nStop Loss: ${stopLossPrice}\nTake Profit 1: ${tp1}\n${tp2 ? `Take Profit 2: ${tp2}\n` : ""}${tp3 ? `Take Profit 3: ${tp3}\n` : ""}Risk/Reward: 1:${rrRatio.toFixed(2)}\nPosition Size: ${tradePlan?.lots?.toFixed(2) ?? "0.05"} lots`;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedSignal(true);
        setTimeout(() => setCopiedSignal(false), 2500);
      }
    };

    return (
      <div className="space-y-3.5">
        {/* Signal Execution Hero Card */}
        <div className={`p-4 rounded-xl border relative overflow-hidden ${directionBadge}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping" />
              <span className="font-headline text-[10px] font-extrabold uppercase tracking-widest">
                Active Execution Signal
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase font-bold bg-surface/60 px-2 py-0.5 rounded border border-current">
              {tradePlan?.orderType?.toUpperCase() || "LIMIT / PULLBACK"}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <div>
              <h3 className="font-headline text-xl font-black tracking-tight">{directionLabel}</h3>
              <p className="text-[11px] font-mono opacity-80 mt-0.5">
                {symbol} · {timeframe} Timeframe
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-extrabold block">
                1 : {rrRatio.toFixed(2)}
              </span>
              <span className="text-[9px] uppercase tracking-wider opacity-80 block">
                Risk-Reward Ratio
              </span>
            </div>
          </div>

          {/* Sync status with chart */}
          <div className="mt-3 pt-2.5 border-t border-current/20 flex items-center justify-between text-[10px] font-body opacity-90">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marked on SMC Canvas Chart</span>
            </span>
            <span className="font-mono">{analysis.confluence.score}% Confluence</span>
          </div>
        </div>

        {/* Core Levels Grid (Entry, SL, TP) */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {/* Entry Level */}
          <div className="bg-surface p-3 rounded-lg border border-[#06B6D4]/50 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-headline font-bold uppercase tracking-wider text-[#06B6D4]">
                Entry Point
              </span>
              <span className="text-[9px] bg-[#06B6D4]/10 text-[#06B6D4] px-1.5 py-0.2 rounded font-bold uppercase">
                Chart Line (Cyan)
              </span>
            </div>
            <div className="text-base font-bold text-on-surface">
              {entryPrice !== 0 ? entryPrice : "At Market Trigger"}
            </div>
            <p className="text-[9px] text-on-surface-variant font-body mt-1">
              {primaryScenario?.trigger || "Institutional Order Block / FVG zone entry"}
            </p>
          </div>

          {/* Stop Loss Level */}
          <div className="bg-surface p-3 rounded-lg border border-bearish/50 shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-headline font-bold uppercase tracking-wider text-bearish">
                Stop Loss (SL)
              </span>
              <span className="text-[9px] bg-bearish/10 text-bearish px-1.5 py-0.2 rounded font-bold uppercase">
                Chart Line (Red)
              </span>
            </div>
            <div className="text-base font-bold text-bearish">
              {stopLossPrice !== 0 ? stopLossPrice : "Structural Low"}
            </div>
            <p className="text-[9px] text-on-surface-variant font-body mt-1">
              Distance: {stopDistance > 0 ? `${stopDistance.toFixed(2)} pts` : "Standard buffer"}
            </p>
          </div>

          {/* Take Profit Targets */}
          <div className="bg-surface-container border border-outline rounded-lg p-3 col-span-2 space-y-2">
            <div className="flex items-center justify-between border-b border-outline/60 pb-1.5">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-bullish flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-bullish" />
                <span>Take Profit Targets (TP)</span>
              </span>
              <span className="text-[9px] bg-bullish/10 text-bullish px-1.5 py-0.2 rounded font-bold uppercase">
                Chart Box (Green)
              </span>
            </div>

            <div className="space-y-2 pt-0.5">
              {/* TP1 */}
              <div className="flex items-center justify-between p-2 rounded bg-surface border border-outline/70">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-headline font-bold text-xs text-primary">TP 1 (Primary)</span>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold font-mono">
                      Close 50%
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-body">
                    Conservative target at nearest liquidity pool
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-on-surface font-mono">{tp1 !== 0 ? tp1 : "Next Swing"}</span>
                  <span className="text-[9px] text-primary block font-mono">1 : 1.5 R:R</span>
                </div>
              </div>

              {/* TP2 */}
              <div className="flex items-center justify-between p-2 rounded bg-surface border border-outline/70">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-headline font-bold text-xs text-bullish">TP 2 (Major)</span>
                    <span className="text-[9px] bg-bullish/10 text-bullish px-1.5 py-0.2 rounded font-semibold font-mono">
                      Close 30% · Move SL to BE
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-body">
                    Major structural high/low or HTF order block
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-on-surface font-mono">
                    {tp2 ?? (entryPrice && stopDistance ? (isLong ? (entryPrice + stopDistance * 2.8).toFixed(2) : (entryPrice - stopDistance * 2.8).toFixed(2)) : "HTF Target")}
                  </span>
                  <span className="text-[9px] text-bullish block font-mono">1 : 2.8 R:R</span>
                </div>
              </div>

              {/* TP3 */}
              <div className="flex items-center justify-between p-2 rounded bg-surface border border-outline/70">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-headline font-bold text-xs text-emerald-400">TP 3 (Runner)</span>
                    <span className="text-[9px] bg-emerald-400/10 text-emerald-400 px-1.5 py-0.2 rounded font-semibold font-mono">
                      Trailing Runner
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-body">
                    Macro expansion target for maximum trend capture
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-on-surface font-mono">
                    {tp3 ?? (entryPrice && stopDistance ? (isLong ? (entryPrice + stopDistance * 4.2).toFixed(2) : (entryPrice - stopDistance * 4.2).toFixed(2)) : "Macro Target")}
                  </span>
                  <span className="text-[9px] text-emerald-400 block font-mono">1 : 4.5+ R:R</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Position Sizing & Risk Management Card */}
        {tradePlan && (
          <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-outline/60 pb-1.5">
              <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface">
                Recommended Execution &amp; Sizing
              </span>
              <span className="font-mono text-[10px] text-primary font-bold">
                {tradePlan.lots.toFixed(2)} Lots Sized
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-surface p-2 rounded border border-outline/60">
                <span className="text-[9px] text-on-surface-variant uppercase block font-body">
                  Account Balance
                </span>
                <span className="font-bold text-on-surface">
                  ${tradePlan.accountBalance.toLocaleString()}
                </span>
              </div>
              <div className="bg-surface p-2 rounded border border-outline/60">
                <span className="text-[9px] text-on-surface-variant uppercase block font-body">
                  Risk Amount (SL)
                </span>
                <span className="font-bold text-bearish">
                  ${tradePlan.riskAmount.toFixed(2)} ({(tradePlan.riskPercent * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Copy Signal CTA Button */}
        <button
          onClick={handleCopySignal}
          className="w-full py-2.5 px-3 bg-surface hover:bg-surface-container border border-primary/50 text-primary font-headline text-xs font-bold uppercase rounded-lg flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer glow-primary-sm shadow"
        >
          {copiedSignal ? (
            <>
              <Check className="w-4 h-4 text-bullish" />
              <span className="text-bullish">Signal Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Complete Trade Signal (Entry, SL, TPs)</span>
            </>
          )}
        </button>
      </div>
    );
  };

  // ─── Tab content dispatcher ────────────────────────────────────────────────

  const renderTabContent = () => {
    switch (strategy) {
      case "smc":
        return renderSMCContent();
      case "chart_patterns":
        return renderPatternsContent();
      case "candlestick_reversals":
        return renderReversalsContent();
      case "signals":
        return renderSignalsContent();
      case "combined":
      default:
        return renderConfluenceContent();
    }
  };

  return (
    <section className="w-full xl:w-[420px] bg-surface flex flex-col shrink-0 overflow-y-auto custom-scrollbar border-l border-outline-variant select-none">
      {/* Intelligence Panel Header */}
      <div className="p-3.5 border-b border-outline-variant flex items-center justify-between bg-surface-container shrink-0">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
              Technical Analysis
            </h2>
            <div className="font-body text-[11px] text-on-surface-variant flex items-center space-x-1.5">
              <span>{symbol}</span>
              <span>·</span>
              <span>{timeframe}</span>
              {analysis && (
                <>
                  <span>·</span>
                  <span className="text-primary font-semibold">{analysis.bias.toUpperCase()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isAnalyzing}
          className="text-on-surface-variant hover:text-on-surface p-1 rounded disabled:opacity-40"
          title="Refresh Analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      <div className="p-3.5 space-y-4 flex-1">
        {/* Strategy Selector Tabs — pure view filters, no re-analysis */}
        <div className="bg-surface-container p-1 rounded-lg border border-outline grid grid-cols-5 gap-1 text-[11px] font-label font-medium text-center">
          {strategies.map((s) => {
            const isActive = s.id === strategy;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => onStrategyChange(s.id)}
                title={s.tooltip}
                className={`py-1.5 px-1 rounded transition-all flex flex-col items-center gap-0.5 ${
                  isActive
                    ? "bg-surface text-primary border border-primary/40 font-semibold glow-primary-sm shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px]">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State Animation */}
        {isAnalyzing && (
          <div className="bg-surface-container/60 border border-primary/30 rounded-lg p-5 text-center space-y-3 animate-pulse">
            <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 text-primary">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="font-headline text-sm font-bold text-on-surface uppercase tracking-wide">
                Analyzing Chart
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 font-body">
                Running full multi-factor analysis (SMC, Patterns, Reversals, Confluence)...
              </p>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden border border-outline">
              <div className="bg-primary h-1.5 rounded-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Empty State before any snapshot is requested */}
        {!isAnalyzing && !analysis && (
          <div className="bg-surface-container/40 border border-outline/60 rounded-lg p-5 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-surface-container-highest border border-outline text-on-surface-variant">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-headline text-sm font-bold text-on-surface">
                No Analysis Yet
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 font-body">
                Click{" "}
                <span className="text-primary font-semibold">Analyze Chart</span> above to run a full
                multi-factor analysis. Results will appear across all four tabs.
              </p>
            </div>
          </div>
        )}

        {/* Analysis Results — filtered by active tab */}
        {!isAnalyzing && analysis && renderTabContent()}

        {/* User Inquiry Bar */}
        <div className="bg-surface-container border border-outline rounded-lg p-3 space-y-2">
          <label className="font-headline text-[11px] font-bold uppercase tracking-wider text-on-surface flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-primary" />
              <span>Ask a Question</span>
            </span>
          </label>

          <form onSubmit={handleInquirySubmit} className="relative">
            <input
              type="text"
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              placeholder="Ask about this setup..."
              className="w-full bg-surface border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs py-2 pl-3 pr-14 text-on-surface placeholder:text-on-surface-variant/60 font-body transition-colors outline-none"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !inquiry.trim()}
              className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-primary text-on-primary font-bold text-xs rounded hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center space-x-1"
            >
              <Send className="w-3 h-3" />
              <span>Ask</span>
            </button>
          </form>

          {/* Quick Prompt Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setInquiry(prompt);
                  if (onRunInquiry) {
                    onRunInquiry(prompt);
                  }
                }}
                className="text-[10px] bg-surface hover:bg-surface-high border border-outline px-2 py-0.5 rounded text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
