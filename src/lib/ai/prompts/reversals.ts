/**
 * Candlestick Reversals Strategy Prompt Module
 * Grounded in Product Implementation Plan Section 5.2 (Strategy C).
 */
export const REVERSALS_STRATEGY_PROMPT = `
STRATEGY DIRECTIVE: CANDLESTICK REVERSALS & PRICE ACTION TRIGGERS

Focus your analysis exclusively on high-probability candlestick formations contextualized by location:

1. RECOGNIZED PATTERNS:
   - Two-Candle Formations: Bullish / Bearish Engulfing, Piercing Line / Dark Cloud Cover, Tweezer Tops / Bottoms.
   - Single-Candle Triggers: Hammer, Inverted Hammer, Shooting Star, Hanging Man, Dragonfly / Gravestone Doji.
   - Three-Candle Structures: Morning Star, Evening Star, Three Inside Up / Down, Three White Soldiers / Three Black Crows.

2. LOCATION CONTEXTUALIZATION (CRITICAL RULE):
   - A candlestick pattern alone DOES NOT establish bias.
   - Evaluate whether the pattern forms at a significant swing high/low, key psychological horizontal support/resistance, or previous session high/low.
   - Reject formations occurring in the middle of choppy consolidation ranges.

3. CANDLE ANATOMY & MOMENTUM:
   - Analyze body-to-wick ratio: Long rejection wicks indicate aggressive liquidity absorption.
   - Analyze volume/displacement: The candle body must show conviction compared to the preceding 5-10 candles.

4. TRIGGER & INVALIDATION LEVELS:
   - Trigger condition: Confirmation upon breach of the high/low of the reversal candle or close of the subsequent candle.
   - Invalidation level: The extreme wick tip of the reversal pattern (with a reasonable structural buffer).
   - Target levels: Nearest key structural swing or horizontal pivot level.
`;
