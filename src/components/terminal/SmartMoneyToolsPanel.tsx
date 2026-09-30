"use client";

import { useMemo } from "react";
import {
  Layers,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Droplets,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { generateCandleData, deriveSMCOverlays } from "@/lib/charting/data-generator";

interface SmartMoneyToolsPanelProps {
  symbol: string;
  timeframe: string;
}

export default function SmartMoneyToolsPanel({ symbol, timeframe }: SmartMoneyToolsPanelProps) {
  const { overlays, candles } = useMemo(() => {
    const c = generateCandleData(symbol, timeframe, 70);
    return { overlays: deriveSMCOverlays(c, symbol), candles: c };
  }, [symbol, timeframe]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-headline font-bold text-sm text-on-surface">Smart Money Tools</h2>
          <p className="text-[10px] text-on-surface-variant font-body">
            {symbol} · {timeframe} · {overlays.orderBlocks.length + overlays.fairValueGaps.length + overlays.breaksOfStructure.length} structures detected
          </p>
        </div>
      </div>

      {/* Order Block Scanner */}
      <div className="space-y-2">
        <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>Order Block Scanner</span>
          <span className="ml-auto font-mono text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">
            {overlays.orderBlocks.length}
          </span>
        </h3>
        <div className="space-y-1.5">
          {overlays.orderBlocks.length === 0 ? (
            <p className="text-[11px] text-on-surface-variant p-3 bg-surface-container rounded-lg border border-outline text-center">
              No Order Blocks detected on current range.
            </p>
          ) : (
            overlays.orderBlocks.map((ob) => (
              <div
                key={ob.id}
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  ob.mitigated
                    ? "bg-surface-container border-outline/50 opacity-60"
                    : ob.type === "BULLISH"
                      ? "bg-bullish/5 border-bullish/30"
                      : "bg-bearish/5 border-bearish/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    {ob.type === "BULLISH" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-bullish" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-bearish" />
                    )}
                    <span className={`font-headline font-bold ${ob.type === "BULLISH" ? "text-bullish" : "text-bearish"}`}>
                      {ob.type} OB
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      ob.mitigated
                        ? "bg-on-surface-variant/20 text-on-surface-variant"
                        : "bg-bullish/20 text-bullish"
                    }`}
                  >
                    {ob.mitigated ? "MITIGATED" : "FRESH"}
                  </span>
                </div>
                <div className="font-mono text-on-surface-variant flex items-center space-x-3">
                  <span>
                    H: <span className="text-on-surface font-semibold">{ob.high.toFixed(2)}</span>
                  </span>
                  <span>
                    L: <span className="text-on-surface font-semibold">{ob.low.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fair Value Gap Scanner */}
      <div className="space-y-2">
        <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-gold" />
          <span>Fair Value Gaps</span>
          <span className="ml-auto font-mono text-[10px] bg-gold/15 text-gold px-1.5 py-0.5 rounded">
            {overlays.fairValueGaps.length}
          </span>
        </h3>
        <div className="space-y-1.5">
          {overlays.fairValueGaps.length === 0 ? (
            <p className="text-[11px] text-on-surface-variant p-3 bg-surface-container rounded-lg border border-outline text-center">
              No open Fair Value Gaps.
            </p>
          ) : (
            overlays.fairValueGaps.map((fvg) => (
              <div
                key={fvg.id}
                className={`p-3 rounded-lg border text-xs ${
                  fvg.type === "BULLISH"
                    ? "bg-bullish/5 border-bullish/20"
                    : "bg-bearish/5 border-bearish/20"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-headline font-bold ${fvg.type === "BULLISH" ? "text-bullish" : "text-bearish"}`}>
                    {fvg.type} FVG
                  </span>
                  <span className="font-mono text-on-surface-variant text-[10px]">
                    Fill Probability: <span className="text-gold font-semibold">{(55 + Math.random() * 30).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="font-mono text-on-surface-variant mt-1">
                  Range: <span className="text-on-surface">{fvg.low.toFixed(2)}</span> — <span className="text-on-surface">{fvg.high.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BOS / CHoCH Log */}
      <div className="space-y-2">
        <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-bullish" />
          <span>Structure Breaks</span>
          <span className="ml-auto font-mono text-[10px] bg-bullish/15 text-bullish px-1.5 py-0.5 rounded">
            {overlays.breaksOfStructure.length}
          </span>
        </h3>
        <div className="space-y-1">
          {overlays.breaksOfStructure.map((bos) => (
            <div
              key={bos.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container border border-outline/60 text-xs"
            >
              <div className="flex items-center space-x-2">
                {bos.direction === "BULLISH" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-bullish" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-bearish" />
                )}
                <span className="font-headline font-semibold text-on-surface">
                  {bos.type}
                </span>
                <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${bos.direction === "BULLISH" ? "bg-bullish/15 text-bullish" : "bg-bearish/15 text-bearish"}`}>
                  {bos.direction}
                </span>
              </div>
              <span className="font-mono text-on-surface-variant">
                @ {bos.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidity Pools */}
      <div className="space-y-2">
        <h3 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
          <Droplets className="w-3.5 h-3.5 text-primary" />
          <span>Liquidity Pools</span>
          <span className="ml-auto font-mono text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">
            {overlays.liquiditySweeps.length}
          </span>
        </h3>
        <div className="space-y-1">
          {overlays.liquiditySweeps.length === 0 ? (
            <p className="text-[11px] text-on-surface-variant p-3 bg-surface-container rounded-lg border border-outline text-center">
              No liquidity sweeps detected.
            </p>
          ) : (
            overlays.liquiditySweeps.map((ls) => (
              <div
                key={ls.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container border border-outline/60 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <Droplets className={`w-3.5 h-3.5 ${ls.type === "BSL" ? "text-bullish" : "text-bearish"}`} />
                  <span className="font-headline font-semibold text-on-surface">
                    {ls.type === "BSL" ? "Buy-Side Liquidity" : "Sell-Side Liquidity"}
                  </span>
                </div>
                <span className="font-mono text-on-surface-variant">
                  @ {ls.price.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
