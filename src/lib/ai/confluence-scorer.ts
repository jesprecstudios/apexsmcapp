import { ConfluenceFactor, ConfluenceScore } from "./types";

export interface ConfluenceCategoryWeight {
  category: string;
  weight: number;
}

export const DEFAULT_CONFLUENCE_WEIGHTS: Record<string, number> = {
  "Higher-timeframe structure": 25,
  "Liquidity and sweep evidence": 20,
  "Order block / FVG alignment": 20,
  "Lower-timeframe confirmation": 20,
  "Candlestick or pattern confirmation": 15,
};

/**
 * Calculates normalized confluence score as specified in PRD Section 5.6.
 * Score = (Sum(wi * ei) / Sum(wi)) * 100
 */
export function calculateConfluenceScore(
  evaluations: Array<{ category: string; evidence: string; quality: number }>
): ConfluenceScore {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const factors: ConfluenceFactor[] = [];

  for (const item of evaluations) {
    const weight = DEFAULT_CONFLUENCE_WEIGHTS[item.category] || 15;
    // item.quality is clamped between 0 and 1
    const clampedQuality = Math.max(0, Math.min(1, item.quality));
    const contribution = Math.round(weight * clampedQuality);

    totalWeightedScore += weight * clampedQuality;
    totalWeight += weight;

    factors.push({
      name: item.category,
      contribution,
      evidence: item.evidence,
    });
  }

  const finalScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 50;

  return {
    score: Math.max(0, Math.min(100, finalScore)),
    factors,
  };
}
