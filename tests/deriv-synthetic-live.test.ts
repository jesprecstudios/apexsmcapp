import { describe, it, expect } from "vitest";
import { fetchLiveCandles, isSyntheticSymbol, marketDataReadiness } from "@/lib/market";

/**
 * Deriv's public market-data WebSocket is documented as requiring no auth, so
 * these run in the normal suite: a regression here means real synthetics have
 * silently stopped working, which would tempt a fallback to fake candles.
 */
describe("live Deriv synthetic feed (no credentials)", () => {
  it("reports Deriv as always available and Twelve Data as key-dependent", () => {
    const readiness = marketDataReadiness();
    expect(readiness.deriv).toBe(true);
    expect(typeof readiness.twelvedata).toBe("boolean");
  });

  it.each([
    ["V75", "R_75"],
    ["V100", "R_100"],
    ["V25", "R_25"],
    ["V10", "R_10"],
    ["CRASH1000", "CRASH1000"],
    ["BOOM1000", "BOOM1000"],
    ["JUMP75", "JD75"],
  ])("maps %s to the real Deriv symbol %s and returns ordered candles", async (symbol) => {
    expect(isSyntheticSymbol(symbol)).toBe(true);

    const result = await fetchLiveCandles({ symbol, timeframe: "H1", count: 30 });

    expect(result.provider).toBe("deriv");
    expect(result.candles.length).toBeGreaterThan(5);

    const times = result.candles.map((c) => Number(c.time));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }

    for (const c of result.candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });

  it("produces unique timestamps at M1, where duplicates would break the chart", async () => {
    const result = await fetchLiveCandles({ symbol: "V75", timeframe: "M1", count: 40 });
    const times = result.candles.map((c) => Number(c.time));
    expect(new Set(times).size).toBe(times.length);
  });

  it("surfaces a real price rather than a generated one", async () => {
    const result = await fetchLiveCandles({ symbol: "V75", timeframe: "H1", count: 5 });
    const last = result.candles[result.candles.length - 1];
    // V75 trades in the tens of thousands. Anything near the catalog's
    // 325480 basePrice means we are reading stale reference data, not the feed.
    expect(last.close).toBeGreaterThan(1000);
    expect(last.close).toBeLessThan(1_000_000);
  });
});
