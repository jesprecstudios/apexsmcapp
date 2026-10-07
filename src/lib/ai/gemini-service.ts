import { GoogleGenAI } from "@google/genai";
import { AnalysisRequestPayload, AnalysisResult } from "./types";
import { MASTER_SYSTEM_PROMPT } from "./prompts/master";
import { getStrategy } from "./strategy-registry";
import { validateAndNormalizeAnalysis } from "./schema";
import { extractJsonObject } from "./json-extract";
import { withTradePlan } from "./trade-plan";
import { getSymbolMeta } from "@/lib/charting/data-generator";
import { extractComprehensiveIntelligence } from "@/lib/charting/market-intelligence";
import type { OHLCData } from "@/lib/charting/types";

/**
 * How many OHLC bars to include in the prompt. Structure analysis (order
 * blocks, FVGs, breaks of structure) needs real history, not just the last
 * handful of bars, so this is deliberately far above a screenshot's worth of
 * visible detail while staying small enough to be cheap in tokens.
 */
const MAX_CANDLES_IN_PROMPT = 60;

/**
 * Server-side Gemini AI Analysis Service.
 * Follows Product Implementation Plan Section 5.3 and Section 5.5.
 */
export async function runGeminiAnalysis(
  payload: AnalysisRequestPayload
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const startTime = Date.now();

  // If API key is not configured, follow Rule 8: return an explicit handled response
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    return {
      status: "insufficient_data",
      bias: "undetermined",
      symbol: payload.symbol,
      timeframe: payload.timeframe,
      summary:
        "Analysis service is currently offline. Please configure server credentials to activate live market scanning.",
      confluence: {
        score: 0,
        factors: [
          {
            name: "Service Status",
            contribution: 0,
            evidence: "Market analysis service is awaiting configuration.",
          },
        ],
      },
      keyLevels: [],
      scenarios: [],
      reasoning: [
        {
          observation: "Service connection pending",
          interpretation:
            "Technical chart analysis will resume once the service configuration is active.",
          timeframe: payload.timeframe,
          evidenceSource: "chart_image",
        },
      ],
      limitations: [
        "Live technical scanning paused.",
        "Awaiting service connection.",
      ],
      modelMetadata: {
        modelName: "unconfigured",
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const strategy = getStrategy(payload.strategy);

  // Prepare candle context string & rich technical intelligence
  let candleContextStr = "No structured candle data provided.";
  let technicalIntelligenceStr = "";

  if (payload.chartContext) {
    const { lastPrice, highPrice, lowPrice, candleCount, candlesSample, dataSource } =
      payload.chartContext;
    const provenance =
      dataSource === "simulated"
        ? `\n- DATA PROVENANCE: SIMULATED (generated locally, NOT live market data). You MUST frame every observation and level as hypothetical and you MUST state in your limitations that these are not real market levels.\n`
        : dataSource === "live"
          ? "\n- DATA PROVENANCE: LIVE market data. Treat these prices as authoritative.\n"
          : "";

    if (candlesSample && candlesSample.length > 0) {
      const intel = extractComprehensiveIntelligence(candlesSample as OHLCData[]);
      technicalIntelligenceStr = `\nTECHNICAL & SMC INTELLIGENCE AUDIT:\n${intel.formattedPromptContext}\n`;
    }

    candleContextStr = `
- Last Price: ${lastPrice ?? "N/A"}
- Session High: ${highPrice ?? "N/A"}
- Session Low: ${lowPrice ?? "N/A"}
- Total Visible Candles: ${candleCount ?? "N/A"}
${provenance}${
  candlesSample && candlesSample.length > 0
    ? `- Recent Candle Samples (last ${candlesSample.length}, oldest first):\n` +
      candlesSample
        .slice(-MAX_CANDLES_IN_PROMPT)
        .map(
          (c) =>
            `  Time: ${c.time} | O: ${c.open} | H: ${c.high} | L: ${c.low} | C: ${c.close}`
        )
        .join("\n")
    : ""
}
${technicalIntelligenceStr}
    `.trim();
  }

  // Build the user prompt combining strategy directives, asset context, and optional inquiry
  const userPromptText = `
INSTRUMENT: ${payload.symbol}
TIMEFRAME: ${payload.timeframe}
SELECTED STRATEGY: ${strategy.label} (${strategy.shortLabel})

STRUCTURED MARKET DATA & TECHNICAL AUDIT:
${candleContextStr}

${payload.customPrompt ? `SPECIFIC USER INQUIRY / FOCUS:\n"${payload.customPrompt}"\n` : ""}
${buildRiskContext(payload.riskProfile)}

MANDATORY EXECUTION RULES:
- Provide TWO actionable scenarios in "scenarios" whenever market structure allows:
  1) Scenario 1 ("Primary Execution Scenario"): The setup aligned with the dominant higher-timeframe order flow / structural bias.
  2) Scenario 2 ("Alternative Execution Scenario"): The opposing directional setup (e.g., if Primary is Bearish Short, provide a Bullish Long setup from discount demand, key support, or sell-side liquidity sweep rebound; if Primary is Bullish Long, provide a Bearish Short setup from premium supply, key resistance, or buy-side liquidity sweep rejection).
- For EACH scenario:
  - "direction" MUST be "bullish" (for Buy / Long trade) or "bearish" (for Sell / Short trade).
  - Provide EXACTLY 3 targets in targetPrices, in order of increasing reward. For longs, targets MUST sit above entry (TP1 < TP2 < TP3); for shorts, targets MUST sit below entry (TP1 > TP2 > TP3).
  - entryPrice MUST be a concrete number derived from structure you can see (order block edge, FVG boundary, broken level, or retest level). Never answer "at market" with null if a defensible level exists.
  - Invalidation must sit beyond the structure that would void the idea (below demand/support for bullish longs; above supply/resistance for bearish shorts), not at an arbitrary round number.
  - Use orderType "limit" when the setup calls for a resting pullback entry, "stop" for a breakout entry, and "market" only when price is already at the trigger.
  - Do NOT compute lot size, risk amounts or margin. Those are calculated deterministically from the trader's account settings. Report structure and levels only.

STRATEGY DIRECTIVE & INSTRUCTIONS:
${strategy.promptText}

REQUIRED OUTPUT FORMAT:
You MUST respond with a single, valid JSON object matching the following structure:
{
  "status": "complete" | "insufficient_data" | "partial",
  "bias": "bullish" | "bearish" | "neutral" | "undetermined",
  "symbol": "${payload.symbol}",
  "timeframe": "${payload.timeframe}",
  "summary": "Concise executive overview of the institutional order flow or structural setup (2-3 sentences)",
  "confluence": {
    "score": number between 0 and 100 representing technical evidence alignment,
    "factors": [
      {
        "name": "Category name (e.g. Higher-timeframe structure, Liquidity sweep, Order block / FVG, etc.)",
        "contribution": number (points allocated),
        "evidence": "Concrete visual or structural observation from this chart"
      }
    ]
  },
  "keyLevels": [
    {
      "label": "e.g. H1 Bullish Order Block / Asian Lows Swept / Neckline",
      "price": exact positive number,
      "timeframe": "${payload.timeframe}",
      "levelType": "support" | "resistance" | "order_block" | "fair_value_gap" | "liquidity" | "invalidation" | "target" | "other",
      "evidence": "Description of why this price is significant",
      "confidence": number between 0 and 100
    }
  ],
  "scenarios": [
    {
      "name": "Primary Execution Scenario",
      "direction": "bullish" | "bearish",
      "trigger": "Specific price action trigger (e.g., M15 CHoCH after tapping H1 FVG at 1.0840)",
      "entryPrice": number (the exact price to enter, or null if you cannot identify one),
      "orderType": "market" | "limit" | "stop" | "none",
      "limitPrice": number (price to hang the resting order, or null),
      "invalidationPrice": number (structural stop loss) or null,
      "targetPrices": [number array of exactly 3 targets in order of increasing reward],
      "targetRationale": ["what TP1 represents", "what TP2 represents", "what TP3 represents"],
      "rationale": "Why this risk-to-reward scenario is technically justified"
    },
    {
      "name": "Alternative Execution Scenario",
      "direction": "bullish" | "bearish",
      "trigger": "Opposing price action trigger (e.g., Bullish reversal from Demand at 1.0780)",
      "entryPrice": number,
      "orderType": "market" | "limit" | "stop" | "none",
      "limitPrice": number,
      "invalidationPrice": number,
      "targetPrices": [number array of exactly 3 targets],
      "targetRationale": ["what TP1 represents", "what TP2 represents", "what TP3 represents"],
      "rationale": "Why this opposing setup is technically justified"
    }
  ],
  "reasoning": [
    {
      "observation": "What is visually observed on the chart",
      "interpretation": "Institutional meaning / market mechanic",
      "timeframe": "${payload.timeframe}",
      "evidenceSource": "chart_image" | "ohlc_data" | "user_drawing"
    }
  ],
  "limitations": [
    "List of technical limitations, missing timeframes, or upcoming high-impact economic risks"
  ],
  "aiDrawings": {
    "supportResistance": [
      { "price": number, "type": "support" | "resistance", "label": "e.g. Key Support Level", "strength": "major" | "minor" }
    ],
    "trendlines": [
      { "startPrice": number, "endPrice": number, "type": "support" | "resistance" | "trend", "label": "e.g. Bullish Trendline" }
    ],
    "orderBlocks": [
      { "high": number, "low": number, "type": "bullish_ob" | "bearish_ob", "label": "e.g. H1 Demand Zone" }
    ],
    "tradeSetup": {
      "direction": "long" | "short",
      "entry": number,
      "stopLoss": number,
      "tp1": number,
      "tp2": number,
      "tp3": number,
      "riskRewardRatio": number
    }
  }
}
`.trim();

  // Prepare parts for the request
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: userPromptText }];

  // Attach Image part if base64 or imageUrl is provided
  if (payload.imageBase64) {
    const cleanBase64 = payload.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64,
      },
    });
  } else if (payload.imageUrl && !payload.imageUrl.startsWith("data:")) {
    try {
      const imgRes = await fetch(payload.imageUrl);
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const contentType = imgRes.headers.get("content-type") || "image/png";
        parts.push({
          inlineData: {
            mimeType: contentType,
            data: base64Data,
          },
        });
      }
    } catch (fetchErr) {
      console.warn("Could not fetch image from imageUrl, continuing with text-only context:", fetchErr);
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    /**
     * Fallbacks deliberately mix model generations and tiers. A list made only
     * of 3.x-flash variants failed as a group under load, which left every
     * strategy tab rendering the "connection error" placeholder. The stable
     * 2.5 line and the lite tier are the safety net.
     */
    const candidateModels = Array.from(
      new Set([
        modelName,
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
      ])
    );

    const OVERLOADED = /UNAVAILABLE|overloaded|high demand|rate limit|429|503|RESOURCE_EXHAUSTED/i;

    let lastError: Error | null = null;
    let responseText = "";
    let executedModel = modelName;

    for (const candidate of candidateModels) {
      // Transient capacity errors deserve one immediate retry before we give up
      // on this model and move down the list.
      const attempts = 2;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: [
              {
                role: "user",
                parts: parts,
              },
            ],
            config: {
              systemInstruction: MASTER_SYSTEM_PROMPT,
              responseMimeType: "application/json",
              temperature: 0.15,
            },
          });

          if (response.text) {
            responseText = response.text;
            executedModel = candidate;
            break;
          }

          lastError = new Error(`Model ${candidate} returned an empty response.`);
        } catch (err: unknown) {
          const error = err as Error;
          lastError = error;

          const retryable = OVERLOADED.test(error.message);
          if (!retryable) {
            console.warn(`Model ${candidate} failed with a non-transient error: ${error.message}`);
            break;
          }

          if (attempt < attempts) {
            const backoffMs = 700 * attempt;
            console.warn(
              `Model ${candidate} attempt ${attempt}/${attempts} hit capacity (${error.message.slice(0, 120)}). Retrying in ${backoffMs}ms.`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (responseText) break;
    }

    if (!responseText) {
      throw (
        lastError ||
        new Error("All Gemini candidate models failed or returned empty content")
      );
    }

    const parsedRaw = extractJsonObject(responseText);
    if (parsedRaw === undefined) {
      console.error("Failed to extract JSON from Gemini output:", responseText.slice(0, 500));
      throw new Error("Gemini response did not contain a valid JSON object");
    }

    // Validate and enforce cross-field business logic
    const validated = validateAndNormalizeAnalysis(
      parsedRaw,
      payload.symbol,
      payload.timeframe
    );

    const latencyMs = Date.now() - startTime;

    // Attach the deterministic trade plan. The model provides structure; the
    // lot size, risk amount and R multiples are computed in code so the trader
    // never acts on a number the model invented.
    const withPlan = withTradePlan(
      { ...validated } as AnalysisResult,
      payload.riskProfile,
      getSymbolMeta(payload.symbol),
      payload.chartContext?.lastPrice
    );

    return {
      ...withPlan,
      modelMetadata: {
        modelName: executedModel,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Gemini API call failed:", err);

    /**
     * Distinguish "the model is overloaded" from "the chart genuinely lacks
     * data". The previous version returned this same shape for both, so an
     * upstream outage looked identical to a valid 'insufficient data' verdict
     * and every strategy tab appeared broken with no way to tell why.
     */
    const serviceUnavailable = /UNAVAILABLE|overloaded|high demand|rate limit|429|503|deadline|fetch failed|ECONN|ETIMEDOUT|All Gemini candidate models/i.test(
      err.message || ""
    );

    return {
      status: "insufficient_data" as const,
      bias: "undetermined" as const,
      symbol: payload.symbol,
      timeframe: payload.timeframe,
      summary: serviceUnavailable
        ? `The analysis service is temporarily unavailable (${err.message}). This is a service problem, not a verdict on the chart. Try again shortly.`
        : `Market analysis could not be completed: ${err.message || "Connection error"}.`,
      confluence: {
        score: 0,
        factors: [
          {
            name: "Connection Status",
            contribution: 0,
            evidence: `Service error encountered: ${err.message || "Network timeout"}`,
          },
        ],
      },
      keyLevels: [],
      scenarios: [],
      reasoning: [
        {
          observation: serviceUnavailable
            ? "Analysis service unavailable"
            : "Analysis request failed",
          interpretation: serviceUnavailable
            ? "Every candidate Gemini model was rate limited or overloaded. No analysis was performed and no levels were computed."
            : "The market analysis request failed before it could be validated.",
          timeframe: payload.timeframe,
          evidenceSource: "ohlc_data" as const,
        },
      ],
      limitations: serviceUnavailable
        ? [
            "No analysis was produced. This is a temporary service capacity problem, not a finding about the market.",
            "Do not trade on this result. Re-run the analysis once the service recovers.",
          ]
        : ["Analysis pipeline encountered an external error.", err.message || "Unknown error"],
      modelMetadata: {
        modelName: serviceUnavailable ? "unavailable" : modelName,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Tells the model the trader's risk budget so it can judge whether a setup is
 * worth taking, while making clear that all arithmetic is done downstream.
 */
function buildRiskContext(riskProfile: AnalysisRequestPayload["riskProfile"]): string {
  if (!riskProfile) return "";
  return `
TRADER RISK BUDGET (context only, do not compute from it):
- Account balance: ${riskProfile.accountBalance}
- Risk per trade: ${(riskProfile.riskPercent * 100).toFixed(2)}%
Lot size, risk amount and margin are calculated deterministically after your response.
Your job is to set structural levels that make sense for a stop of this width. If a valid
stop would require an unusually wide distance, say so in the scenario rationale and prefer
structural invalidation over an arbitrary tight stop.
`;
}
