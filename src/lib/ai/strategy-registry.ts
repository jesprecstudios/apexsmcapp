import { AnalysisStrategy, StrategyDefinition } from "./types";
import { SMC_STRATEGY_PROMPT } from "./prompts/smc";
import { PATTERNS_STRATEGY_PROMPT } from "./prompts/patterns";
import { REVERSALS_STRATEGY_PROMPT } from "./prompts/reversals";
import { CONFLUENCE_STRATEGY_PROMPT } from "./prompts/confluence";

export interface RegisteredStrategy extends StrategyDefinition {
  promptText: string;
}

export const STRATEGY_REGISTRY: Record<AnalysisStrategy, RegisteredStrategy> = {
  smc: {
    id: "smc",
    label: "Smart Money Concepts",
    shortLabel: "SMC",
    description: "Institutional order flow, liquidity sweeps, market structure shifts (BOS/CHOCH), order blocks, and FVGs.",
    systemInstructions: [
      "Analyze market structure (HH/HL or LH/LL)",
      "Locate Buy-Side and Sell-Side Liquidity sweeps",
      "Map unmitigated Order Blocks and Fair Value Gaps",
      "Identify Premium vs Discount equilibrium levels",
    ],
    requiredEvidence: [
      "Swing high/low points",
      "Structure break or shift (BOS/CHOCH)",
      "Displacement candle or volume footprint",
      "Imbalance or liquidity pool zone",
    ],
    supportedTimeframes: ["M1", "M5", "M15", "H1", "H4", "D1"],
    promptText: SMC_STRATEGY_PROMPT,
  },
  chart_patterns: {
    id: "chart_patterns",
    label: "Classical Chart Patterns",
    shortLabel: "Patterns",
    description: "Classical geometric breakout and continuation formations: double tops/bottoms, flags, triangles, and channels.",
    systemInstructions: [
      "Detect geometric boundaries with minimum 2 touches",
      "Evaluate breakout vs pullback confirmation status",
      "Calculate measured move technical targets",
      "Define structural neckline invalidation levels",
    ],
    requiredEvidence: [
      "Upper and lower pattern boundaries",
      "Breakout candle status (inside, breaking, or retesting)",
      "Measured objective projection",
      "Pattern boundary failure price",
    ],
    supportedTimeframes: ["M5", "M15", "H1", "H4", "D1", "W1"],
    promptText: PATTERNS_STRATEGY_PROMPT,
  },
  candlestick_reversals: {
    id: "candlestick_reversals",
    label: "Candlestick Reversals",
    shortLabel: "Reversals",
    description: "High-conviction candle formations (engulfing, pinbars, stars) contextualized at key market boundaries.",
    systemInstructions: [
      "Classify candle anatomy (wick-to-body ratio, displacement)",
      "Validate location context at key horizontal boundaries",
      "Confirm trigger candle breach conditions",
      "Establish tight structural invalidation at pattern extreme",
    ],
    requiredEvidence: [
      "Specific candle morphology (e.g. Hammer, Bearish Engulfing)",
      "Support/resistance or HTF confluence location",
      "Trigger execution price",
      "Extreme wick invalidation point",
    ],
    supportedTimeframes: ["M1", "M5", "M15", "H1", "H4", "D1"],
    promptText: REVERSALS_STRATEGY_PROMPT,
  },
  combined: {
    id: "combined",
    label: "Multi-Factor Confluence",
    shortLabel: "Confluence",
    description: "Holistic institutional synthesis combining SMC flow, structural patterns, and candlestick execution triggers.",
    systemInstructions: [
      "Evaluate HTF structure and directional trend (25%)",
      "Verify liquidity sweep and liquidity targets (20%)",
      "Confirm Order Block / FVG reaction (20%)",
      "Check lower-timeframe MSS confirmation (20%)",
      "Assess candlestick trigger and pattern confirmation (15%)",
    ],
    requiredEvidence: [
      "Higher-timeframe directional alignment",
      "Order block or FVG interaction",
      "Liquidity footprint (BSL/SSL sweep)",
      "Micro-structure confirmation",
    ],
    supportedTimeframes: ["M15", "H1", "H4", "D1"],
    promptText: CONFLUENCE_STRATEGY_PROMPT,
  },
  signals: {
    id: "signals",
    label: "Trade Signals & Setup",
    shortLabel: "Signals",
    description: "Actionable institutional execution signals: exact entry price, stop-loss, take-profit targets, and position sizing.",
    systemInstructions: [
      "Define precise entry level and execution trigger",
      "Calculate mathematical Stop-Loss based on structural invalidation",
      "Establish multi-tiered Take-Profit targets (TP1, TP2, TP3)",
      "Compute risk-to-reward ratio and lot sizing based on account balance",
    ],
    requiredEvidence: [
      "Exact entry price",
      "Structural stop-loss level",
      "Take profit price objectives",
      "Risk-to-reward ratio",
    ],
    supportedTimeframes: ["M1", "M5", "M15", "H1", "H4", "D1"],
    promptText: CONFLUENCE_STRATEGY_PROMPT,
  },
};

export function getStrategy(strategyId: string): RegisteredStrategy {
  const normalized = strategyId.toLowerCase().trim();
  if (normalized in STRATEGY_REGISTRY) {
    return STRATEGY_REGISTRY[normalized as AnalysisStrategy];
  }
  // Mapping shortcuts if uppercase or legacy
  if (normalized === "patterns") return STRATEGY_REGISTRY.chart_patterns;
  if (normalized === "reversals") return STRATEGY_REGISTRY.candlestick_reversals;
  if (normalized === "confluence") return STRATEGY_REGISTRY.combined;
  if (normalized === "signals" || normalized === "signal") return STRATEGY_REGISTRY.signals;
  return STRATEGY_REGISTRY.smc;
}
