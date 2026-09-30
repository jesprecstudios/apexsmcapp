import { OHLCData, SMCOverlayData } from "@/lib/charting/types";
import { deriveSMCOverlays } from "@/lib/charting/data-generator";

export interface QuickBiasResult {
  direction: "bullish" | "bearish" | "neutral";
  confidence: number; // 0–100
  label: string;
  reasoning: string[];
}

/**
 * Derives a directional bias from raw candle data + SMC structure
 * without calling any external API. Pure client-side heuristic.
 */
export function generateQuickBias(
  candles: OHLCData[],
  symbol: string
): QuickBiasResult {
  if (candles.length < 10) {
    return {
      direction: "neutral",
      confidence: 0,
      label: "Insufficient Data",
      reasoning: ["Not enough candles to determine bias."],
    };
  }

  const reasoning: string[] = [];
  let score = 0; // positive → bullish, negative → bearish

  // 1. EMA 20 / EMA 50 crossover bias
  const ema20 = computeEMA(candles.map((c) => c.close), 20);
  const ema50 = computeEMA(candles.map((c) => c.close), 50);
  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];

  if (lastEma20 > lastEma50) {
    score += 20;
    reasoning.push("EMA 20 above EMA 50 — short-term momentum is bullish.");
  } else if (lastEma20 < lastEma50) {
    score -= 20;
    reasoning.push("EMA 20 below EMA 50 — short-term momentum is bearish.");
  }

  // 2. Recent price action (last 5 candles)
  const recent = candles.slice(-5);
  const bullishCandles = recent.filter((c) => c.close > c.open).length;
  const bearishCandles = recent.filter((c) => c.close < c.open).length;

  if (bullishCandles >= 4) {
    score += 15;
    reasoning.push(`${bullishCandles}/5 recent candles are bullish.`);
  } else if (bearishCandles >= 4) {
    score -= 15;
    reasoning.push(`${bearishCandles}/5 recent candles are bearish.`);
  }

  // 3. Higher highs / higher lows vs lower highs / lower lows
  const last10 = candles.slice(-10);
  let higherHighs = 0;
  let lowerLows = 0;
  for (let i = 1; i < last10.length; i++) {
    if (last10[i].high > last10[i - 1].high) higherHighs++;
    if (last10[i].low < last10[i - 1].low) lowerLows++;
  }

  if (higherHighs >= 6) {
    score += 15;
    reasoning.push("Market printing higher highs — uptrend structure.");
  }
  if (lowerLows >= 6) {
    score -= 15;
    reasoning.push("Market printing lower lows — downtrend structure.");
  }

  // 4. SMC overlay signals
  const overlays: SMCOverlayData = deriveSMCOverlays(candles, symbol);

  const freshBullishOBs = overlays.orderBlocks.filter(
    (ob) => ob.type === "BULLISH" && !ob.mitigated
  );
  const freshBearishOBs = overlays.orderBlocks.filter(
    (ob) => ob.type === "BEARISH" && !ob.mitigated
  );

  if (freshBullishOBs.length > freshBearishOBs.length) {
    score += 10;
    reasoning.push(
      `${freshBullishOBs.length} unmitigated bullish Order Block(s) detected.`
    );
  } else if (freshBearishOBs.length > freshBullishOBs.length) {
    score -= 10;
    reasoning.push(
      `${freshBearishOBs.length} unmitigated bearish Order Block(s) detected.`
    );
  }

  // BOS direction
  const recentBOS = overlays.breaksOfStructure.slice(-3);
  const bullishBOS = recentBOS.filter((b) => b.direction === "BULLISH").length;
  const bearishBOS = recentBOS.filter((b) => b.direction === "BEARISH").length;

  if (bullishBOS > bearishBOS) {
    score += 15;
    reasoning.push("Recent Break of Structure confirms bullish continuation.");
  } else if (bearishBOS > bullishBOS) {
    score -= 15;
    reasoning.push("Recent Break of Structure confirms bearish continuation.");
  }

  // 5. Close relative to session range
  const lastClose = candles[candles.length - 1].close;
  const sessionHigh = Math.max(...last10.map((c) => c.high));
  const sessionLow = Math.min(...last10.map((c) => c.low));
  const range = sessionHigh - sessionLow;

  if (range > 0) {
    const position = (lastClose - sessionLow) / range;
    if (position > 0.7) {
      score += 10;
      reasoning.push("Price closing near session highs — buyers in control.");
    } else if (position < 0.3) {
      score -= 10;
      reasoning.push("Price closing near session lows — sellers in control.");
    }
  }

  // Compute direction and confidence
  const confidence = Math.min(Math.abs(score), 95);
  const direction: "bullish" | "bearish" | "neutral" =
    score > 10 ? "bullish" : score < -10 ? "bearish" : "neutral";

  const directionLabel =
    direction === "bullish"
      ? "BULLISH"
      : direction === "bearish"
        ? "BEARISH"
        : "NEUTRAL";

  return {
    direction,
    confidence,
    label: `${directionLabel} ${confidence}%`,
    reasoning,
  };
}

function computeEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}
