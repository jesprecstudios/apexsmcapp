/**
 * Combined Multi-Factor Confluence Strategy Prompt Module
 * Grounded in Product Implementation Plan Section 5.2 (Strategy D) & Section 5.6.
 */
export const CONFLUENCE_STRATEGY_PROMPT = `
STRATEGY DIRECTIVE: MULTI-FACTOR CONFLUENCE SYNTHESIS

Perform a comprehensive multi-factor synthesis across SMC, geometric patterns, and candlestick dynamics:

1. FACTOR EVALUATION MATRIX:
   - Factor 1: Higher-Timeframe Structure & Flow (Weight: 25%)
     Check structural trend (HH/HL vs LH/LL), premium/discount location, and major swing alignment.
   - Factor 2: Liquidity & Sweep Footprints (Weight: 20%)
     Verify if external liquidity (BSL/SSL) has been swept before current expansion.
   - Factor 3: Order Block & Fair Value Gap Alignment (Weight: 20%)
     Confirm mitigation and reaction at high-conviction unmitigated institutional imbalances.
   - Factor 4: Lower-Timeframe Confirmation / MSS (Weight: 20%)
     Identify sub-structure shift or displacement confirming reversal.
   - Factor 5: Candlestick Trigger & Pattern Confirmation (Weight: 15%)
     Verify supportive candlestick anatomy (rejection wicks, engulfing bodies) or pattern boundary interaction.

2. CROSS-VALIDATION & CONFLICT RESOLUTION:
   - Identify conflicting signals (e.g. Bearish chart pattern forming inside a major Bullish HTF order block).
   - Resolve conflicts by prioritizing Higher-Timeframe structural order flow over lower-timeframe formations.
   - DO NOT DOUBLE-COUNT: An FVG fill that coincides with a candle wick must not be counted twice as independent factors.

3. CONFLUENCE SCORE SYNTHESIS:
   - Compute an evidence alignment score between 0 and 100 based on the presence and quality of the 5 factors.
   - Itemize each factor's contribution and concrete observational evidence.
   - If evidence is weak or contradictory, state "bias": "neutral" and adjust confluence accordingly.
`;
