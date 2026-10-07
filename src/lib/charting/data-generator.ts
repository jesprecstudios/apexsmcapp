import { OHLCData, SMCOverlayData } from "./types";

export type MarketCategory = "forex" | "metals" | "crypto" | "synthetic";

export interface SymbolMeta {
  symbol: string;
  name: string;
  category: MarketCategory;
  categoryLabel: string;
  derivSymbol?: string;
  basePrice: number;
  pipFactor: number;
  volatility: number;
  spread: number;
  decimals: number;
  syntheticType?: "continuous" | "crash" | "boom" | "jump";
  description: string;
}

export const SYMBOL_CATALOG: Record<string, SymbolMeta> = {
  // Deriv Synthetic Indices (24/7/365 Non-Stop Markets)
  "V75": {
    symbol: "V75",
    name: "Volatility 75 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "R_75",
    basePrice: 325480.0,
    pipFactor: 1.0,
    volatility: 1250.0,
    spread: 12.0,
    decimals: 2,
    syntheticType: "continuous",
    description: "Deriv flagship 75% constant volatility index with wide institutional swings.",
  },
  "V100": {
    symbol: "V100",
    name: "Volatility 100 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "R_100",
    basePrice: 2140.5,
    pipFactor: 0.1,
    volatility: 18.5,
    spread: 1.8,
    decimals: 2,
    syntheticType: "continuous",
    description: "High-speed 100% constant volatility synthetic index for aggressive SMC setups.",
  },
  "V25": {
    symbol: "V25",
    name: "Volatility 25 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "R_25",
    basePrice: 2420.8,
    pipFactor: 0.01,
    volatility: 6.5,
    spread: 0.8,
    decimals: 2,
    syntheticType: "continuous",
    description: "Smooth 25% volatility synthetic index with balanced order flow.",
  },
  "V10": {
    symbol: "V10",
    name: "Volatility 10 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "R_10",
    basePrice: 7850.25,
    pipFactor: 0.001,
    volatility: 5.2,
    spread: 0.5,
    decimals: 3,
    syntheticType: "continuous",
    description: "Consistent 10% constant volatility index tailored for long-term SMC trend riders.",
  },
  "CRASH1000": {
    symbol: "CRASH1000",
    name: "Crash 1000 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    // No underscore: verified against Deriv's live active_symbols feed.
    derivSymbol: "CRASH1000",
    basePrice: 1120.4,
    pipFactor: 0.1,
    volatility: 6.0,
    spread: 1.2,
    decimals: 2,
    syntheticType: "crash",
    description: "Steadily climbs upward with an average of one sudden sharp crash drop every 1000 ticks.",
  },
  "CRASH500": {
    symbol: "CRASH500",
    name: "Crash 500 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "CRASH500",
    basePrice: 4250.0,
    pipFactor: 0.1,
    volatility: 8.0,
    spread: 1.5,
    decimals: 2,
    syntheticType: "crash",
    description: "Steadily climbs upward with an average of one sudden sharp crash drop every 500 ticks.",
  },
  "BOOM1000": {
    symbol: "BOOM1000",
    name: "Boom 1000 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    // No underscore: verified against Deriv's live active_symbols feed.
    derivSymbol: "BOOM1000",
    basePrice: 1085.6,
    pipFactor: 0.1,
    volatility: 6.0,
    spread: 1.2,
    decimals: 2,
    syntheticType: "boom",
    description: "Steadily crawls downward with an average of one explosive upward boom spike every 1000 ticks.",
  },
  "BOOM500": {
    symbol: "BOOM500",
    name: "Boom 500 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "BOOM500",
    basePrice: 3820.0,
    pipFactor: 0.1,
    volatility: 8.0,
    spread: 1.5,
    decimals: 2,
    syntheticType: "boom",
    description: "Steadily crawls downward with an average of one explosive upward boom spike every 500 ticks.",
  },
  "JUMP75": {
    symbol: "JUMP75",
    name: "Jump 75 Index",
    category: "synthetic",
    categoryLabel: "Deriv Synthetics",
    derivSymbol: "JD75",
    basePrice: 4620.0,
    pipFactor: 0.1,
    volatility: 22.0,
    spread: 2.0,
    decimals: 2,
    syntheticType: "jump",
    description: "Equal-probability jump index with constant 75% volatility and discrete price steps.",
  },

  // Traditional Markets
  "EUR/USD": {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    category: "forex",
    categoryLabel: "Forex Major",
    basePrice: 1.08642,
    pipFactor: 0.0001,
    volatility: 0.0008,
    spread: 0.6,
    decimals: 5,
    description: "Major currency pair with tight liquidity spreads and heavy London/NY volume.",
  },
  "GBP/USD": {
    symbol: "GBP/USD",
    name: "British Pound / USD",
    category: "forex",
    categoryLabel: "Forex Major",
    basePrice: 1.2941,
    pipFactor: 0.0001,
    volatility: 0.0012,
    spread: 0.8,
    decimals: 5,
    description: "British Cable with pronounced session liquidity sweeps.",
  },
  "USD/JPY": {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    category: "forex",
    categoryLabel: "Forex Major",
    basePrice: 154.32,
    pipFactor: 0.01,
    volatility: 0.15,
    spread: 0.9,
    decimals: 3,
    description: "Asian session volume driver with clean trend continuation.",
  },
  "XAU/USD": {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    category: "metals",
    categoryLabel: "Precious Metals",
    basePrice: 2734.5,
    pipFactor: 0.1,
    volatility: 4.5,
    spread: 1.5,
    decimals: 2,
    description: "Spot Gold with aggressive supply/demand imbalances and high volatility.",
  },
  "BTC/USD": {
    symbol: "BTC/USD",
    name: "Bitcoin / USD",
    category: "crypto",
    categoryLabel: "Cryptocurrency",
    basePrice: 68450.0,
    pipFactor: 1.0,
    volatility: 180.0,
    spread: 4.0,
    decimals: 2,
    description: "Leading crypto asset traded 24/7 with heavy institutional ETF flows.",
  },
};

/**
 * Normalizes symbol lookup to support "EUR/USD", "EURUSD", "V75", "CRASH1000", "Crash 1000", "R_75", etc.
 */
export function getSymbolMeta(symbol: string): SymbolMeta {
  if (!symbol) return SYMBOL_CATALOG["V75"];
  if (SYMBOL_CATALOG[symbol]) return SYMBOL_CATALOG[symbol];

  const cleaned = symbol.replace(/[\/\-_\s]/g, "").toUpperCase();
  for (const key of Object.keys(SYMBOL_CATALOG)) {
    const item = SYMBOL_CATALOG[key];
    const keyCleaned = key.replace(/[\/\-_\s]/g, "").toUpperCase();
    if (keyCleaned === cleaned) return item;
    if (item.derivSymbol?.replace(/[\/\-_\s]/g, "").toUpperCase() === cleaned) {
      return item;
    }
    const nameCleaned = item.name.replace(/[\/\-_\s]/g, "").toUpperCase();
    if (nameCleaned === cleaned || nameCleaned.includes(cleaned)) {
      return item;
    }
  }

  return SYMBOL_CATALOG["V75"];
}

/**
 * Generates realistic candlestick data for the given symbol and timeframe.
 * Supports both Traditional (Forex/Metals/Crypto) and Deriv Synthetic Indices
 * (Continuous Volatility, Crash 1000 drop dynamics, Boom 1000 spike dynamics).
 */
export function generateCandleData(
  symbol = "V75",
  timeframe = "H1",
  count = 60
): OHLCData[] {
  const meta = getSymbolMeta(symbol);
  const candles: OHLCData[] = [];

  let currentPrice = meta.basePrice;
  const now = new Date();

  // Time increment in minutes
  let minuteStep = 60;
  if (timeframe === "M1") minuteStep = 1;
  else if (timeframe === "M5") minuteStep = 5;
  else if (timeframe === "M15") minuteStep = 15;
  else if (timeframe === "H1") minuteStep = 60;
  else if (timeframe === "H4") minuteStep = 240;
  else if (timeframe === "D1") minuteStep = 1440;

  const stepMs = minuteStep * 60 * 1000;
  const latestCandleTimeMs = Math.floor(now.getTime() / stepMs) * stepMs;

  for (let i = 0; i < count; i++) {
    // Strictly monotonically increasing time in UTC seconds (required by Lightweight Charts)
    const candleTimeMs = latestCandleTimeMs - (count - 1 - i) * stepMs;
    const unixSeconds = Math.floor(candleTimeMs / 1000);

    let change = 0;
    let highWickExtra = 0;
    let lowWickExtra = 0;

    if (meta.syntheticType === "crash") {
      // Crash 1000: Upward tick crawl interrupted by sudden Poisson downward drops
      const isCrash = Math.random() < 0.12; // ~12% probability of crash candle
      if (isCrash) {
        // Severe drop candle
        change = -(meta.volatility * (2.8 + Math.random() * 3.5));
        highWickExtra = meta.volatility * 0.2;
        lowWickExtra = meta.volatility * 0.4;
      } else {
        // Steady upward crawl
        change = meta.volatility * (0.3 + Math.random() * 0.5);
        highWickExtra = meta.volatility * 0.3;
        lowWickExtra = meta.volatility * 0.2;
      }
    } else if (meta.syntheticType === "boom") {
      // Boom 1000: Downward crawl interrupted by sudden Poisson upward spikes
      const isBoom = Math.random() < 0.12; // ~12% probability of boom candle
      if (isBoom) {
        // Explosive upward rocket candle
        change = meta.volatility * (2.8 + Math.random() * 3.5);
        highWickExtra = meta.volatility * 0.4;
        lowWickExtra = meta.volatility * 0.2;
      } else {
        // Steady downward crawl
        change = -(meta.volatility * (0.3 + Math.random() * 0.5));
        highWickExtra = meta.volatility * 0.2;
        lowWickExtra = meta.volatility * 0.3;
      }
    } else if (meta.syntheticType === "jump") {
      // Jump 75: Constant volatility with discrete price gap jumps
      const isJump = Math.random() < 0.1;
      const jumpDelta = isJump ? (Math.random() > 0.5 ? 1 : -1) * meta.volatility * 2.5 : 0;
      const drift = (meta.basePrice - currentPrice) * 0.04;
      change = (Math.random() - 0.5) * meta.volatility * 2.0 + jumpDelta + drift;
      highWickExtra = Math.random() * meta.volatility * 0.7;
      lowWickExtra = Math.random() * meta.volatility * 0.7;
    } else {
      // Standard continuous volatility (V75, V100, EUR/USD, Gold)
      // Balanced mean-reverting oscillation around basePrice so price spans both
      // Discount and Premium zones organically without permanent sell bias.
      const drift = (meta.basePrice - currentPrice) * 0.04;
      change = (Math.random() - 0.5) * meta.volatility * 2.0 + drift;
      highWickExtra = Math.random() * meta.volatility * 0.8;
      lowWickExtra = Math.random() * meta.volatility * 0.8;
    }

    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + highWickExtra;
    const low = Math.min(open, close) - lowWickExtra;
    const volume = Math.floor(1000 + Math.random() * 9500);

    candles.push({
      time: unixSeconds,
      open: parseFloat(open.toFixed(meta.decimals)),
      high: parseFloat(high.toFixed(meta.decimals)),
      low: parseFloat(low.toFixed(meta.decimals)),
      close: parseFloat(close.toFixed(meta.decimals)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Derives SMC zones (Order Blocks, FVGs, BOS, Sweeps) from the candle series
 * calibrated to traditional and synthetic indices volatility.
 */
export function deriveSMCOverlays(candles: OHLCData[], symbol = "V75"): SMCOverlayData {
  const meta = getSymbolMeta(symbol);
  const currentPrice = candles[candles.length - 1]?.close || meta.basePrice;

  return {
    orderBlocks: [
      {
        id: "ob-bull-1",
        type: "BULLISH",
        high: parseFloat((currentPrice - meta.volatility * 1.5).toFixed(meta.decimals)),
        low: parseFloat((currentPrice - meta.volatility * 2.5).toFixed(meta.decimals)),
        startIndex: Math.max(0, candles.length - 25),
        endIndex: candles.length - 1,
        mitigated: false,
      },
      {
        id: "ob-bear-1",
        type: "BEARISH",
        high: parseFloat((currentPrice + meta.volatility * 2.5).toFixed(meta.decimals)),
        low: parseFloat((currentPrice + meta.volatility * 1.5).toFixed(meta.decimals)),
        startIndex: Math.max(0, candles.length - 35),
        endIndex: candles.length - 10,
        mitigated: false,
      },
    ],
    fairValueGaps: [
      {
        id: "fvg-bull-1",
        type: "BULLISH",
        high: parseFloat((currentPrice - meta.volatility * 0.8).toFixed(meta.decimals)),
        low: parseFloat((currentPrice - meta.volatility * 1.4).toFixed(meta.decimals)),
        time: String(candles[candles.length - 12]?.time || ""),
      },
      {
        id: "fvg-bear-1",
        type: "BEARISH",
        high: parseFloat((currentPrice + meta.volatility * 1.4).toFixed(meta.decimals)),
        low: parseFloat((currentPrice + meta.volatility * 0.8).toFixed(meta.decimals)),
        time: String(candles[candles.length - 18]?.time || ""),
      },
    ],
    breaksOfStructure: [
      {
        id: "bos-1",
        price: parseFloat((currentPrice + meta.volatility * 2.0).toFixed(meta.decimals)),
        type: "BOS",
        direction: "BULLISH",
        time: String(candles[candles.length - 8]?.time || ""),
      },
      {
        id: "bos-2",
        price: parseFloat((currentPrice - meta.volatility * 2.0).toFixed(meta.decimals)),
        type: "BOS",
        direction: "BEARISH",
        time: String(candles[candles.length - 14]?.time || ""),
      },
    ],
    liquiditySweeps: [
      {
        id: "liq-sweep-1",
        price: parseFloat((currentPrice + meta.volatility * 3.0).toFixed(meta.decimals)),
        type: "BSL",
        time: String(candles[candles.length - 20]?.time || ""),
      },
      {
        id: "liq-sweep-2",
        price: parseFloat((currentPrice - meta.volatility * 3.0).toFixed(meta.decimals)),
        type: "SSL",
        time: String(candles[candles.length - 26]?.time || ""),
      },
    ],
  };
}
