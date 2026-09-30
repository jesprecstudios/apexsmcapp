import { OHLCData } from "@/lib/charting/types";
import {
  CandleProvider,
  Quote,
  mapTimeframeToTwelveData,
} from "./types";

interface TwelveDataBar {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface TwelveDataSeries {
  values?: TwelveDataBar[];
  status?: string;
  message?: string;
  code?: number;
}

interface TwelveDataQuote {
  symbol?: string;
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  percent_change?: string;
  status?: string;
  message?: string;
}

/**
 * Live market data via the Twelve Data REST API.
 *
 * Requires a server-side key. Never call this from a client component: the key
 * would be exposed, and Twelve Data does not send permissive CORS headers for
 * browser use. Go through /api/v1/market-data instead.
 */
export class TwelveDataProvider implements CandleProvider {
  readonly name = "twelvedata";

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = (process.env.TWELVE_DATA_API_KEY || "").trim();
    this.baseUrl = "https://api.twelvedata.com";
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Twelve Data returns bars newest-first. The chart and the AI prompt both
   * require strictly ascending, unique, unix-second timestamps, so we reverse
   * and normalise here — this is the invariant lightweight-charts asserts on.
   */
  async getCandles(params: {
    symbol: string;
    timeframe: string;
    count: number;
  }): Promise<OHLCData[]> {
    if (!this.isConfigured) {
      throw new MarketDataUnavailableError(
        "TWELVE_DATA_API_KEY is not configured. Add a free key from twelvedata.com."
      );
    }

    const interval = mapTimeframeToTwelveData(params.timeframe);
    const url =
      `${this.baseUrl}/time_series` +
      `?symbol=${encodeURIComponent(params.symbol)}` +
      `&interval=${interval}` +
      `&outputsize=${params.count}` +
      `&timezone=UTC` +
      `&order=ASC` +
      `&apikey=${this.apiKey}`;

    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as TwelveDataSeries;

    if (json.status === "error" || !json.values) {
      throw new MarketDataUnavailableError(
        json.message || `Twelve Data returned no candles for ${params.symbol}.`
      );
    }

    const candles: OHLCData[] = [];
    for (const bar of json.values) {
      const time = parseCandleTime(bar.datetime);
      if (time === null) continue;
      candles.push({
        time,
        open: Number(bar.open),
        high: Number(bar.high),
        low: Number(bar.low),
        close: Number(bar.close),
        ...(bar.volume ? { volume: Number(bar.volume) } : {}),
      });
    }

    return dedupeAscending(candles);
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured) return null;

    const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = (await res.json()) as TwelveDataQuote;

    if (json.status === "error" || !json.close) return null;

    return {
      symbol: json.symbol || symbol,
      open: Number(json.open),
      high: Number(json.high),
      low: Number(json.low),
      close: Number(json.close),
      changePct: json.percent_change ? Number(json.percent_change) : undefined,
      timestamp: json.datetime || new Date().toISOString(),
    };
  }
}

export class MarketDataUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketDataUnavailableError";
  }
}

/** "2026-09-30 10:00:00" or "2026-09-30" -> unix seconds, or null if unparseable. */
function parseCandleTime(datetime: string): number | null {
  if (!datetime) return null;
  const iso = datetime.includes(" ") ? `${datetime.replace(" ", "T")}Z` : datetime;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

/** Enforces the ascending + unique timestamp invariant the chart requires. */
export function dedupeAscending(candles: OHLCData[]): OHLCData[] {
  const byTime = new Map<number, OHLCData>();
  for (const c of candles) {
    const t = typeof c.time === "number" ? c.time : Math.floor(Date.parse(String(c.time)) / 1000);
    byTime.set(t, { ...c, time: t });
  }
  return Array.from(byTime.values())
    .sort((a, b) => Number(a.time) - Number(b.time))
    .filter((c) => Number.isFinite(c.open) && Number.isFinite(c.close));
}
