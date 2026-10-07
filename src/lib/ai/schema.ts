import { z } from "zod";

export const PriceLevelSchema = z.object({
  label: z.string(),
  price: z.number().positive(),
  timeframe: z.string(),
  levelType: z.enum([
    "support",
    "resistance",
    "order_block",
    "fair_value_gap",
    "liquidity",
    "invalidation",
    "target",
    "other",
  ]),
  evidence: z.string(),
  confidence: z.number().min(0).max(100),
});

export const TradeScenarioSchema = z.object({
  name: z.string(),
  direction: z.enum(["bullish", "bearish"]),
  trigger: z.string(),
  // Newer models emit these; older responses may omit them, so they stay
  // optional at the parse boundary and are back-filled in normalization.
  entryPrice: z.number().positive().nullable().optional(),
  orderType: z.enum(["market", "limit", "stop", "none"]).optional(),
  limitPrice: z.number().positive().nullable().optional(),
  invalidationPrice: z.number().positive().nullable(),
  targetPrices: z.array(z.number().positive()),
  targetRationale: z.array(z.string()).optional(),
  rationale: z.string(),
});

export const ReasoningItemSchema = z.object({
  observation: z.string(),
  interpretation: z.string(),
  timeframe: z.string(),
  evidenceSource: z.enum(["chart_image", "ohlc_data", "user_drawing"]),
});

export const ConfluenceFactorSchema = z.object({
  name: z.string(),
  contribution: z.number().min(0).max(100),
  evidence: z.string(),
});

export const ConfluenceScoreSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.array(ConfluenceFactorSchema),
});

export const AIDrawingSupportResistanceSchema = z.object({
  price: z.number().positive(),
  type: z.enum(["support", "resistance"]),
  label: z.string(),
  strength: z.enum(["major", "minor"]).optional(),
});

export const AIDrawingTrendlineSchema = z.object({
  startPrice: z.number().positive(),
  endPrice: z.number().positive(),
  type: z.enum(["support", "resistance", "trend"]),
  label: z.string(),
});

export const AIDrawingOrderBlockSchema = z.object({
  high: z.number().positive(),
  low: z.number().positive(),
  type: z.enum(["bullish_ob", "bearish_ob"]),
  label: z.string(),
});

export const AIDrawingTradeSetupSchema = z.object({
  direction: z.enum(["long", "short"]),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  tp1: z.number().positive(),
  tp2: z.number().positive().optional(),
  tp3: z.number().positive().optional(),
  riskRewardRatio: z.number().optional(),
});

export const AIDrawingsSchema = z.object({
  supportResistance: z.array(AIDrawingSupportResistanceSchema).default([]),
  trendlines: z.array(AIDrawingTrendlineSchema).default([]),
  orderBlocks: z.array(AIDrawingOrderBlockSchema).default([]),
  tradeSetup: AIDrawingTradeSetupSchema.nullable().optional(),
});

export const AnalysisResponseSchema = z.object({
  status: z.enum(["complete", "insufficient_data", "partial"]),
  bias: z.enum(["bullish", "bearish", "neutral", "undetermined"]),
  symbol: z.string(),
  timeframe: z.string(),
  summary: z.string(),
  confluence: ConfluenceScoreSchema,
  keyLevels: z.array(PriceLevelSchema),
  scenarios: z.array(TradeScenarioSchema),
  reasoning: z.array(ReasoningItemSchema),
  limitations: z.array(z.string()),
  aiDrawings: AIDrawingsSchema.optional(),
});

export type ValidatedAnalysis = z.infer<typeof AnalysisResponseSchema>;

/**
 * Validates and normalizes raw AI response according to cross-field business logic rules
 * (PRD Section 5.5).
 */
export function validateAndNormalizeAnalysis(
  raw: unknown,
  symbol: string,
  timeframe: string
): ValidatedAnalysis {
  const parsed = AnalysisResponseSchema.safeParse(raw);

  if (!parsed.success) {
    console.error("Validation failed on analysis output:", parsed.error);
    throw new Error(
      `Analysis response failed format validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ")}`
    );
  }

  const data = parsed.data;

  // Cross-field Consistency Rule 1:
  // If status is "insufficient_data", bias cannot be high conviction bullish/bearish,
  // and no actionable scenarios should be confirmed.
  if (data.status === "insufficient_data") {
    if (data.bias === "bullish" || data.bias === "bearish") {
      data.bias = "undetermined";
    }
    // Limit scenarios to explanatory / wait-and-see
    if (data.scenarios.length > 0) {
      data.scenarios = [
        {
          name: "Awaiting Clear Structure",
          direction: "bullish",
          trigger: "Chart evidence is currently insufficient for high-confidence execution.",
          entryPrice: null,
          orderType: "none" as const,
          limitPrice: null,
          invalidationPrice: null,
          targetPrices: [],
          targetRationale: [],
          rationale: "Data resolution or market structure does not present high-probability setups.",
        },
      ];
    }
  }

  // Cross-field Consistency Rule 2:
  // Normalize symbol & timeframe if AI hallucinated different strings
  if (!data.symbol || data.symbol.length < 2) {
    data.symbol = symbol;
  }
  if (!data.timeframe) {
    data.timeframe = timeframe;
  }

  // Cross-field Consistency Rule 3:
  // Clamp confluence score
  data.confluence.score = Math.max(0, Math.min(100, Math.round(data.confluence.score)));

  // Cross-field Consistency Rule 4:
  // Check price level coherence (e.g. invalidation levels for bullish setups should typically be below current price)
  for (const scenario of data.scenarios) {
    if (scenario.invalidationPrice !== null && scenario.targetPrices.length > 0) {
      const tp1 = scenario.targetPrices[0];
      if (scenario.direction === "bullish" && scenario.invalidationPrice > tp1) {
        // Bullish invalidation above target is logically inverted, warn or adjust
        console.warn("Detected logically inverted bullish scenario levels in AI response");
      } else if (scenario.direction === "bearish" && scenario.invalidationPrice < tp1) {
        // Bearish invalidation below target is logically inverted
        console.warn("Detected logically inverted bearish scenario levels in AI response");
      }
    }
  }

  // Cross-field Consistency Rule 5:
  // Guarantee the fields the terminal needs to render an actionable ticket.
  // Older/looser model responses omit entryPrice, orderType and targetRationale,
  // which is why the trade tabs previously rendered with no levels at all.
  for (const scenario of data.scenarios) {
    // Infer an entry from the best available structural level when the model
    // did not state one. Never invent a price: only reuse levels it reported.
    if (scenario.entryPrice == null) {
      const derived = deriveEntryFromLevels(scenario, data.keyLevels);
      if (derived != null) {
        scenario.entryPrice = derived;
        scenario.limitPrice = scenario.limitPrice ?? derived;
      }
    }

    if (!scenario.orderType) {
      scenario.orderType = scenario.entryPrice != null ? "limit" : "none";
    }

    if (!scenario.targetRationale || scenario.targetRationale.length < scenario.targetPrices.length) {
      scenario.targetRationale = scenario.targetPrices.map(
        (_, i) => `TP${i + 1} — take partial profit here`
      );
    }
  }

  // Cross-field Consistency Rule 5b:
  // Ensure the trader always has both Long and Short tactical options available.
  // If the model only returned a single directional scenario, synthesize the opposing alternative setup.
  if (data.scenarios.length === 1 && data.status !== "insufficient_data") {
    const opposing = deriveOpposingScenario(data.scenarios[0], data.keyLevels);
    if (opposing) {
      data.scenarios.push(opposing);
    }
  }

  // Cross-field Consistency Rule 6:
  // Ensure aiDrawings is fully formed for direct chart rendering
  if (!data.aiDrawings) {
    data.aiDrawings = {
      supportResistance: [],
      trendlines: [],
      orderBlocks: [],
      tradeSetup: null,
    };
  }

  // Backfill S/R if empty
  if (data.aiDrawings.supportResistance.length === 0) {
    for (const lvl of data.keyLevels) {
      if (lvl.levelType === "support") {
        data.aiDrawings.supportResistance.push({
          price: lvl.price,
          type: "support",
          label: lvl.label || `Support (${lvl.price})`,
          strength: lvl.confidence >= 80 ? "major" : "minor",
        });
      } else if (lvl.levelType === "resistance") {
        data.aiDrawings.supportResistance.push({
          price: lvl.price,
          type: "resistance",
          label: lvl.label || `Resistance (${lvl.price})`,
          strength: lvl.confidence >= 80 ? "major" : "minor",
        });
      }
    }
  }

  // Backfill Order Blocks if empty
  if (data.aiDrawings.orderBlocks.length === 0) {
    for (const lvl of data.keyLevels) {
      if (lvl.levelType === "order_block" || lvl.levelType === "fair_value_gap") {
        const isBullish = lvl.label.toLowerCase().includes("bull") || lvl.label.toLowerCase().includes("demand");
        data.aiDrawings.orderBlocks.push({
          high: Number((lvl.price * 1.0015).toFixed(5)),
          low: Number((lvl.price * 0.9985).toFixed(5)),
          type: isBullish ? "bullish_ob" : "bearish_ob",
          label: lvl.label,
        });
      }
    }
  }

  // Backfill Trade Setup if empty
  if (!data.aiDrawings.tradeSetup && data.scenarios.length > 0) {
    const sc = data.scenarios[0];
    if (sc.entryPrice && sc.invalidationPrice && sc.targetPrices.length > 0) {
      const risk = Math.abs(sc.entryPrice - sc.invalidationPrice);
      const reward = Math.abs(sc.targetPrices[0] - sc.entryPrice);
      const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 1.5;
      data.aiDrawings.tradeSetup = {
        direction: sc.direction === "bullish" ? "long" : "short",
        entry: sc.entryPrice,
        stopLoss: sc.invalidationPrice,
        tp1: sc.targetPrices[0],
        tp2: sc.targetPrices[1],
        tp3: sc.targetPrices[2],
        riskRewardRatio: rr,
      };
    }
  }

  return data;
}

/**
 * Picks the most plausible entry from levels the model already reported.
 * Prefers an order block, then support/resistance, then any numeric level.
 * Returns undefined rather than guessing when the model gave us nothing.
 */
function deriveEntryFromLevels(
  scenario: { direction: "bullish" | "bearish" },
  keyLevels: Array<{ levelType: string; price: number }>
): number | undefined {
  const buySide = new Set(["order_block", "support"]);
  const sellSide = new Set(["order_block", "resistance"]);

  const wanted = scenario.direction === "bullish" ? buySide : sellSide;
  const match = keyLevels.find((l) => wanted.has(l.levelType) && l.price > 0);
  if (match) return match.price;

  const anyLevel = keyLevels.find((l) => l.price > 0);
  return anyLevel ? anyLevel.price : undefined;
}

/**
 * Synthesizes an alternative opposing scenario if the model only provided one.
 * Ensures the trader always has both Long and Short tactical options available.
 */
function deriveOpposingScenario(
  primary: ValidatedAnalysis["scenarios"][0],
  keyLevels: ValidatedAnalysis["keyLevels"]
): ValidatedAnalysis["scenarios"][0] | null {
  const isOpposingLong = primary.direction === "bearish";

  // Find candidate levels for the opposing trade
  const candidateLevels = keyLevels.filter((l) => l.price > 0);
  if (candidateLevels.length === 0) return null;

  const currentReference = primary.entryPrice ?? candidateLevels[0].price;

  if (isOpposingLong) {
    // Want a Long: entry at support or below current price
    const supports = candidateLevels
      .filter((l) => l.levelType === "support" || l.levelType === "order_block" || l.price < currentReference)
      .sort((a, b) => b.price - a.price);

    const entry = supports[0]?.price ?? Number((currentReference * 0.995).toFixed(5));
    const invalidation = Number((entry * 0.992).toFixed(5));
    const risk = entry - invalidation;
    const tp1 = Number((entry + risk * 1.5).toFixed(5));
    const tp2 = Number((entry + risk * 2.5).toFixed(5));
    const tp3 = Number((entry + risk * 4.0).toFixed(5));

    return {
      name: "Alternative Bullish Rebound Setup",
      direction: "bullish",
      trigger: `Bullish displacement and reaction from discount support / demand near ${entry}`,
      entryPrice: entry,
      orderType: "limit",
      limitPrice: entry,
      invalidationPrice: invalidation,
      targetPrices: [tp1, tp2, tp3],
      targetRationale: [
        "TP1 — 1.5R partial at range equilibrium",
        "TP2 — 2.5R structural buy-side liquidity sweep",
        "TP3 — 4.0R extended expansion target",
      ],
      rationale:
        "Discount accumulation setup if sell-side liquidity is swept into support/demand.",
    };
  } else {
    // Want a Short: entry at resistance or above current price
    const resistances = candidateLevels
      .filter((l) => l.levelType === "resistance" || l.levelType === "order_block" || l.price > currentReference)
      .sort((a, b) => a.price - b.price);

    const entry = resistances[0]?.price ?? Number((currentReference * 1.005).toFixed(5));
    const invalidation = Number((entry * 1.008).toFixed(5));
    const risk = invalidation - entry;
    const tp1 = Number((entry - risk * 1.5).toFixed(5));
    const tp2 = Number((entry - risk * 2.5).toFixed(5));
    const tp3 = Number((entry - risk * 4.0).toFixed(5));

    return {
      name: "Alternative Bearish Rejection Setup",
      direction: "bearish",
      trigger: `Bearish rejection wick and order flow shift at premium supply near ${entry}`,
      entryPrice: entry,
      orderType: "limit",
      limitPrice: entry,
      invalidationPrice: invalidation,
      targetPrices: [tp1, tp2, tp3],
      targetRationale: [
        "TP1 — 1.5R partial at range equilibrium",
        "TP2 — 2.5R structural sell-side liquidity pool",
        "TP3 — 4.0R extended downward expansion target",
      ],
      rationale:
        "Premium supply rejection setup if price sweeps buy-side liquidity into resistance.",
    };
  }
}
