import { describe, it, expect } from "vitest";
import { STRATEGY_REGISTRY, getStrategy } from "../src/lib/ai/strategy-registry";
import { AnalysisStrategy } from "../src/lib/ai/types";

describe("AI Strategy Registry", () => {
  const expectedStrategies: AnalysisStrategy[] = [
    "smc",
    "chart_patterns",
    "candlestick_reversals",
    "combined",
    "signals",
  ];

  it("should contain all required analysis strategies", () => {
    for (const stratId of expectedStrategies) {
      expect(STRATEGY_REGISTRY[stratId]).toBeDefined();
      expect(STRATEGY_REGISTRY[stratId].id).toBe(stratId);
      expect(STRATEGY_REGISTRY[stratId].label).toBeTruthy();
      expect(STRATEGY_REGISTRY[stratId].promptText.length).toBeGreaterThan(100);
      expect(STRATEGY_REGISTRY[stratId].systemInstructions.length).toBeGreaterThan(0);
      expect(STRATEGY_REGISTRY[stratId].requiredEvidence.length).toBeGreaterThan(0);
    }
  });

  it("should retrieve strategy by normalized id or fallback to SMC", () => {
    expect(getStrategy("smc").id).toBe("smc");
    expect(getStrategy("chart_patterns").id).toBe("chart_patterns");
    expect(getStrategy("candlestick_reversals").id).toBe("candlestick_reversals");
    expect(getStrategy("combined").id).toBe("combined");
    expect(getStrategy("signals").id).toBe("signals");
    // Fallback
    expect(getStrategy("unknown_strategy").id).toBe("smc");
  });
});
