import { getSymbolMeta } from "@/lib/charting/data-generator";
import type { OHLCData } from "@/lib/charting/types";
import { TwelveDataProvider } from "./twelve-data";
import { DerivProvider } from "./deriv";
import { BinanceProvider } from "./binance";
import { YahooFinanceProvider } from "./yahoo";

export { MarketDataUnavailableError } from "./twelve-data";

export interface LiveCandleResult {
  symbol: string;
  timeframe: string;
  candles: OHLCData[];
  provider: "twelvedata" | "deriv" | "binance" | "yahoo";
  fetchedAt: string;
}

const twelveData = new TwelveDataProvider();
const deriv = new DerivProvider();
const binance = new BinanceProvider();
const yahoo = new YahooFinanceProvider();

export function isSyntheticSymbol(symbol: string): boolean {
  return getSymbolMeta(symbol).category === "synthetic";
}

export function isCryptoSymbol(symbol: string): boolean {
  const meta = getSymbolMeta(symbol);
  return meta.category === "crypto" || symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("SOL");
}

/**
 * Resolves live candles for a symbol using a multi-tier institutional & public fallback chain:
 * 1. Synthetic Indices (V75, V100, Crash/Boom) -> Deriv Public WebSocket
 * 2. If TWELVE_DATA_API_KEY is configured -> Twelve Data API
 * 3. Crypto (BTC/USD, ETH/USD, etc.) -> Binance Public Live API
 * 4. Forex & Commodities (EUR/USD, GBP/USD, USD/JPY, Gold) -> Yahoo Finance Live API
 * 5. Automatic cross-fallback between providers if an upstream error occurs.
 */
export async function fetchLiveCandles(params: {
  symbol: string;
  timeframe: string;
  count?: number;
}): Promise<LiveCandleResult> {
  const count = Math.min(Math.max(params.count ?? 100, 10), 500);
  const symbol = params.symbol;
  const meta = getSymbolMeta(symbol);

  // 1. Deriv Synthetics
  if (isSyntheticSymbol(symbol)) {
    const candles = await deriv.getCandles({ symbol, timeframe: params.timeframe, count });
    return {
      symbol: meta.symbol,
      timeframe: params.timeframe,
      candles,
      provider: "deriv",
      fetchedAt: new Date().toISOString(),
    };
  }

  // 2. Twelve Data (if user configured TWELVE_DATA_API_KEY)
  if (twelveData.isConfigured) {
    try {
      const candles = await twelveData.getCandles({ symbol, timeframe: params.timeframe, count });
      return {
        symbol: meta.symbol,
        timeframe: params.timeframe,
        candles,
        provider: "twelvedata",
        fetchedAt: new Date().toISOString(),
      };
    } catch (twelveErr) {
      console.warn("Twelve Data failed, falling back to public feed:", twelveErr);
    }
  }

  // 3. Crypto via Binance Public API
  if (isCryptoSymbol(symbol)) {
    try {
      const candles = await binance.getCandles({ symbol, timeframe: params.timeframe, count });
      return {
        symbol: meta.symbol,
        timeframe: params.timeframe,
        candles,
        provider: "binance",
        fetchedAt: new Date().toISOString(),
      };
    } catch (binanceErr) {
      console.warn("Binance failed, trying Yahoo Finance:", binanceErr);
    }
  }

  // 4. Forex & Commodities via Yahoo Finance Public API
  try {
    const candles = await yahoo.getCandles({ symbol, timeframe: params.timeframe, count });
    return {
      symbol: meta.symbol,
      timeframe: params.timeframe,
      candles,
      provider: "yahoo",
      fetchedAt: new Date().toISOString(),
    };
  } catch (yahooErr) {
    // If crypto and Yahoo failed, or forex failed, try Binance as last resort for crypto
    if (isCryptoSymbol(symbol)) {
      const candles = await binance.getCandles({ symbol, timeframe: params.timeframe, count });
      return {
        symbol: meta.symbol,
        timeframe: params.timeframe,
        candles,
        provider: "binance",
        fetchedAt: new Date().toISOString(),
      };
    }
    throw yahooErr;
  }
}

/**
 * Which providers are usable right now.
 */
export function marketDataReadiness(): {
  twelvedata: boolean;
  deriv: boolean;
  binance: boolean;
  yahoo: boolean;
} {
  return {
    twelvedata: twelveData.isConfigured,
    deriv: deriv.isConfigured,
    binance: binance.isConfigured,
    yahoo: yahoo.isConfigured,
  };
}
