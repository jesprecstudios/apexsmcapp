import { describe, it, expect } from "vitest";
import { buildSizingLadder, calculatePositionSize } from "@/lib/ai/position-sizing";
import { buildTradePlan } from "@/lib/ai/trade-plan";
import type { TradeScenario } from "@/lib/ai/types";

const FOREX = { standardLotValue: 100_000, lotStep: 0.01, decimals: 2 };
const FX_PIP = 0.0001;

describe("calculatePositionSize", () => {
  it("sizes a standard 5-digit FX pair from pip risk", () => {
    // 10,000 balance at 1% = $100 risk. 20 pips at $10/pip/lot = 0.5 lot.
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.01,
      entryPrice: 1.1000,
      stopLossPrice: 1.0980,
      spec: FOREX,
    });

    expect(result.lots).toBe(0.5);
    expect(result.stopDistancePips).toBeCloseTo(20, 6);
    expect(result.pipValuePerLot).toBeCloseTo(10, 6);
    expect(result.riskAmount).toBeCloseTo(100, 5);
  });

  it("rounds DOWN so real risk never exceeds the intended percentage", () => {
    const result = calculatePositionSize({
      accountBalance: 1_000,
      riskPercent: 0.01, // $10 risk
      entryPrice: 1.1000,
      stopLossPrice: 1.0955, // 45 pips
      spec: FOREX,
    });

    // $10 / (45 * 10) = 0.0222 -> floor to 0.02
    expect(result.lots).toBe(0.02);
    expect(result.riskAmount).toBeLessThanOrEqual(10);
    expect(result.riskAmount).toBeCloseTo(9, 5);
  });

  it("uses 0.01 pip size for JPY crosses", () => {
    const result = calculatePositionSize({
      accountBalance: 100_000,
      riskPercent: 0.01, // $1000 risk
      entryPrice: 157.3,
      stopLossPrice: 157.0, // 30 pips
      spec: FOREX,
      pipSize: 0.01, // from USD/JPY symbol metadata
    });

    expect(result.stopDistancePips).toBeCloseTo(30, 6);
    // A 0.01 pip on 100,000 units is $1000 per standard lot.
    expect(result.pipValuePerLot).toBeCloseTo(1000, 2);
    expect(result.lots).toBeCloseTo(0.03, 4);
  });

  it("returns 0.00 lots when JPY pip value puts the size below the minimum step", () => {
    // $100 risk over 30 pips of USD/JPY is 0.0033 lots, below the 0.01 step.
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.01,
      entryPrice: 157.3,
      stopLossPrice: 157.0,
      spec: FOREX,
      pipSize: 0.01,
    });

    expect(result.lots).toBe(0);
    expect(result.warnings.join(" ")).toMatch(/too wide/i);
  });

  it("does not under-size when float drift pushes the lot size just below a step", () => {
    // 100 / (20 * 10) is exactly 0.5, but the intermediate 20 * 0.0001 *
    // 100000 is 200.00000000000003, which makes the quotient 0.4999999999999.
    // A naive floor would return 0.49 lots and risk only $9.80 of a $100 budget.
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.01,
      entryPrice: 1.1,
      stopLossPrice: 1.098,
      spec: FOREX,
      pipSize: 0.0001,
    });

    expect(result.lots).toBe(0.5);
    expect(result.riskAmount).toBeCloseTo(100, 6);
  });

  it("respects the symbol pip size over the price-magnitude fallback", () => {
    // A 5-digit FX pair quoted near 1.1: the fallback would guess 0.01 and
    // return 0.05 lots. Explicit metadata must win.
    const withMeta = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.01,
      entryPrice: 1.1,
      stopLossPrice: 1.098,
      spec: FOREX,
      pipSize: 0.0001,
    });
    const withoutMeta = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.01,
      entryPrice: 1.1,
      stopLossPrice: 1.098,
      spec: FOREX,
    });

    expect(withMeta.lots).toBe(0.5);
    expect(withoutMeta.lots).toBe(0.5);
  });

  it("warns and returns zero when the stop distance is untradeable", () => {
    const result = calculatePositionSize({
      accountBalance: 100,
      riskPercent: 0.01, // $1 risk
      entryPrice: 1.1000,
      stopLossPrice: 1.0000, // 10000 pips
      spec: FOREX,
    });

    expect(result.lots).toBe(0);
    expect(result.warnings.join(" ")).toMatch(/too wide/i);
  });

  it("flags a risk percentage outside the sane band", () => {
    const result = calculatePositionSize({
      accountBalance: 10_000,
      riskPercent: 0.5, // 50%
      entryPrice: 1.1,
      stopLossPrice: 1.099,
      spec: FOREX,
    });

    expect(result.warnings.join(" ")).toMatch(/outside the sane/i);
  });

  it("refuses to size without a positive account balance", () => {
    const result = calculatePositionSize({
      accountBalance: 0,
      riskPercent: 0.01,
      entryPrice: 1.1,
      stopLossPrice: 1.099,
      spec: FOREX,
    });

    expect(result.lots).toBe(0);
    expect(result.warnings.join(" ")).toMatch(/account balance/i);
  });
});

describe("buildTradePlan", () => {
  const baseScenario: TradeScenario = {
    name: "Bullish continuation",
    direction: "bullish",
    trigger: "CHoCH after tapping sell-side liquidity",
    entryPrice: 1.1000,
    orderType: "limit",
    limitPrice: 1.1000,
    invalidationPrice: 1.0980,
    targetPrices: [1.1020, 1.1040, 1.1080],
    targetRationale: ["TP1 - 1R into daily VWAP", "TP2 - 2R at H4 high", "TP3 - 4R measured move"],
    rationale: "Bullish order of operations intact",
  };

  it("builds three targets with R multiples and position size", () => {
    const plan = buildTradePlan({
      scenario: baseScenario,
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
    });

    expect(plan).not.toBeNull();
    expect(plan!.lots).toBe(0.5);
    expect(plan!.stopDistancePips).toBeCloseTo(20, 6);
    expect(plan!.takeProfits).toHaveLength(3);
    expect(plan!.takeProfits[0].label).toBe("TP1");
    // 20 pips reward over 20 pip risk = 1R
    expect(plan!.takeProfits[0].rr).toBeCloseTo(1, 5);
    expect(plan!.takeProfits[2].rr).toBeCloseTo(4, 5);
    expect(plan!.rr).toBeCloseTo(1, 5);
    // Split must total 100%
    const split = plan!.takeProfits.reduce((s, tp) => s + tp.closePercent, 0);
    expect(split).toBe(100);
  });

  it("puts the nearest bearish target at TP1", () => {
    const plan = buildTradePlan({
      scenario: {
        ...baseScenario,
        direction: "bearish",
        entryPrice: 1.1000,
        limitPrice: 1.1000,
        invalidationPrice: 1.1020, // 20 pips of risk
        targetPrices: [1.0950, 1.0980, 1.0900],
      },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: 0.0001 },
    });

    // For a short the nearest target is the HIGHEST price below entry, so
    // TP1 is 1.0980 (2 pips) and the order runs down from there.
    const prices = plan!.takeProfits.map((tp) => tp.price);
    expect(prices).toEqual([1.098, 1.095, 1.09]);
    // 20 pips of reward against 20 pips of risk = 1R
    expect(plan!.takeProfits[0].rr).toBeCloseTo(1, 5);
    expect(plan!.lots).toBeCloseTo(0.5, 2);
  });

  it("drops targets on the wrong side of entry", () => {
    const plan = buildTradePlan({
      scenario: {
        ...baseScenario,
        targetPrices: [1.1020, 0.9500, 1.0900], // two below entry
      },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
    });

    expect(plan!.takeProfits).toHaveLength(1);
    expect(plan!.takeProfits[0].price).toBe(1.1020);
  });

  it("returns null when entry or stop is missing, since nothing can be sized", () => {
    expect(
      buildTradePlan({
        scenario: { ...baseScenario, entryPrice: null },
        riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      })
    ).toBeNull();

    expect(
      buildTradePlan({
        scenario: { ...baseScenario, invalidationPrice: null },
        riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      })
    ).toBeNull();
  });

  it("warns when TP1 R:R is below 1", () => {
    const plan = buildTradePlan({
      scenario: { ...baseScenario, targetPrices: [1.1005, 1.1020, 1.1040] },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
    });

    expect(plan!.rr).toBeCloseTo(0.25, 5);
    expect(plan!.warnings.join(" ")).toMatch(/R:R at TP1 is only/);
  });

  it("warns when a resting limit would fill immediately as a market order", () => {
    // Long limit at 1.1010 with market already at 1.1005 -> price is below the
    // limit, so a buy limit would execute right away.
    const plan = buildTradePlan({
      scenario: { ...baseScenario, limitPrice: 1.1010 },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
      currentPrice: 1.1005,
    });

    expect(plan!.warnings.join(" ")).toMatch(/immediately as a market order/i);
  });

  it("does not warn for a limit resting away from the market", () => {
    const plan = buildTradePlan({
      scenario: { ...baseScenario, limitPrice: 1.0990 },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
      currentPrice: 1.1005,
    });

    expect(plan!.warnings.join(" ")).not.toMatch(/immediately as a market order/i);
  });

  it("scales lot size with account size for a fixed stop", () => {
    const ladder = buildSizingLadder({
      entryPrice: 1.1,
      stopLossPrice: 1.098, // 20 pips
      spec: FOREX,
      pipSize: FX_PIP,
      riskPercent: 0.01,
    });

    // The same 20-pip stop is a different position on every account size.
    // $100 -> $1 risk -> 0.005 lots -> 0.00 at the 0.01 step.
    // $10,000 -> $100 risk -> 0.5 lots.
    const byBalance = new Map(ladder.map((r) => [r.accountBalance, r]));
    expect(byBalance.get(100)!.lots).toBe(0);
    expect(byBalance.get(100)!.tooSmall).toBe(true);
    expect(byBalance.get(500)!.lots).toBeCloseTo(0.02, 4);
    expect(byBalance.get(1_000)!.lots).toBeCloseTo(0.05, 4);
    expect(byBalance.get(10_000)!.lots).toBeCloseTo(0.5, 4);
    expect(byBalance.get(100_000)!.lots).toBeCloseTo(5, 4);

    // Every row must never exceed the risk budget, and must land within one lot
    // step of it. Flooring to the broker's 0.01 step means small accounts can
    // risk meaningfully less than 1% (a $250 account rounds 0.0125 -> 0.01),
    // which is the safe direction. What must never happen is risking MORE.
    const stepRisk = 20 * 10 * 0.01; // value of one 0.01 step
    for (const row of ladder) {
      if (row.lots > 0) {
        const budget = row.accountBalance * 0.01;
        expect(row.riskAmount).toBeLessThanOrEqual(budget + 1e-9);
        expect(row.riskAmount).toBeGreaterThan(budget - stepRisk);
      }
    }
  });

  it("halves the ladder when risk per trade is halved", () => {
    const args = {
      entryPrice: 1.1,
      stopLossPrice: 1.098,
      spec: FOREX,
      pipSize: FX_PIP,
    };
    const atOnePercent = buildSizingLadder({ ...args, riskPercent: 0.01 });
    const atHalfPercent = buildSizingLadder({ ...args, riskPercent: 0.005 });

    const one = atOnePercent.find((r) => r.accountBalance === 10_000)!;
    const half = atHalfPercent.find((r) => r.accountBalance === 10_000)!;
    expect(half.lots).toBeCloseTo(one.lots / 2, 4);
  });

  it("attaches a sizing ladder scaled to the trader's own balance", () => {
    const plan = buildTradePlan({
      scenario: baseScenario,
      riskProfile: { accountBalance: 1_000, riskPercent: 0.01 },
      meta: { symbol: "EUR/USD", category: "forex", pipFactor: FX_PIP },
    })!;

    expect(plan.sizingLadder.length).toBeGreaterThan(0);
    // The trader's own row must be present and consistent with plan.lots.
    const own = plan.sizingLadder.find((r) => r.accountBalance === 1_000);
    expect(own).toBeDefined();
    expect(own!.lots).toBeCloseTo(plan.lots, 6);
    // Larger accounts get larger positions for the identical stop.
    const larger = plan.sizingLadder.find((r) => r.accountBalance === 10_000)!;
    expect(larger.lots).toBeGreaterThan(own!.lots);
  });

  it("uses 100 oz sizing for gold", () => {
    const plan = buildTradePlan({
      scenario: {
        ...baseScenario,
        entryPrice: 2650.0,
        limitPrice: 2650.0,
        invalidationPrice: 2640.0, // $10 move
        targetPrices: [2660.0, 2680.0, 2700.0],
      },
      riskProfile: { accountBalance: 10_000, riskPercent: 0.01 }, // $100 risk
      meta: { symbol: "XAU/USD", category: "metals", pipFactor: 0.1 },
    });

    // 0.1 pip size * $100/oz * 100 = $1000 per pip per lot; $10 move = 10 pips
    expect(plan!.stopDistancePips).toBeCloseTo(100, 5);
    expect(plan!.lots).toBeCloseTo(0.1, 4);
  });
});
