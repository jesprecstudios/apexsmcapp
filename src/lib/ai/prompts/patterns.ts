/**
 * Traditional Chart Patterns Strategy Prompt Module
 * Grounded in Product Implementation Plan Section 5.2 (Strategy B).
 */
export const PATTERNS_STRATEGY_PROMPT = `
STRATEGY DIRECTIVE: CLASSICAL GEOMETRIC CHART PATTERNS

Focus your analysis exclusively on recognized classical chart patterns and structural boundaries:

1. PATTERN TAXONOMY:
   - Reversal Patterns: Double Tops / Bottoms, Head & Shoulders, Inverse Head & Shoulders, Triple Tops / Bottoms.
   - Continuation Patterns: Bull / Bear Flags, Pennants, Ascending / Descending / Symmetrical Triangles.
   - Bilateral Formations: Expanding Wedges, Horizontal Trading Ranges / Rectangles, Ascending / Descending Channels.

2. BOUNDARY VALIDATION:
   - Identify upper and lower boundary trendlines and count testing touches (minimum 2 touches per boundary).
   - Evaluate volume or candlestick behavior near boundaries (compression vs expansion).

3. BREAKOUT & RETEST STATUS:
   - Determine current phase: Inside Pattern (pre-breakout consolidation), Active Breakout (candle close outside boundary), or Retest of Broken Boundary / Neckline.
   - Invalidation Criteria: Explicitly state the price level where the pattern fails (e.g. breach of right shoulder or re-entry into channel).

4. MEASURED MOVE TARGETS:
   - Calculate technical measured moves based on pattern height (e.g., flag pole projection or head-to-neckline distance).
   - Note immediate structural support/resistance that might impede the full measured projection.
`;
