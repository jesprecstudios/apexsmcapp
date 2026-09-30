import type { OHLCData } from "@/lib/charting/types";
import { CandleProvider, Quote } from "./types";
import { MarketDataUnavailableError } from "./twelve-data";

/**
 * Maps app symbol (e.g., "BTC/USD") to Binance public USDT pair (e.g., "BTCUSDT").
 */
function toBinanceSymbol(symbol: string): string | null {
  const clean = symbol.replace("/", "").toUpperCase();
  if (clean === "BTCUSD" || clean === "BTCUSDT") return "BTCUSDT";
  if (clean === "ETHUSD" || clean === "ETHUSDT") return "ETHUSDT";
  if (clean === "SOLUSD" || clean === "SOLUSDT") return "SOLUSDT";
  if (clean.endsWith("USD")) return `${clean}T`;
  return `${clean}USDT`;
}

function mapTimeframeToBinanceInterval(tf: string): string {
  switch (tf) {
    case "M1": return "1m";
    case "M5": return "5m";
    case "M15": return "15m";
    case "H1": return "1h";
    case "H4": return "4h";
    case "D1": return "1d";
    default: return "1h";
  }
}

/**
 * Free, public, no-key market data provider for Cryptocurrencies via Binance REST API.
 */
export class BinanceProvider implements CandleProvider {
  readonly name = "binance";

  get isConfigured(): boolean {
    return true;
  }

  async getCandles(params: {
    symbol: string;
    timeframe: string;
    count: number;
  }): Promise<OHLCData[]> {
    const binanceSymbol = toBinanceSymbol(params.symbol);
    if (!binanceSymbol) {
      throw new MarketDataUnavailableError(`Unsupported Binance symbol for ${params.symbol}`);
    }

    const interval = mapTimeframeToBinanceInterval(params.timeframe);
    const limit = Math.min(Math.max(params.count, 10), 500);

    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Binance returned HTTP ${res.status}`);
      }

      // Binance klines format: [openTime, open, high, low, close, volume, closeTime, ...]
      const data = (await res.json()) as Array<[number, string, string, string, string, string, ...unknown[]]>;
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No candle data returned from Binance for ${binanceSymbol}`);
      }

      const candles: OHLCData[] = data.map((item) => ({
        time: Math.floor(item[0] / 1000), // convert ms to unix seconds
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
      }));

      // Ensure ascending timestamps
      return candles.sort((a, b) => Number(a.time) - Number(b.time));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MarketDataUnavailableError(`Binance error: ${msg}`);
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const binanceSymbol = toBinanceSymbol(symbol);
    if (!binanceSymbol) return null;

    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        symbol,
        open: parseFloat(data.openPrice),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        close: parseFloat(data.lastPrice),
        changePct: parseFloat(data.priceChangePercent),
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
