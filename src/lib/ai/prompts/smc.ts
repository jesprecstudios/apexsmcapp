/**
 * Smart Money Concepts (SMC) Strategy Prompt Module
 * Grounded in Product Implementation Plan Section 5.2 (Strategy A).
 */
export const SMC_STRATEGY_PROMPT = `
STRATEGY DIRECTIVE: SMART MONEY CONCEPTS (SMC) & INSTITUTIONAL ORDER FLOW

Focus your analysis exclusively on institutional footprints and order flow mechanics:

1. MARKET STRUCTURE:
   - Identify active swing highs and swing lows.
   - Determine current structural trend: Higher Highs / Higher Lows (Bullish) or Lower Highs / Lower Lows (Bearish).
   - Detect Break of Structure (BOS): Continuous trend continuation past structural swings.
   - Detect Change of Character (CHOCH) / Market Structure Shift (MSS): First break of the previous opposing swing high/low with displacement.

2. LIQUIDITY ENGINE:
   - Identify Buy-Side Liquidity (BSL) resting above old highs / equal highs (EQH).
   - Identify Sell-Side Liquidity (SSL) resting below old lows / equal lows (EQL).
   - Detect Liquidity Sweeps: Aggressive wick probes beyond liquidity pools followed by strong displacement in the opposite direction.

3. SUPPLY & DEMAND IMBALANCES:
   - Order Blocks (OB): Identify the last opposing candle before aggressive displacement that created a BOS or CHOCH. An OB is valid ONLY if accompanied by displacement and structure break. Note whether it is mitigated or unmitigated.
   - Fair Value Gaps (FVG): Three-candle imbalances where Candle 1 wick and Candle 3 wick do not overlap. Mark price range and mitigation status.

4. DEALING RANGE & EQUILIBRIUM:
   - Define the active dealing range (recent major High to Low).
   - Locate 50% Equilibrium: Classify the current price location as Premium (look for shorts/sell-side arrays) or Discount (look for longs/buy-side arrays).

5. EXECUTION EVIDENCE:
   - Document specific price zones for Points of Interest (POI).
   - Define structural Invalidation level (where the setup structure fails).
   - Define realistic institutional targets based on opposing liquidity pools or unmitigated order blocks.
`;
