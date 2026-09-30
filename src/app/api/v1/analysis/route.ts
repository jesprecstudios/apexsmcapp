import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { runGeminiAnalysis } from "@/lib/ai/gemini-service";
import { AnalysisStrategy } from "@/lib/ai/types";

const requestSchema = z.object({
  snapshotId: z.string().optional(),
  imageUrl: z.string().optional(),
  imageBase64: z.string().optional(),
  symbol: z.string().min(1, "Symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  strategy: z.enum(["smc", "chart_patterns", "candlestick_reversals", "combined", "signals"]),
  customPrompt: z.string().optional(),
  riskProfile: z
    .object({
      accountBalance: z.number().positive().max(1_000_000_000),
      // Percent expressed as a fraction: 0.01 = 1%.
      riskPercent: z.number().gt(0).max(0.1),
      maxMarginFraction: z.number().gt(0).max(1).optional(),
    })
    .optional(),
  chartContext: z
    .object({
      // Must match ChartContext["visibleRange"] in lib/charting/types.ts,
      // whose from/to are candle timestamps (ISO date strings) or unix seconds.
      visibleRange: z
        .object({
          from: z.union([z.string(), z.number()]),
          to: z.union([z.string(), z.number()]),
        })
        .optional(),
      candleCount: z.number().optional(),
      lastPrice: z.number().optional(),
      highPrice: z.number().optional(),
      lowPrice: z.number().optional(),
      dataSource: z.enum(["live", "simulated"]).optional(),
      candlesSample: z
        .array(
          z.object({
            time: z.union([z.number(), z.string()]),
            open: z.number(),
            high: z.number(),
            low: z.number(),
            close: z.number(),
            volume: z.number().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Run the Gemini multimodal analysis
    const analysisResult = await runGeminiAnalysis({
      snapshotId: validated.snapshotId,
      imageUrl: validated.imageUrl,
      imageBase64: validated.imageBase64,
      symbol: validated.symbol,
      timeframe: validated.timeframe,
      strategy: validated.strategy as AnalysisStrategy,
      customPrompt: validated.customPrompt,
      riskProfile: validated.riskProfile,
      chartContext: validated.chartContext,
    });

    let savedAnalysisId = `local-analysis-${Date.now()}`;

    // If authenticated, persist analysis to Supabase DB
    if (user) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAnalysis, error: dbError } = await (supabase.from("analyses") as any)
          .insert({
            user_id: user.id,
            snapshot_id: validated.snapshotId && !validated.snapshotId.startsWith("simulated") ? validated.snapshotId : null,
            symbol: validated.symbol,
            timeframe: validated.timeframe,
            strategy: validated.strategy.toUpperCase(),
            custom_question: validated.customPrompt || null,
            status: analysisResult.status === "insufficient_data" ? "insufficient_data" : "completed",
            bias: analysisResult.bias.toUpperCase(),
            confluence_score: analysisResult.confluence.score,
            result: analysisResult,
            model_name: analysisResult.modelMetadata?.modelName || "gemini",
            prompt_version: "v1.0",
            processing_duration_ms: analysisResult.modelMetadata?.latencyMs || 0,
          })
          .select("id")
          .single();

        if (!dbError && dbAnalysis) {
          savedAnalysisId = (dbAnalysis as { id: string }).id;

          // Record usage telemetry event
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("usage_events") as any).insert({
            user_id: user.id,
            analysis_id: savedAnalysisId,
            provider: "google_genai",
            model_id: analysisResult.modelMetadata?.modelName || "gemini",
            input_tokens: 1500, // estimated
            output_tokens: 800, // estimated
            cost_estimate_usd: 0.00035,
            status: analysisResult.status === "insufficient_data" ? "insufficient_data" : "success",
          });
        } else if (dbError) {
          console.warn("Could not persist analysis record to Supabase:", dbError.message);
        }
      } catch (insertErr) {
        console.warn("Error inserting analysis record:", insertErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysisId: savedAnalysisId,
      data: analysisResult,
      analysis: analysisResult,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to process analysis request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ analyses: [], count: 0 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const strategy = searchParams.get("strategy");
    const bias = searchParams.get("bias");
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("analyses") as any)
      .select("*, snapshots(storage_path, visible_range)", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (symbol) {
      query = query.ilike("symbol", `%${symbol}%`);
    }
    if (strategy) {
      query = query.eq("strategy", strategy.toUpperCase());
    }
    if (bias) {
      query = query.eq("bias", bias.toUpperCase());
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      analyses: data || [],
      count: count || 0,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to fetch analysis history" },
      { status: 500 }
    );
  }
}
