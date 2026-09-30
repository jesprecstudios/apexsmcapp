import type {
  AnalysisResult,
  RiskProfile,
  SizingLadderRow,
  SymbolMetaLike,
  TakeProfitLevel,
  TradePlan,
  TradeScenario,
} from "./types";
import {
  buildSizingLadder,
  calculatePositionSize,
  cryptoContractSpec,
  XAU_USD_CONTRACT,
  type ContractSpec,
} from "./position-sizing";

/** Fraction of the position closed at each target. Sums to 100. */
const CLOSE_SPLIT = [50, 30, 20];

/**
 * Builds a deterministic execution plan from the model's structural read.
 *
 * The model supplies structure (entry zone, invalidation, targets). Everything
 * arithmetic - lot size, risk, R multiples - is computed here so the trader
 * never acts on a hallucinated number.
 */
export function buildTradePlan(params: {
  scenario: TradeScenario;
  riskProfile: RiskProfile;
  meta?: SymbolMetaLike;
  currentPrice?: number;
}): TradePlan | null {
  const { scenario, riskProfile, meta } = params;
  const entry = scenario.entryPrice;
  const stop = scenario.invalidationPrice;

  // No entry or no structural stop means there is nothing safe to size.
  if (entry == null || stop == null || !(entry > 0) || !(stop > 0)) {
    return null;
  }

  const spec = contractSpecFor(meta);
  const sizing = calculatePositionSize({
    accountBalance: riskProfile.accountBalance,
    riskPercent: riskProfile.riskPercent,
    entryPrice: entry,
    stopLossPrice: stop,
    spec,
    pipSize: meta?.pipFactor,
    maxMarginFraction: riskProfile.maxMarginFraction,
  });

  const risk = Math.abs(entry - stop);
  const long = scenario.direction === "bullish";

  // Sort targets in profit order: ascending for longs, descending for shorts.
  const targets = [...scenario.targetPrices]
    .filter((t) => t > 0)
    .sort((a, b) => (long ? a - b : b - a));

  // Discard targets on the wrong side of entry: they are not take profits.
  const validTargets = targets.filter((t) => (long ? t > entry : t < entry));

  const takeProfits: TakeProfitLevel[] = validTargets.slice(0, 3).map((price, i) => {
    const reward = Math.abs(price - entry);
    return {
      label: `TP${i + 1}`,
      price,
      rr: risk > 0 ? reward / risk : 0,
      closePercent: CLOSE_SPLIT[i] ?? 20,
      rationale: scenario.targetRationale?.[i] ?? `Take partial profit at ${price}.`,
    };
  });

  const rr = takeProfits[0]?.rr ?? 0;

  // Lot size scales with account balance, so show the whole ladder rather than
  // a single number the trader has to reverse-engineer.
  const sizingLadder: SizingLadderRow[] = buildSizingLadder({
    entryPrice: entry,
    stopLossPrice: stop,
    spec,
    pipSize: meta?.pipFactor,
    riskPercent: riskProfile.riskPercent,
  });

  const warnings = [...sizing.warnings];
  if (takeProfits.length === 0) {
    warnings.push("No target sits beyond entry, so this setup has no defined reward.");
  } else if (rr < 1) {
    warnings.push(
      `R:R at TP1 is only 1:${rr.toFixed(2)}. Most desks want at least 1:2 before committing risk.`
    );
  }
  if (sizing.lots === 0 && warnings.length === 0) {
    warnings.push("Computed lot size is 0.00; check the stop distance and account size.");
  }
  if (sizing.lots === 0) {
    warnings.push(
      `At this balance and stop width the position rounds to 0.00 lots. See the sizing ladder below for the account size this setup needs, or wait for a tighter structural stop.`
    );
  }
  if (params.currentPrice != null) {
    // Warn when the resting limit is already through the current price, which
    // means it would fill immediately at market rather than on a pullback.
    if (scenario.orderType === "limit" && scenario.limitPrice != null) {
      const wouldFillImmediately = long
        ? scenario.limitPrice >= params.currentPrice
        : scenario.limitPrice <= params.currentPrice;
      if (wouldFillImmediately) {
        warnings.push(
          "Your limit price is already through the market, so it would execute immediately as a market order."
        );
      }
    }
  }

  return {
    direction: scenario.direction,
    orderType: scenario.orderType ?? "none",
    entryPrice: entry,
    limitPrice: scenario.limitPrice ?? null,
    stopLossPrice: stop,
    stopDistancePips: sizing.stopDistancePips,
    takeProfits,
    lots: sizing.lots,
    accountBalance: riskProfile.accountBalance,
    riskPercent: riskProfile.riskPercent,
    riskAmount: sizing.riskAmount,
    pipValuePerLot: sizing.pipValuePerLot,
    totalMargin: sizing.totalMargin,
    rr,
    sizingLadder,
    warnings,
  };
}

/** Picks the contract specification matching the instrument family. */
function contractSpecFor(meta?: SymbolMetaLike): ContractSpec {
  if (!meta) return forexLikeSpec();
  if (meta.category === "synthetic") return cryptoContractSpec();
  if (meta.symbol.startsWith("XAU") || meta.symbol.startsWith("XAG")) {
    return XAU_USD_CONTRACT;
  }
  return forexLikeSpec();
}

function forexLikeSpec(): ContractSpec {
  // Standard lot = 100,000 units, 5-digit quote => $10 per pip per lot.
  return { standardLotValue: 100_000, lotStep: 0.01, decimals: 2 };
}

/** Convenience wrapper: attaches a plan to an analysis result. */
export function withTradePlan(
  result: AnalysisResult,
  riskProfile: RiskProfile | undefined,
  meta?: SymbolMetaLike,
  currentPrice?: number
): AnalysisResult {
  if (!riskProfile || riskProfile.accountBalance <= 0) return result;

  const scenario = result.scenarios[0];
  if (!scenario) return result;

  const plan = buildTradePlan({ scenario, riskProfile, meta, currentPrice });
  if (!plan) return result;

  return { ...result, tradePlan: plan };
}
