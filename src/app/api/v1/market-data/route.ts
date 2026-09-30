import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchLiveCandles,
  isSyntheticSymbol,
  marketDataReadiness,
} from "@/lib/market";
import { MarketDataUnavailableError } from "@/lib/market/twelve-data";

const querySchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  count: z.coerce.number().int().min(10).max(500).default(100),
});

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for live candles.
 *
 * The Twelve Data key must never reach the browser, and Twelve Data does not
 * send permissive CORS headers, so the client goes through this route.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    symbol: searchParams.get("symbol"),
    timeframe: searchParams.get("timeframe"),
    count: searchParams.get("count") ?? 100,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { symbol, timeframe, count } = parsed.data;

  try {
    const result = await fetchLiveCandles({ symbol, timeframe, count });
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof MarketDataUnavailableError) {
      // Deriv requires no credentials, so a synthetic-symbol failure is always
      // an upstream or network problem, never a missing-key problem.
      const needsKey = !isSyntheticSymbol(symbol) && !marketDataReadiness().twelvedata;

      return NextResponse.json(
        {
          error: error.message,
          code: needsKey ? "PROVIDER_NOT_CONFIGURED" : "PROVIDER_UNAVAILABLE",
          symbol,
          provider: isSyntheticSymbol(symbol) ? "deriv" : "twelvedata",
        },
        { status: 503 }
      );
    }

    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Failed to load market data" },
      { status: 500 }
    );
  }
}
