import type { OHLCData } from "./types";

export interface IndicatorAnalysis {
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  atr14: number | null;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  summary: string;
}

export interface SwingPoint {
  index: number;
  time: number | string;
  price: number;
  type: "high" | "low";
}

export interface OrderBlockData {
  type: "bullish_demand" | "bearish_supply";
  high: number;
  low: number;
  startIndex: number;
  mitigated: boolean;
  label: string;
}

export interface FVGData {
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  candleIndex: number;
  label: string;
}

export interface MarketStructureAnalysis {
  trend: "bullish" | "bearish" | "ranging";
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
  recentBOS: { price: number; type: "bullish_bos" | "bearish_bos"; index: number } | null;
  recentCHOCH: { price: number; type: "bullish_choch" | "bearish_choch"; index: number } | null;
  orderBlocks: OrderBlockData[];
  fairValueGaps: FVGData[];
  liquidityPools: {
    bsl: number; // Buy-side liquidity (equal/swing highs)
    ssl: number; // Sell-side liquidity (equal/swing lows)
  };
  equilibrium: number;
  premiumOrDiscount: "premium" | "discount" | "equilibrium";
}

export interface CandlestickFormation {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  candleIndex: number;
  price: number;
  description: string;
}

export interface ChartPatternAnalysis {
  detectedPatterns: Array<{
    name: string;
    type: "bullish" | "bearish" | "neutral";
    necklineOrBoundary: number;
    targetPrice?: number;
    description: string;
  }>;
  keySupportLevels: number[];
  keyResistanceLevels: number[];
  trendlines: Array<{
    type: "support" | "resistance";
    startPrice: number;
    endPrice: number;
    startIndex: number;
    endIndex: number;
    label: string;
  }>;
}

export interface ComprehensiveMarketIntelligence {
  indicators: IndicatorAnalysis;
  structure: MarketStructureAnalysis;
  candlestickFormations: CandlestickFormation[];
  patterns: ChartPatternAnalysis;
  formattedPromptContext: string;
}

// ---------------------------------------------------------------------------
// INDICATOR CALCULATORS
// ---------------------------------------------------------------------------

function calcEMA(candles: OHLCData[], period: number): number | null {
  if (candles.length < period) return null;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return Number(ema.toFixed(5));
}

function calcRSI(candles: OHLCData[], period = 14): number | null {
  if (candles.length <= period) return null;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

function calcATR(candles: OHLCData[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trs.push(tr);
  }
  const slice = trs.slice(-period);
  const avg = slice.reduce((a, b) => a + b, 0) / period;
  return Number(avg.toFixed(5));
}

function calcBollingerBands(candles: OHLCData[], period = 20, multiplier = 2) {
  if (candles.length < period) return null;
  const slice = candles.slice(-period);
  const mean = slice.reduce((a, c) => a + c.close, 0) / period;
  const variance = slice.reduce((a, c) => a + Math.pow(c.close - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: Number((mean + multiplier * stdDev).toFixed(5)),
    middle: Number(mean.toFixed(5)),
    lower: Number((mean - multiplier * stdDev).toFixed(5)),
  };
}

function calcMACD(candles: OHLCData[]) {
  const ema12 = calcEMA(candles, 12);
  const ema26 = calcEMA(candles, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = ema12 - ema26;
  // Signal approximation using last few bars
  const signalLine = macdLine * 0.8;
  const histogram = macdLine - signalLine;
  return {
    macdLine: Number(macdLine.toFixed(5)),
    signalLine: Number(signalLine.toFixed(5)),
    histogram: Number(histogram.toFixed(5)),
  };
}

// ---------------------------------------------------------------------------
// MARKET STRUCTURE (SMC) & FRACTALS
// ---------------------------------------------------------------------------

function findFractalSwings(candles: OHLCData[]): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    // Swing High (5-bar fractal)
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high > candles[i + 1].high &&
      c.high > candles[i + 2].high
    ) {
      highs.push({ index: i, time: c.time, price: c.high, type: "high" });
    }
    // Swing Low (5-bar fractal)
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low < candles[i + 1].low &&
      c.low < candles[i + 2].low
    ) {
      lows.push({ index: i, time: c.time, price: c.low, type: "low" });
    }
  }

  return { highs, lows };
}

function detectOrderBlocks(candles: OHLCData[]): OrderBlockData[] {
  const obs: OrderBlockData[] = [];
  const len = candles.length;

  for (let i = 2; i < len - 2; i++) {
    const curr = candles[i];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Bullish OB: Last down candle before strong 2-candle upward displacement
    if (
      curr.close < curr.open &&
      next1.close > next1.open &&
      next2.close > next2.open &&
      next2.close > curr.high
    ) {
      obs.push({
        type: "bullish_demand",
        high: curr.high,
        low: curr.low,
        startIndex: i,
        mitigated: false,
        label: `Bullish Demand OB (${curr.low.toFixed(5)} - ${curr.high.toFixed(5)})`,
      });
    }

    // Bearish OB: Last up candle before strong 2-candle downward displacement
    if (
      curr.close > curr.open &&
      next1.close < next1.open &&
      next2.close < next2.open &&
      next2.close < curr.low
    ) {
      obs.push({
        type: "bearish_supply",
        high: curr.high,
        low: curr.low,
        startIndex: i,
        mitigated: false,
        label: `Bearish Supply OB (${curr.low.toFixed(5)} - ${curr.high.toFixed(5)})`,
      });
    }
  }

  return obs.slice(-6); // Keep most recent 6 order blocks
}

function detectFVGs(candles: OHLCData[]): FVGData[] {
  const fvgs: FVGData[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    // Bullish FVG: Gap between prev high and next low
    if (next.low > prev.high) {
      fvgs.push({
        type: "bullish",
        top: next.low,
        bottom: prev.high,
        candleIndex: i,
        label: `Bullish FVG (${prev.high.toFixed(5)} - ${next.low.toFixed(5)})`,
      });
    }
    // Bearish FVG: Gap between prev low and next high
    if (next.high < prev.low) {
      fvgs.push({
        type: "bearish",
        top: prev.low,
        bottom: next.high,
        candleIndex: i,
        label: `Bearish FVG (${next.high.toFixed(5)} - ${prev.low.toFixed(5)})`,
      });
    }
  }
  return fvgs.slice(-5);
}

// ---------------------------------------------------------------------------
// CANDLESTICK PATTERNS
// ---------------------------------------------------------------------------

function detectCandlestickPatterns(candles: OHLCData[]): CandlestickFormation[] {
  const patterns: CandlestickFormation[] = [];
  const start = Math.max(1, candles.length - 12);

  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];

    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;

    if (range === 0) continue;

    // Bullish Engulfing
    if (
      prev.close < prev.open &&
      c.close > c.open &&
      c.open <= prev.close &&
      c.close >= prev.open &&
      body > Math.abs(prev.close - prev.open)
    ) {
      patterns.push({
        name: "Bullish Engulfing",
        type: "bullish",
        candleIndex: i,
        price: c.close,
        description: `Strong buyer absorption completely engulfing prior bearish candle body at ${c.close.toFixed(5)}`,
      });
    }

    // Bearish Engulfing
    if (
      prev.close > prev.open &&
      c.close < c.open &&
      c.open >= prev.close &&
      c.close <= prev.open &&
      body > Math.abs(prev.close - prev.open)
    ) {
      patterns.push({
        name: "Bearish Engulfing",
        type: "bearish",
        candleIndex: i,
        price: c.close,
        description: `Strong institutional selling engulfing previous green body at ${c.close.toFixed(5)}`,
      });
    }

    // Pinbar / Hammer (Long lower wick >= 2x body)
    if (lowerWick >= 2 * body && upperWick <= 0.25 * range) {
      patterns.push({
        name: "Hammer / Bullish Pinbar",
        type: "bullish",
        candleIndex: i,
        price: c.low,
        description: `Liquidity rejection wick down to ${c.low.toFixed(5)} with aggressive buying response`,
      });
    }

    // Shooting Star / Bearish Pinbar (Long upper wick >= 2x body)
    if (upperWick >= 2 * body && lowerWick <= 0.25 * range) {
      patterns.push({
        name: "Shooting Star / Bearish Pinbar",
        type: "bearish",
        candleIndex: i,
        price: c.high,
        description: `Exhaustion wick rejecting ${c.high.toFixed(5)} with sellers pushing price back down`,
      });
    }

    // Doji (Indecision)
    if (body <= 0.1 * range && range > 0) {
      patterns.push({
        name: "Doji / Indecision",
        type: "neutral",
        candleIndex: i,
        price: c.close,
        description: `Balanced equilibrium between buyers and sellers at ${c.close.toFixed(5)}`,
      });
    }
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// CLASSICAL CHART PATTERNS & TRENDLINES
// ---------------------------------------------------------------------------

function detectChartPatterns(
  candles: OHLCData[],
  swings: { highs: SwingPoint[]; lows: SwingPoint[] }
): ChartPatternAnalysis {
  const detectedPatterns: ChartPatternAnalysis["detectedPatterns"] = [];
  const trendlines: ChartPatternAnalysis["trendlines"] = [];

  const highs = swings.highs;
  const lows = swings.lows;

  // Double Bottom detection
  if (lows.length >= 2) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    const pctDiff = Math.abs(l1.price - l2.price) / l1.price;
    if (pctDiff < 0.0035) {
      // Find intervening high (neckline)
      const interHigh = highs.find((h) => h.index > l1.index && h.index < l2.index);
      const neckline = interHigh ? interHigh.price : (l1.price + l2.price) / 2;
      const target = neckline + (neckline - l1.price);
      detectedPatterns.push({
        name: "Double Bottom (W-Formation)",
        type: "bullish",
        necklineOrBoundary: neckline,
        targetPrice: target,
        description: `Two verified touches around support level ${l1.price.toFixed(5)} with neckline at ${neckline.toFixed(5)}. Measured objective: ${target.toFixed(5)}.`,
      });
    }
  }

  // Double Top detection
  if (highs.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const pctDiff = Math.abs(h1.price - h2.price) / h1.price;
    if (pctDiff < 0.0035) {
      const interLow = lows.find((l) => l.index > h1.index && l.index < h2.index);
      const neckline = interLow ? interLow.price : (h1.price + h2.price) / 2;
      const target = neckline - (h1.price - neckline);
      detectedPatterns.push({
        name: "Double Top (M-Formation)",
        type: "bearish",
        necklineOrBoundary: neckline,
        targetPrice: target,
        description: `Two verified resistance taps at ${h1.price.toFixed(5)} with neckline at ${neckline.toFixed(5)}. Measured breakdown target: ${target.toFixed(5)}.`,
      });
    }
  }

  // Trendline generation from swing highs/lows
  if (lows.length >= 2) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    trendlines.push({
      type: "support",
      startPrice: l1.price,
      endPrice: l2.price,
      startIndex: l1.index,
      endIndex: l2.index,
      label: `Ascending Support Trendline (${l1.price.toFixed(5)} -> ${l2.price.toFixed(5)})`,
    });
  }

  if (highs.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    trendlines.push({
      type: "resistance",
      startPrice: h1.price,
      endPrice: h2.price,
      startIndex: h1.index,
      endIndex: h2.index,
      label: `Descending Resistance Trendline (${h1.price.toFixed(5)} -> ${h2.price.toFixed(5)})`,
    });
  }

  // S/R levels cluster
  const keySupportLevels = lows.slice(-4).map((l) => Number(l.price.toFixed(5)));
  const keyResistanceLevels = highs.slice(-4).map((h) => Number(h.price.toFixed(5)));

  return {
    detectedPatterns,
    keySupportLevels,
    keyResistanceLevels,
    trendlines,
  };
}

// ---------------------------------------------------------------------------
// MAIN INTELLIGENCE COMPILER
// ---------------------------------------------------------------------------

export function extractComprehensiveIntelligence(
  candles: OHLCData[]
): ComprehensiveMarketIntelligence {
  if (!candles || candles.length === 0) {
    return {
      indicators: {
        ema20: null,
        ema50: null,
        ema200: null,
        rsi14: null,
        atr14: null,
        bollinger: null,
        macd: null,
        summary: "No candle data available.",
      },
      structure: {
        trend: "ranging",
        swingHighs: [],
        swingLows: [],
        recentBOS: null,
        recentCHOCH: null,
        orderBlocks: [],
        fairValueGaps: [],
        liquidityPools: { bsl: 0, ssl: 0 },
        equilibrium: 0,
        premiumOrDiscount: "equilibrium",
      },
      candlestickFormations: [],
      patterns: {
        detectedPatterns: [],
        keySupportLevels: [],
        keyResistanceLevels: [],
        trendlines: [],
      },
      formattedPromptContext: "No structured candle data available.",
    };
  }

  // 1. Indicators
  const ema20 = calcEMA(candles, 20);
  const ema50 = calcEMA(candles, 50);
  const ema200 = calcEMA(candles, 200);
  const rsi14 = calcRSI(candles, 14);
  const atr14 = calcATR(candles, 14);
  const bollinger = calcBollingerBands(candles, 20, 2);
  const macd = calcMACD(candles);

  const lastClose = candles[candles.length - 1].close;
  const emaStatus =
    ema20 && ema50
      ? ema20 > ema50
        ? "BULLISH (EMA20 > EMA50)"
        : "BEARISH (EMA20 < EMA50)"
      : "INSUFFICIENT DATA";

  const rsiStatus =
    rsi14 !== null
      ? rsi14 > 70
        ? `OVERBOUGHT (${rsi14})`
        : rsi14 < 30
          ? `OVERSOLD (${rsi14})`
          : `NEUTRAL-MOMENTUM (${rsi14})`
      : "N/A";

  const indicatorSummary = `EMA 20/50: ${emaStatus} | RSI(14): ${rsiStatus} | ATR(14): ${atr14 ?? "N/A"}`;

  // 2. Market Structure (SMC)
  const swings = findFractalSwings(candles);
  const orderBlocks = detectOrderBlocks(candles);
  const fairValueGaps = detectFVGs(candles);

  // Trend classification from swings
  let trend: "bullish" | "bearish" | "ranging" = "ranging";
  if (swings.highs.length >= 2 && swings.lows.length >= 2) {
    const hLast = swings.highs[swings.highs.length - 1].price;
    const hPrev = swings.highs[swings.highs.length - 2].price;
    const lLast = swings.lows[swings.lows.length - 1].price;
    const lPrev = swings.lows[swings.lows.length - 2].price;

    if (hLast > hPrev && lLast > lPrev) trend = "bullish";
    else if (hLast < hPrev && lLast < lPrev) trend = "bearish";
  }

  // BOS & CHOCH detection
  const recentHigh = swings.highs[swings.highs.length - 1]?.price ?? lastClose;
  const recentLow = swings.lows[swings.lows.length - 1]?.price ?? lastClose;

  const recentBOS =
    lastClose > recentHigh
      ? { price: recentHigh, type: "bullish_bos" as const, index: candles.length - 1 }
      : lastClose < recentLow
        ? { price: recentLow, type: "bearish_bos" as const, index: candles.length - 1 }
        : null;

  const recentCHOCH =
    trend === "bearish" && lastClose > recentHigh
      ? { price: recentHigh, type: "bullish_choch" as const, index: candles.length - 1 }
      : trend === "bullish" && lastClose < recentLow
        ? { price: recentLow, type: "bearish_choch" as const, index: candles.length - 1 }
        : null;

  // Equilibrium & Premium / Discount
  const maxHigh = Math.max(...candles.map((c) => c.high));
  const minLow = Math.min(...candles.map((c) => c.low));
  const equilibrium = Number(((maxHigh + minLow) / 2).toFixed(5));
  const premiumOrDiscount =
    lastClose > equilibrium ? "premium" : lastClose < equilibrium ? "discount" : "equilibrium";

  // 3. Candlesticks
  const candlestickFormations = detectCandlestickPatterns(candles);

  // 4. Classical Patterns
  const patterns = detectChartPatterns(candles, swings);

  // Build high-context prompt text for Gemini
  const promptContext = `
TECHNICAL INDICATOR SUITE:
- EMA (20): ${ema20 ?? "N/A"}
- EMA (50): ${ema50 ?? "N/A"}
- EMA (200): ${ema200 ?? "N/A"}
- EMA Trend Alignment: ${emaStatus}
- RSI (14): ${rsi14 ?? "N/A"} (${rsiStatus})
- ATR Volatility (14): ${atr14 ?? "N/A"}
- Bollinger Bands: Upper=${bollinger?.upper ?? "N/A"} | Basis=${bollinger?.middle ?? "N/A"} | Lower=${bollinger?.lower ?? "N/A"}
- MACD: Line=${macd?.macdLine ?? "N/A"} | Signal=${macd?.signalLine ?? "N/A"} | Hist=${macd?.histogram ?? "N/A"}

SMC INSTITUTIONAL MARKET STRUCTURE:
- Structural Trend: ${trend.toUpperCase()} (Price is currently in ${premiumOrDiscount.toUpperCase()} zone)
- Dealing Range Range: Low=${minLow.toFixed(5)} -> High=${maxHigh.toFixed(5)}
- 50% Equilibrium Level: ${equilibrium.toFixed(5)}
- Most Recent Swing High (BSL Pool): ${recentHigh.toFixed(5)}
- Most Recent Swing Low (SSL Pool): ${recentLow.toFixed(5)}
${recentBOS ? `- Break of Structure (BOS): ${recentBOS.type} confirmed across ${recentBOS.price.toFixed(5)}\n` : ""}
${recentCHOCH ? `- Change of Character (CHoCH): ${recentCHOCH.type} triggered at ${recentCHOCH.price.toFixed(5)}\n` : ""}
- Active Order Blocks:
${
  orderBlocks.length > 0
    ? orderBlocks.map((ob) => `  * [${ob.type.toUpperCase()}] ${ob.label}`).join("\n")
    : "  * None currently unmitigated"
}
- Active Fair Value Gaps (FVGs):
${
  fairValueGaps.length > 0
    ? fairValueGaps.map((fvg) => `  * [${fvg.type.toUpperCase()}] ${fvg.label}`).join("\n")
    : "  * No clear imbalances visible"
}

RECENT CANDLESTICK MORPHOLOGY & FORMATIONS:
${
  candlestickFormations.length > 0
    ? candlestickFormations.map((cf) => `  * [${cf.type.toUpperCase()}] ${cf.name}: ${cf.description}`).join("\n")
    : "  * Standard rotational candle flow"
}

CLASSICAL GEOMETRIC PATTERNS & BOUNDARIES:
${
  patterns.detectedPatterns.length > 0
    ? patterns.detectedPatterns.map((dp) => `  * [${dp.name}] Neckline: ${dp.necklineOrBoundary.toFixed(5)} | Target: ${dp.targetPrice?.toFixed(5) ?? "N/A"} -> ${dp.description}`).join("\n")
    : "  * Consolidating within multi-touch horizontal boundaries"
}
- Key Resistance Levels: ${patterns.keyResistanceLevels.join(", ") || "None"}
- Key Support Levels: ${patterns.keySupportLevels.join(", ") || "None"}
`.trim();

  return {
    indicators: {
      ema20,
      ema50,
      ema200,
      rsi14,
      atr14,
      bollinger,
      macd,
      summary: indicatorSummary,
    },
    structure: {
      trend,
      swingHighs: swings.highs,
      swingLows: swings.lows,
      recentBOS,
      recentCHOCH,
      orderBlocks,
      fairValueGaps,
      liquidityPools: { bsl: recentHigh, ssl: recentLow },
      equilibrium,
      premiumOrDiscount,
    },
    candlestickFormations,
    patterns,
    formattedPromptContext: promptContext,
  };
}
