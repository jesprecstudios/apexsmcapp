import { describe, it, expect } from "vitest";
import { dedupeAscending } from "@/lib/market/twelve-data";
import { mapTimeframeToTwelveData, mapTimeframeToDerivGranularity } from "@/lib/market/types";
import type { OHLCData } from "@/lib/charting/types";

describe("market candle normalisation", () => {
  it("sorts descending input (Twelve Data order) into ascending for the chart", () => {
    const descending: OHLCData[] = [
      { time: 300, open: 3, high: 3, low: 3, close: 3 },
      { time: 200, open: 2, high: 2, low: 2, close: 2 },
      { time: 100, open: 1, high: 1, low: 1, close: 1 },
    ];

    const result = dedupeAscending(descending);
    expect(result.map((c) => c.time)).toEqual([100, 200, 300]);
  });

  it("deduplicates repeated timestamps, which lightweight-charts rejects", () => {
    const dupes: OHLCData[] = [
      { time: 100, open: 1, high: 1, low: 1, close: 1 },
      { time: 100, open: 1, high: 9, low: 1, close: 1 },
      { time: 200, open: 2, high: 2, low: 2, close: 2 },
    ];

    const result = dedupeAscending(dupes);
    expect(result).toHaveLength(2);
    expect(result[0].high).toBe(9);
  });

  it("converts ISO string times to unix seconds", () => {
    const result = dedupeAscending([
      { time: "2026-09-30T10:00:00Z", open: 1, high: 1, low: 1, close: 1 },
    ]);
    expect(typeof result[0].time).toBe("number");
    expect(result[0].time).toBe(Math.floor(Date.parse("2026-09-30T10:00:00Z") / 1000));
  });

  it("drops bars with non-finite prices rather than charting them", () => {
    const result = dedupeAscending([
      { time: 100, open: 1, high: 1, low: 1, close: NaN },
      { time: 200, open: 2, high: 2, low: 2, close: 2 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(200);
  });
});

describe("timeframe mapping", () => {
  it("maps every supported timeframe to a Twelve Data interval", () => {
    expect(mapTimeframeToTwelveData("M1")).toBe("1min");
    expect(mapTimeframeToTwelveData("M5")).toBe("5min");
    expect(mapTimeframeToTwelveData("M15")).toBe("15min");
    expect(mapTimeframeToTwelveData("H1")).toBe("1h");
    expect(mapTimeframeToTwelveData("H4")).toBe("4h");
    expect(mapTimeframeToTwelveData("D1")).toBe("1day");
  });

  it("maps every supported timeframe to a Deriv granularity in seconds", () => {
    expect(mapTimeframeToDerivGranularity("M1")).toBe(60);
    expect(mapTimeframeToDerivGranularity("M5")).toBe(300);
    expect(mapTimeframeToDerivGranularity("M15")).toBe(900);
    expect(mapTimeframeToDerivGranularity("H1")).toBe(3600);
    expect(mapTimeframeToDerivGranularity("H4")).toBe(14400);
    expect(mapTimeframeToDerivGranularity("D1")).toBe(86400);
  });

  it("falls back to hourly for an unknown timeframe instead of failing", () => {
    expect(mapTimeframeToTwelveData("W1")).toBe("1h");
    expect(mapTimeframeToDerivGranularity("W1")).toBe(3600);
  });
});
