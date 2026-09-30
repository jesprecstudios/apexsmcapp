import { describe, it, expect } from "vitest";
import { calculateConfluenceScore, DEFAULT_CONFLUENCE_WEIGHTS } from "../src/lib/ai/confluence-scorer";

describe("Confluence Scorer", () => {
  it("should have correct configured category weights summing to 100", () => {
    const totalWeight = Object.values(DEFAULT_CONFLUENCE_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(totalWeight).toBe(100);
  });

  it("should calculate 100% score when all factors have quality 1.0", () => {
    const evaluations = Object.keys(DEFAULT_CONFLUENCE_WEIGHTS).map((category) => ({
      category,
      evidence: "Strong confirmation observed",
      quality: 1.0,
    }));

    const result = calculateConfluenceScore(evaluations);
    expect(result.score).toBe(100);
    expect(result.factors.length).toBe(5);
  });

  it("should clamp values between 0 and 100 even with out-of-range inputs", () => {
    const overEvaluations = [
      { category: "Higher-timeframe structure", evidence: "Extreme", quality: 2.5 },
    ];
    const underEvaluations = [
      { category: "Higher-timeframe structure", evidence: "Negative", quality: -1.0 },
    ];

    expect(calculateConfluenceScore(overEvaluations).score).toBeLessThanOrEqual(100);
    expect(calculateConfluenceScore(underEvaluations).score).toBeGreaterThanOrEqual(0);
  });
});
