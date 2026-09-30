import { getSymbolMeta } from "@/lib/charting/data-generator";
import { MarketDataUnavailableError } from "./twelve-data";
import { mapTimeframeToDerivGranularity, unixToIso } from "./types";
import type { OHLCData } from "@/lib/charting/types";

/**
 * Public market-data endpoint. Requires NO app_id and NO auth token.
 * Auth is only needed for account and trading calls, which this app does not
 * make. Verified live: returns real synthetic-index candles.
 */
const DERIV_PUBLIC_WS = "wss://api.derivws.com/trading/v1/options/ws/public";

/**
 * Live synthetic-index data via Deriv's public WebSocket API.
 *
 * ticks_history / ticks are documented as "No auth" market-data endpoints, so
 * there is nothing to configure: the provider works out of the box. An
 * optional DERIV_APP_ID is still sent when present, which some deployments
 * use for quota attribution, but it is not required.
 */
export class DerivProvider {
  readonly name = "deriv";

  get isConfigured(): boolean {
    return true;
  }

  async getCandles(params: {
    symbol: string;
    timeframe: string;
    count: number;
  }): Promise<OHLCData[]> {
    const meta = getSymbolMeta(params.symbol);
    const derivSymbol = meta.derivSymbol || params.symbol;

    const raw = await this.request({
      ticks_history: derivSymbol,
      adjust_start_time: 1,
      count: params.count,
      end: "latest",
      granularity: mapTimeframeToDerivGranularity(params.timeframe),
      style: "candles",
    });

    const list = (raw.candles as DerivCandle[] | undefined) ?? [];
    if (list.length === 0) {
      throw new MarketDataUnavailableError(
        `Deriv returned no candles for ${derivSymbol} on ${params.timeframe}.`
      );
    }

    const candles: OHLCData[] = list.map((c) => ({
      time: c.epoch,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));

    // The chart asserts strictly ascending, unique timestamps.
    return candles
      .sort((a, b) => Number(a.time) - Number(b.time))
      .filter((c, i, arr) => i === 0 || Number(c.time) !== Number(arr[i - 1].time));
  }

  /** Latest spot price for the synthetic index, used for the ticker readout. */
  async getQuote(symbol: string) {
    const meta = getSymbolMeta(symbol);
    const raw = await this.request({
      ticks: meta.derivSymbol || symbol,
      subscribe: 1,
    });
    const tick = raw.tick as DerivTick | undefined;
    if (!tick) return null;
    const price = Number(tick.quote);
    return {
      symbol: meta.symbol,
      open: price,
      high: price,
      low: price,
      close: price,
      timestamp: unixToIso(Number(tick.epoch)),
    };
  }

  private request(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    // app_id is optional here; only send it if the operator configured one.
    const appId = (process.env.DERIV_APP_ID || "").trim();
    const url = appId
      ? `${DERIV_PUBLIC_WS}?app_id=${encodeURIComponent(appId)}`
      : DERIV_PUBLIC_WS;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const timeout = setTimeout(() => {
        try { socket.close(); } catch { /* noop */ }
        reject(
          new MarketDataUnavailableError(
            "Deriv WebSocket timed out. The endpoint may be blocked by your network."
          )
        );
      }, 15000);

      socket.addEventListener("open", () => socket.send(JSON.stringify(payload)));

      socket.addEventListener("message", (event: MessageEvent) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        if (msg.error) {
          clearTimeout(timeout);
          try { socket.close(); } catch { /* noop */ }
          const err = msg.error as { code?: string; message?: string };
          reject(
            new MarketDataUnavailableError(
              err.message || "Deriv request failed." + (err.code ? ` (${err.code})` : "")
            )
          );
          return;
        }
        if (msg.candles || msg.tick) {
          clearTimeout(timeout);
          try { socket.close(); } catch { /* noop */ }
          resolve(msg);
        }
      });

      socket.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(
          new MarketDataUnavailableError(
            "Could not reach the Deriv WebSocket. It may be blocked by your network or firewall."
          )
        );
      });
    });
  }
}

interface DerivCandle {
  epoch: number;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface DerivTick {
  epoch: number;
  quote: string;
}
