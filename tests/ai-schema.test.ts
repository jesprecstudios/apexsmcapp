import { describe, it, expect } from "vitest";
import { validateAndNormalizeAnalysis } from "../src/lib/ai/schema";

describe("AI Schema & Cross-Field Validation Rules", () => {
  const validMock = {
    status: "complete",
    bias: "bullish",
    symbol: "EUR/USD",
    timeframe: "H1",
    summary: "Bullish order flow confirmed after Asian session sell-side liquidity sweep.",
    confluence: {
      score: 86,
      factors: [
        {
          name: "Liquidity Sweep",
          contribution: 25,
          evidence: "Asian session lows swept before displacement",
        },
      ],
    },
    keyLevels: [
      {
        label: "H1 Bullish Order Block",
        price: 1.0842,
        timeframe: "H1",
        levelType: "order_block",
        evidence: "Unmitigated institutional discount zone",
        confidence: 90,
      },
      {
        label: "Liquidity Target TP1",
        price: 1.092,
        timeframe: "H1",
        levelType: "target",
        evidence: "Equal highs resting above range",
        confidence: 85,
      },
    ],
    scenarios: [
      {
        name: "Bullish FVG Retest",
        direction: "bullish",
        trigger: "M15 CHoCH upon tapping 1.0842",
        invalidationPrice: 1.081,
        targetPrices: [1.092],
        rationale: "Targeting buy-side liquidity above equal highs",
      },
    ],
    reasoning: [
      {
        observation: "Large green displacement candle following wick rejection",
        interpretation: "Institutional sponsorship taking price into premium",
        timeframe: "H1",
        evidenceSource: "chart_image",
      },
    ],
    limitations: [
      "High impact CPI release scheduled in 3 hours",
    ],
  };

  it("should validate and normalize a complete conforming AI response", () => {
    const result = validateAndNormalizeAnalysis(validMock, "EUR/USD", "H1");
    expect(result.status).toBe("complete");
    expect(result.bias).toBe("bullish");
    expect(result.confluence.score).toBe(86);
    expect(result.keyLevels.length).toBe(2);
  });

  it("should enforce undetermined bias and remove aggressive setups when status is insufficient_data", () => {
    const insufficientMock = {
      ...validMock,
      status: "insufficient_data",
      bias: "bullish", // Attempting to claim bullish despite insufficient data
    };

    const result = validateAndNormalizeAnalysis(insufficientMock, "EUR/USD", "H1");
    expect(result.status).toBe("insufficient_data");
    expect(result.bias).toBe("undetermined"); // Cross-field rule 1 must override this
    expect(result.scenarios[0].name).toContain("Awaiting Clear Structure");
  });

  it("should reject schemas missing required fields", () => {
    const brokenMock = {
      status: "complete",
      // missing bias, summary, confluence, etc.
    };

    expect(() => validateAndNormalizeAnalysis(brokenMock, "EUR/USD", "H1")).toThrow();
  });
});
