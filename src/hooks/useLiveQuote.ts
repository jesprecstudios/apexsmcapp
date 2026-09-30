"use client";

import { useEffect, useState } from "react";

export interface LiveQuote {
  price: number;
  changePct?: number;
  provider: "twelvedata" | "deriv";
  timestamp: string;
  /** False when no provider is configured and `price` is unavailable. */
  available: boolean;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls the live feed for the current spot price.
 *
 * Deliberately never falls back to the static symbol catalog price: a
 * fabricated quote displayed as a live price is worse than showing nothing.
 */
export function useLiveQuote(symbol: string, timeframe: string): LiveQuote {
  const [quote, setQuote] = useState<LiveQuote>({
    price: 0,
    provider: "twelvedata",
    timestamp: "",
    available: false,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams({ symbol, timeframe, count: "60" });
        const res = await fetch(`/api/v1/market-data?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        if (cancelled || !res.ok || !json.success || !Array.isArray(json.candles)) return;
        if (json.candles.length === 0) return;

        const candles = json.candles as Array<{ high: number; low: number; close: number }>;
        const last = candles[candles.length - 1];
        const first = candles[0];

        setQuote({
          price: last.close,
          changePct:
            first && first.close !== 0
              ? ((last.close - first.close) / first.close) * 100
              : undefined,
          provider: json.provider,
          timestamp: json.fetchedAt || new Date().toISOString(),
          available: true,
        });
      } catch {
        // Network or abort failure: leave the last known quote untouched.
      }
    }

    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [symbol, timeframe]);

  return quote;
}
