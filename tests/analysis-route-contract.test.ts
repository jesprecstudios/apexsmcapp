import { describe, it, expect } from "vitest";
import { POST as analysisPOST } from "../src/app/api/v1/analysis/route";

/**
 * Contract test: verifies the exact payload the client sends from
 * terminal/page.tsx -> handleSnapshotAnalyze() is accepted by the
 * POST /api/v1/analysis Zod request schema.
 *
 * The client derives chartContext from ChartContext (lib/charting/types.ts):
 *   visibleRange.from / .to  =>  string | number  (adapters return candle date strings)
 *   lastPrice/highPrice/lowPrice => number
 *
 * Regression guard: the schema previously required z.number() for both bounds,
 * so the real client payload was rejected with HTTP 400 "Validation failed"
 * and "Analyze Chart" never produced a result.
 *
 * These assertions check that the request clears request validation and reaches
 * the handler body. Reaching the authenticated/AI path requires real Supabase +
 * Gemini credentials, which are intentionally absent in CI.
 */
function buildClientPayload(visibleRange: { from: string | number; to: string | number }) {
  return {
    snapshotId: "simulated-snapshot-1",
    imageUrl: "data:image/png;base64,AAAA",
    imageBase64: "data:image/png;base64,AAAA",
    symbol: "EUR/USD",
    timeframe: "H1",
    strategy: "smc",
    chartContext: {
      visibleRange,
      lastPrice: 1.08642,
      highPrice: 1.0872,
      lowPrice: 1.0834,
    },
  };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postAndRead(body: unknown) {
  const res = await analysisPOST(makeRequest(body) as never);
  return { status: res.status, body: await res.json() };
}

describe("POST /api/v1/analysis request contract", () => {
  it("accepts string visibleRange (what the chart adapters actually return)", async () => {
    const { status, body } = await postAndRead(
      buildClientPayload({ from: "2026-09-28", to: "2026-09-30" })
    );

    expect(body.error).not.toBe("Validation failed");
    expect(status).not.toBe(400);
  });

  it("accepts numeric visibleRange", async () => {
    const { status, body } = await postAndRead(
      buildClientPayload({ from: 1756339200, to: 1756512000 })
    );

    expect(body.error).not.toBe("Validation failed");
    expect(status).not.toBe(400);
  });

  it("still rejects a genuinely invalid symbol", async () => {
    const { status, body } = await postAndRead({
      ...buildClientPayload({ from: 1, to: 2 }),
      symbol: "",
    });

    expect(status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });

  it("still rejects an unsupported strategy", async () => {
    const { status, body } = await postAndRead({
      ...buildClientPayload({ from: 1, to: 2 }),
      strategy: "not_a_strategy",
    });

    expect(status).toBe(400);
    expect(body.error).toBe("Validation failed");
  });
});
