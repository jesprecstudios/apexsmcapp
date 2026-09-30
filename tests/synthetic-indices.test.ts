import { describe, it, expect } from "vitest";
import {
  getSymbolMeta,
  generateCandleData,
  deriveSMCOverlays,
  SYMBOL_CATALOG,
} from "../src/lib/charting/data-generator";

describe("Deriv Synthetic Indices Catalog & Resolution", () => {
  it("contains all major Deriv Synthetic Indices", () => {
    expect(SYMBOL_CATALOG["V75"]).toBeDefined();
    expect(SYMBOL_CATALOG["V100"]).toBeDefined();
    expect(SYMBOL_CATALOG["CRASH1000"]).toBeDefined();
    expect(SYMBOL_CATALOG["BOOM1000"]).toBeDefined();
    expect(SYMBOL_CATALOG["V25"]).toBeDefined();
    expect(SYMBOL_CATALOG["V10"]).toBeDefined();
    expect(SYMBOL_CATALOG["JUMP75"]).toBeDefined();
  });

  it("resolves symbols regardless of formatting (e.g., R_75, v75, CRASH_1000)", () => {
    const v75 = getSymbolMeta("R_75");
    expect(v75.symbol).toBe("V75");
    expect(v75.category).toBe("synthetic");
    expect(v75.basePrice).toBeGreaterThan(100000);

    const crash = getSymbolMeta("CRASH_1000");
    expect(crash.symbol).toBe("CRASH1000");
    expect(crash.syntheticType).toBe("crash");

    const boom = getSymbolMeta("BOOM_1000");
    expect(boom.symbol).toBe("BOOM1000");
    expect(boom.syntheticType).toBe("boom");
  });
});

describe("Deriv Candlestick Dynamics", () => {
  it("generates authentic Volatility 75 (V75) candlesticks", () => {
    const candles = generateCandleData("V75", "H1", 50);
    expect(candles.length).toBe(50);

    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(c.open);
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.open);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.close).toBeGreaterThan(50000); // V75 operates in high price ranges
    }
  });

  it("simulates Crash 1000 Poisson downward drops", () => {
    // Generate large batch to verify crash occurrence
    const candles = generateCandleData("CRASH1000", "M15", 100);
    expect(candles.length).toBe(100);

    const drops = candles.filter((c) => c.close < c.open && (c.open - c.close) > 10);
    // At least one significant crash drop should be present in 100 candles
    expect(drops.length).toBeGreaterThan(0);
  });

  it("simulates Boom 1000 Poisson upward spikes", () => {
    const candles = generateCandleData("BOOM1000", "M15", 100);
    expect(candles.length).toBe(100);

    const spikes = candles.filter((c) => c.close > c.open && (c.close - c.open) > 10);
    // At least one significant boom spike should be present in 100 candles
    expect(spikes.length).toBeGreaterThan(0);
  });

  it("derives calibrated Smart Money Concepts (SMC) zones for synthetics", () => {
    const candles = generateCandleData("V75", "H1", 60);
    const overlays = deriveSMCOverlays(candles, "V75");

    expect(overlays.orderBlocks.length).toBeGreaterThanOrEqual(1);
    expect(overlays.fairValueGaps.length).toBeGreaterThanOrEqual(1);
    expect(overlays.breaksOfStructure.length).toBeGreaterThanOrEqual(1);
    expect(overlays.liquiditySweeps.length).toBeGreaterThanOrEqual(1);

    // Verify order blocks scale to V75 price domain (~320,000)
    const ob = overlays.orderBlocks[0];
    expect(ob.high).toBeGreaterThan(50000);
    expect(ob.low).toBeGreaterThan(50000);
    expect(ob.high).toBeGreaterThan(ob.low);
  });

  it("generates strictly ascending unique timestamps for all timeframes (prevents Lightweight Charts assertion failures)", () => {
    const timeframes = ["M1", "M5", "M15", "H1", "H4", "D1"];
    for (const tf of timeframes) {
      const candles = generateCandleData("EUR/USD", tf, 70);
      expect(candles.length).toBe(70);
      for (let i = 1; i < candles.length; i++) {
        expect(Number(candles[i].time)).toBeGreaterThan(Number(candles[i - 1].time));
      }
    }
  });
});

