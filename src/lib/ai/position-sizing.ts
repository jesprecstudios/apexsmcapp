/**
 * Deterministic position sizing.
 *
 * Lot size MUST be computed in code, never by the model. An LLM given an
 * account balance and a stop distance will confidently produce plausible but
 * wrong numbers, and a wrong lot size directly costs the trader money.
 *
 * This module is the single source of truth for:
 *   - money at risk per trade
 *   - lot size from stop distance
 *   - the resulting pip value and margin
 */

export interface ContractSpec {
  /** Value of one standard lot (100,000 units) for one point of price move, in account currency. */
  standardLotValue: number;
  /** Smallest tradable increment. */
  lotStep: number;
  decimals: number;
}

/**
 * Forex majors: a standard lot is 100,000 units. Value per pip per standard lot
 * is 10 USD for USD-quoted pairs. Crosses with a non-USD quote currency scale
 * with the live quote, so the caller passes the resolved rate.
 */
export function forexContractSpec(params: {
  quoteToAccountRate: number;
  accountCurrency: string;
  quoteCurrency: string;
}): ContractSpec {
  const { quoteToAccountRate, accountCurrency, quoteCurrency } = params;
  // standardLotValue in account currency per 1.0 of price movement
  const perPointPerLot = 100_000 * quoteToAccountRate;
  return {
    standardLotValue: perPointPerLot,
    lotStep: 0.01,
    decimals: 2,
  };
}

/** Metals (XAU/USD): 100 oz per standard lot. */
export const XAU_USD_CONTRACT: ContractSpec = {
  standardLotValue: 100, // 1.00 USD move x 100 oz
  lotStep: 0.01,
  decimals: 2,
};

/** Crypto on Deriv synthetics-style feeds: 1 unit per 1.0 move for small caps. */
export function cryptoContractSpec(): ContractSpec {
  return { standardLotValue: 1, lotStep: 0.01, decimals: 2 };
}

export interface PositionSizeInput {
  accountBalance: number;
  /** Fraction of balance to risk, e.g. 0.01 for 1%. */
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  spec: ContractSpec;
  /**
   * Pip size for the instrument, from symbol metadata. Required for accuracy:
   * guessing it from the price magnitude mis-sizes JPY crosses, metals and
   * synthetics, which all have different conventions.
   */
  pipSize?: number;
  /** Optional cap on exposure, as a fraction of balance. */
  maxMarginFraction?: number;
}

export interface PositionSizeResult {
  lots: number;
  riskAmount: number;
  stopDistance: number;
  stopDistancePips: number;
  pipValuePerLot: number;
  /** Risk distance expressed in pips, for display. */
  totalMargin: number;
  /** True when the requested lot size was reduced to respect the margin cap. */
  cappedByMargin: boolean;
  warnings: string[];
}

/** Pip size per symbol family. */
export function pipSizeFor(symbol: string, meta?: { pipFactor?: number }): number {
  if (meta?.pipFactor && meta.pipFactor > 0) return meta.pipFactor;
  if (symbol.includes("JPY")) return 0.01;
  if (symbol.startsWith("XAU") || symbol.startsWith("XAG")) return 0.1;
  if (symbol.includes("BTC") || symbol.includes("ETH")) return 1;
  return 0.0001;
}

/**
 * Computes lot size so that a stop-out costs exactly
 * accountBalance * riskPercent.
 *
 * lotSize = (riskAmount) / (stopDistanceInPips * pipValuePerLot)
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const warnings: string[] = [];
  const { accountBalance, riskPercent, entryPrice, stopLossPrice, spec } = input;

  if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
    return {
      lots: 0,
      riskAmount: 0,
      stopDistance: 0,
      stopDistancePips: 0,
      pipValuePerLot: 0,
      totalMargin: 0,
      cappedByMargin: false,
      warnings: ["Account balance must be greater than zero to size a position."],
    };
  }

  if (riskPercent <= 0 || riskPercent > 0.1) {
    warnings.push(
      `Risk per trade of ${(riskPercent * 100).toFixed(2)}% is outside the sane 0-10% band; sizing uses it as given.`
    );
  }

  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  if (!Number.isFinite(stopDistance) || stopDistance <= 0) {
    return {
      lots: 0,
      riskAmount: 0,
      stopDistance: 0,
      stopDistancePips: 0,
      pipValuePerLot: 0,
      totalMargin: 0,
      cappedByMargin: false,
      warnings: ["Entry and stop-loss are identical, so no lot size can be derived."],
    };
  }

  // Pip size comes from symbol metadata. Inferring it from the price magnitude
  // is wrong: 1.1 is a 5-digit FX pair (pip 0.0001) while 154.32 is a JPY
  // cross (pip 0.01), and the two differ by 100x in lot size.
  const pipSize = input.pipSize && input.pipSize > 0 ? input.pipSize : inferPipSize(entryPrice);
  const stopDistancePips = stopDistance / pipSize;

  // Value of one pip for a 1.00 lot move in account currency.
  const pipValuePerLot = pipSize * spec.standardLotValue;

  const riskAmount = accountBalance * riskPercent;
  let lots = riskAmount / (stopDistancePips * pipValuePerLot);

  // Round DOWN to the broker's lot step: never round up, or the real risk
  // exceeds the intended percentage. The epsilon absorbs float drift such as
  // 100 / 200.00000000000003 = 0.4999999..., which would otherwise under-size
  // a position that is exactly on the risk budget.
  lots = floorToStep(lots, spec.lotStep);
  lots = Number(lots.toFixed(spec.decimals));

  let cappedByMargin = false;
  const maxMarginFraction = input.maxMarginFraction;
  if (maxMarginFraction && maxMarginFraction > 0 && spec.standardLotValue > 0) {
    const marginPerLot = assumeLeverageMargin(spec.standardLotValue);
    const maxMargin = accountBalance * maxMarginFraction;
    if (marginPerLot > 0) {
      const maxLots = floorToStep(maxMargin / marginPerLot, spec.lotStep);
      if (maxLots < lots) {
        lots = Number(maxLots.toFixed(spec.decimals));
        cappedByMargin = true;
        warnings.push(
          `Lot size reduced to ${lots} to stay within the ${(maxMarginFraction * 100).toFixed(0)}% margin cap.`
        );
      }
    }
  }

  if (lots <= 0) {
    warnings.push(
      "Stop distance is too wide for this account size at the chosen risk level. Widen the risk percentage or use a tighter structural stop."
    );
  }

  const totalMargin = lots * assumeLeverageMargin(spec.standardLotValue);
  const actualRisk = lots * stopDistancePips * pipValuePerLot;

  return {
    lots,
    riskAmount: actualRisk,
    stopDistance,
    stopDistancePips,
    pipValuePerLot,
    totalMargin,
    cappedByMargin,
    warnings,
  };
}

/**
 * Assumes 1:100 leverage for the margin estimate. This is only used for a
 * display cap, not for the risk calculation, which uses true pip value.
 */
function assumeLeverageMargin(standardLotValue: number): number {
  return standardLotValue / 100;
}

/**
 * Floors a value to a step, tolerating float drift.
 *
 * Binary floating point makes 100 / 200.00000000000003 evaluate to
 * 0.49999999999999994, and a naive Math.floor(step) would round a position that
 * sits exactly on the risk budget down to the next lot smaller. The relative
 * epsilon restores the true value before flooring.
 */
function floorToStep(value: number, step: number): number {
  const tolerance = Math.abs(value) * 1e-9;
  return Math.floor((value + tolerance) / step) * step;
}

/** Account tiers used for the scaling ladder. */
export const DEFAULT_ACCOUNT_TIERS = [100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000];

/**
 * Builds a lot-size ladder across a range of account balances for one setup.
 *
 * Lot size is not a property of the chart: it is a property of the account.
 * The same 20-pip stop is 0.01 lots on a $100 account and 5.00 lots on a
 * $50,000 account. Showing the trader the whole ladder makes the trade-off
 * explicit and lets them read off their own balance before committing.
 */
export function buildSizingLadder(params: {
  entryPrice: number;
  stopLossPrice: number;
  spec: ContractSpec;
  pipSize?: number;
  riskPercent: number;
  balances?: number[];
}): import("./types").SizingLadderRow[] {
  const tiers = params.balances?.length ? params.balances : DEFAULT_ACCOUNT_TIERS;

  return tiers.map((accountBalance) => {
    const result = calculatePositionSize({
      accountBalance,
      riskPercent: params.riskPercent,
      entryPrice: params.entryPrice,
      stopLossPrice: params.stopLossPrice,
      spec: params.spec,
      pipSize: params.pipSize,
    });
    return {
      accountBalance,
      lots: result.lots,
      riskAmount: result.riskAmount,
      tooSmall: result.lots === 0,
    };
  });
}

/**
 * Last-resort pip size guess, used only when symbol metadata is missing.
 * Prefer passing pipSize from the symbol catalog.
 */
function inferPipSize(price: number): number {
  const abs = Math.abs(price);
  if (abs === 0) return 0.0001;
  if (abs >= 100) return 0.01;   // JPY crosses, e.g. 157.30
  if (abs >= 10) return 0.1;    // synthetic indices, e.g. 2140.5
  if (abs >= 1) return 0.0001;  // 5-digit FX majors: 1.13408
  return 0.0001;
}
