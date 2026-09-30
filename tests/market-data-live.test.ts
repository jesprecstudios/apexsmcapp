import { describe, it, expect, beforeAll } from "vitest";

/**
 * Live network check against the real Twelve Data API.
 *
 * Opt-in: skipped unless TWELVE_DATA_API_KEY is set, so the normal suite stays
 * offline and deterministic. Run with the demo key to smoke-test the wire
 * format (the demo key only serves a few symbols).
 *
 *   TWELVE_DATA_API_KEY=demo npx vitest run tests/market-data-live.test.ts
 */
const API_KEY = process.env.TWELVE_DATA_API_KEY;

describe.skipIf(!API_KEY)("live Twelve Data feed", () => {
  let fetchLiveCandles: typeof import("@/lib/market").fetchLiveCandles;
  let isSyntheticSymbol: typeof import("@/lib/market").isSyntheticSymbol;

  beforeAll(async () => {
    const mod = await import("@/lib/market");
    fetchLiveCandles = mod.fetchLiveCandles;
    isSyntheticSymbol = mod.isSyntheticSymbol;
  });

  it("routes synthetic symbols to Deriv and forex to Twelve Data", () => {
    expect(isSyntheticSymbol("V75")).toBe(true);
    expect(isSyntheticSymbol("CRASH1000")).toBe(true);
    expect(isSyntheticSymbol("EUR/USD")).toBe(false);
    expect(isSyntheticSymbol("XAU/USD")).toBe(false);
  });

  it("returns real, ordered candles for a symbol the key can serve", async () => {
    const result = await fetchLiveCandles({
      symbol: "EUR/USD",
      timeframe: "H1",
      count: 120,
    });

    expect(result.provider).toBe("twelvedata");
    expect(result.candles.length).toBeGreaterThan(10);

    const times = result.candles.map((c) => Number(c.time));
    // Ascending and unique: the invariant lightweight-charts enforces.
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }

    // Structurally valid OHLC.
    for (const c of result.candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(Number.isFinite(c.time)).toBe(true);
    }
  });

  it("does not invent a price for a symbol the key cannot serve", async () => {
    // The demo key rejects GBP/USD with a 401. We must surface an error, never
    // silently substitute simulated candles.
    await expect(
      fetchLiveCandles({ symbol: "GBP/USD", timeframe: "H1", count: 50 })
    ).rejects.toThrow();
  });
});
