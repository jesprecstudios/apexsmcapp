import type { OHLCData } from "@/lib/charting/types";
import { CandleProvider, Quote } from "./types";
import { MarketDataUnavailableError } from "./twelve-data";

function toYahooTicker(symbol: string): string {
  const clean = symbol.replace("/", "").toUpperCase();
  if (clean === "XAUUSD" || clean === "GOLD") return "GC=F";
  if (clean.length === 6) {
    // Forex pair: EURUSD=X, GBPUSD=X, USDJPY=X
    return `${clean}=X`;
  }
  return `${clean}=X`;
}

function mapTimeframeToYahoo(tf: string): { interval: string; range: string } {
  switch (tf) {
    case "M1":
      return { interval: "1m", range: "1d" };
    case "M5":
      return { interval: "5m", range: "2d" };
    case "M15":
      return { interval: "15m", range: "5d" };
    case "H1":
      return { interval: "1h", range: "1mo" };
    case "H4":
      return { interval: "1h", range: "3mo" }; // Grouped in client/normalizer if needed
    case "D1":
      return { interval: "1d", range: "1y" };
    default:
      return { interval: "1h", range: "1mo" };
  }
}

/**
 * Free, public market data provider for Forex and Commodities via Yahoo Finance chart API.
 * Requires no API key.
 */
export class YahooFinanceProvider implements CandleProvider {
  readonly name = "yahoo";

  get isConfigured(): boolean {
    return true;
  }

  async getCandles(params: {
    symbol: string;
    timeframe: string;
    count: number;
  }): Promise<OHLCData[]> {
    const ticker = toYahooTicker(params.symbol);
    const { interval, range } = mapTimeframeToYahoo(params.timeframe);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker
    )}?interval=${interval}&range=${range}`;

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        throw new Error(`Yahoo Finance returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        throw new Error(`No chart data returned from Yahoo for ${ticker}`);
      }

      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];
      if (!quote || timestamps.length === 0) {
        throw new Error(`Missing quote data for ${ticker}`);
      }

      const opens: (number | null)[] = quote.open || [];
      const highs: (number | null)[] = quote.high || [];
      const lows: (number | null)[] = quote.low || [];
      const closes: (number | null)[] = quote.close || [];

      const candles: OHLCData[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const o = opens[i];
        const h = highs[i];
        const l = lows[i];
        const c = closes[i];
        const t = timestamps[i];

        // Skip null / incomplete bars
        if (
          o === null ||
          h === null ||
          l === null ||
          c === null ||
          o === undefined ||
          h === undefined ||
          l === undefined ||
          c === undefined ||
          isNaN(o) ||
          isNaN(h) ||
          isNaN(l) ||
          isNaN(c)
        ) {
          continue;
        }

        candles.push({
          time: t,
          open: Number(o.toFixed(5)),
          high: Number(h.toFixed(5)),
          low: Number(l.toFixed(5)),
          close: Number(c.toFixed(5)),
        });
      }

      if (candles.length === 0) {
        throw new Error(`All returned bars for ${ticker} were null or empty.`);
      }

      // Sort ascending, deduplicate
      const sorted = candles
        .sort((a, b) => Number(a.time) - Number(b.time))
        .filter((c, i, arr) => i === 0 || Number(c.time) !== Number(arr[i - 1].time));

      // Slice to requested count
      return sorted.slice(-Math.min(params.count, 200));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MarketDataUnavailableError(`Yahoo Finance error: ${msg}`);
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const ticker = toYahooTicker(symbol);
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
        {
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0",
          },
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const price = Number(meta.regularMarketPrice ?? 0);
      const prevClose = Number(meta.previousClose ?? price);
      const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

      return {
        symbol,
        open: Number(meta.regularMarketDayHigh ?? price),
        high: Number(meta.regularMarketDayHigh ?? price),
        low: Number(meta.regularMarketDayLow ?? price),
        close: price,
        changePct: Number(changePct.toFixed(2)),
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
