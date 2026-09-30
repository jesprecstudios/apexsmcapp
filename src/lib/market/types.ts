import type { OHLCData } from "@/lib/charting/types";

export type MarketDataSource = "twelvedata" | "deriv" | "synthetic" | "auto";

export interface Quote {
  symbol: string;
  close: number;
  open: number;
  high: number;
  low: number;
  timestamp: string;
  changePct?: number;
}

export interface CandleProvider {
  getCandles(params: {
    symbol: string;
    timeframe: string;
    count: number;
  }): Promise<OHLCData[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  name: string;
}

export function mapTimeframeToTwelveData(tf: string): string {
  switch (tf) {
    case "M1": return "1min";
    case "M5": return "5min";
    case "M15": return "15min";
    case "H1": return "1h";
    case "H4": return "4h";
    case "D1": return "1day";
    default: return "1h";
  }
}

export function mapTimeframeToDerivGranularity(tf: string): number {
  switch (tf) {
    case "M1": return 60;
    case "M5": return 300;
    case "M15": return 900;
    case "H1": return 3600;
    case "H4": return 14400;
    case "D1": return 86400;
    default: return 3600;
  }
}

export function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}
