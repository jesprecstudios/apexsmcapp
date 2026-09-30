"use client";

import { useMemo } from "react";
import { Droplets, Flame } from "lucide-react";
import { generateCandleData } from "@/lib/charting/data-generator";

interface LiquidityHeatmapPanelProps {
  symbol: string;
  timeframe: string;
}

interface HeatmapBucket {
  priceLevel: number;
  label: string;
  volumeWeight: number; // 0–1 normalized
  candleCount: number;
  type: "demand" | "supply" | "neutral";
}

export default function LiquidityHeatmapPanel({ symbol, timeframe }: LiquidityHeatmapPanelProps) {
  const { buckets, maxVolume, sessionHigh, sessionLow } = useMemo(() => {
    const candles = generateCandleData(symbol, timeframe, 70);

    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const range = high - low;
    const bucketCount = 16;
    const bucketSize = range / bucketCount;

    const rawBuckets: { price: number; volume: number; bullish: number; bearish: number }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketLow = low + i * bucketSize;
      const bucketHigh = bucketLow + bucketSize;
      let volume = 0;
      let bullish = 0;
      let bearish = 0;

      for (const c of candles) {
        const candleMid = (c.high + c.low) / 2;
        if (candleMid >= bucketLow && candleMid < bucketHigh) {
          volume += c.volume || 1000;
          if (c.close > c.open) bullish++;
          else bearish++;
        }
      }

      rawBuckets.push({
        price: (bucketLow + bucketHigh) / 2,
        volume,
        bullish,
        bearish,
      });
    }

    const maxVol = Math.max(...rawBuckets.map((b) => b.volume), 1);

    const mapped: HeatmapBucket[] = rawBuckets.map((b) => ({
      priceLevel: b.price,
      label: b.price.toFixed(2),
      volumeWeight: b.volume / maxVol,
      candleCount: b.bullish + b.bearish,
      type: b.bullish > b.bearish ? "demand" : b.bearish > b.bullish ? "supply" : "neutral",
    }));

    return {
      buckets: mapped.reverse(), // highest price at top
      maxVolume: maxVol,
      sessionHigh: high,
      sessionLow: low,
    };
  }, [symbol, timeframe]);

  const getHeatColor = (weight: number, type: string) => {
    if (weight > 0.75) return type === "demand" ? "bg-bullish/80" : "bg-bearish/80";
    if (weight > 0.5) return type === "demand" ? "bg-bullish/50" : "bg-bearish/50";
    if (weight > 0.25) return type === "demand" ? "bg-bullish/25" : "bg-bearish/25";
    return "bg-on-surface-variant/10";
  };

  const getTextColor = (weight: number, type: string) => {
    if (weight > 0.5) return type === "demand" ? "text-bullish" : "text-bearish";
    return "text-on-surface-variant";
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Droplets className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-headline font-bold text-sm text-on-surface">Liquidity Heatmap</h2>
          <p className="text-[10px] text-on-surface-variant font-body">
            {symbol} · Volume distribution across {buckets.length} price zones
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-[10px] font-body text-on-surface-variant">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-bullish/60" />
          <span>Demand (Buy Pressure)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded bg-bearish/60" />
          <span>Supply (Sell Pressure)</span>
        </div>
        <div className="flex items-center space-x-1">
          <Flame className="w-3 h-3 text-gold" />
          <span>High Activity</span>
        </div>
      </div>

      {/* Session Range */}
      <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant bg-surface-container rounded-lg px-3 py-2 border border-outline">
        <span>Session Low: <span className="text-bearish font-semibold">{sessionLow.toFixed(2)}</span></span>
        <span>Session High: <span className="text-bullish font-semibold">{sessionHigh.toFixed(2)}</span></span>
      </div>

      {/* Heatmap Bars */}
      <div className="space-y-1">
        {buckets.map((bucket, idx) => (
          <div
            key={idx}
            className="flex items-center space-x-2 group"
          >
            {/* Price Label */}
            <span className="w-20 text-right font-mono text-[10px] text-on-surface-variant shrink-0">
              {bucket.label}
            </span>

            {/* Bar */}
            <div className="flex-1 relative h-5 bg-surface-container rounded overflow-hidden border border-outline/40">
              <div
                className={`absolute inset-y-0 left-0 rounded transition-all duration-500 ${getHeatColor(bucket.volumeWeight, bucket.type)}`}
                style={{ width: `${Math.max(bucket.volumeWeight * 100, 2)}%` }}
              />
              {/* Intensity marker */}
              {bucket.volumeWeight > 0.7 && (
                <Flame className="absolute right-1 top-0.5 w-3.5 h-3.5 text-gold/80 animate-pulse" />
              )}
            </div>

            {/* Volume indicator */}
            <span className={`w-12 text-right font-mono text-[10px] font-semibold shrink-0 ${getTextColor(bucket.volumeWeight, bucket.type)}`}>
              {bucket.candleCount}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 rounded-lg bg-surface-container border border-outline space-y-1.5">
        <h4 className="font-headline font-bold text-xs text-on-surface">Concentration Summary</h4>
        <p className="text-[11px] text-on-surface-variant font-body leading-relaxed">
          {(() => {
            const hotZones = buckets.filter((b) => b.volumeWeight > 0.6);
            const demandHot = hotZones.filter((b) => b.type === "demand");
            const supplyHot = hotZones.filter((b) => b.type === "supply");
            if (demandHot.length > supplyHot.length) {
              return `Concentrated buy-side liquidity detected across ${demandHot.length} zone(s). Institutions may be accumulating at these levels.`;
            } else if (supplyHot.length > demandHot.length) {
              return `Heavy sell-side distribution across ${supplyHot.length} zone(s). Smart money distribution possible at these price levels.`;
            }
            return "Balanced liquidity distribution. No clear institutional bias from volume profile.";
          })()}
        </p>
      </div>
    </div>
  );
}
