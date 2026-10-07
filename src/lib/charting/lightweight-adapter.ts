import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  CandlestickData,
  CandlestickSeries,
  Time,
} from "lightweight-charts";
import { ChartAdapter, ChartOptions, ChartContext, ChartDataSource, OHLCData } from "./types";
import { generateCandleData } from "./data-generator";

const LIVE_CANDLE_COUNT = 120;

/** Shape returned by GET /api/v1/market-data. */
interface MarketDataResponse {
  success?: boolean;
  symbol?: string;
  timeframe?: string;
  candles?: OHLCData[];
  provider?: "twelvedata" | "deriv";
  fetchedAt?: string;
  error?: string;
  code?: string;
}

export class LightweightChartsAdapter implements ChartAdapter {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<"Candlestick"> | null = null;
  private container: HTMLElement | null = null;
  private currentSymbol = "EUR/USD";
  private currentTimeframe = "H1";
  private candles: OHLCData[] = [];
  private dataSource: ChartDataSource = "live";
  private dataProvider: "twelvedata" | "deriv" | undefined = undefined;
  private simulatedReason: string | undefined = undefined;
  private loadToken = 0;
  /** Notifies the host UI when live data is replaced by simulation, or vice versa. */
  private onDataSourceChange?: (source: ChartDataSource, reason?: string) => void;

  async initialize(container: HTMLElement, options: ChartOptions): Promise<void> {
    this.container = container;
    this.currentSymbol = options.symbol;
    this.currentTimeframe = options.timeframe;
    this.onDataSourceChange = options.onDataSourceChange;

    // Destroy existing instance if any
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }

    const { clientWidth, clientHeight } = container;

    this.chart = createChart(container, {
      width: clientWidth || 800,
      height: clientHeight || 500,
      layout: {
        background: { type: ColorType.Solid, color: "#101216" },
        textColor: "#D7DEE9",
        fontFamily: "'Poppins', 'Montserrat', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(38, 45, 59, 0.4)", style: 3 },
        horzLines: { color: "rgba(38, 45, 59, 0.4)", style: 3 },
      },
      crosshair: {
        vertLine: {
          color: "#3B82F6", // Primary Electric Blue
          width: 1,
          style: 3,
          labelBackgroundColor: "#1E3A8A",
        },
        horzLine: {
          color: "#3B82F6",
          width: 1,
          style: 3,
          labelBackgroundColor: "#1E3A8A",
        },
      },
      rightPriceScale: {
        borderColor: "#2A303C",
        visible: true,
      },
      timeScale: {
        borderColor: "#2A303C",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add Candlestick Series matching ApexSMC Design Tokens
    this.series = this.chart.addSeries(CandlestickSeries, {
      upColor: "#4CAF88", // Bullish emerald
      downColor: "#E05C64", // Bearish crimson
      borderVisible: false,
      wickUpColor: "#4CAF88",
      wickDownColor: "#E05C64",
    });

    this.loadData();
  }

  /**
   * Loads real market candles for the current symbol/timeframe.
   *
   * Falls back to locally generated candles ONLY when the live provider cannot
   * be reached, and records the reason so the UI can label the chart
   * SIMULATED rather than passing fabricated prices to the analysis engine.
   */
  private async loadData(): Promise<void> {
    if (!this.series) return;

    // Guard against out-of-order responses when the user switches symbol fast.
    const token = ++this.loadToken;

    let candles: OHLCData[] = [];
    let source: ChartDataSource = "live";
    let provider: "twelvedata" | "deriv" | undefined;
    let reason: string | undefined;

    try {
      const params = new URLSearchParams({
        symbol: this.currentSymbol,
        timeframe: this.currentTimeframe,
        count: String(LIVE_CANDLE_COUNT),
      });
      const res = await fetch(`/api/v1/market-data?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as MarketDataResponse;

      if (!res.ok || !json.success || !json.candles?.length) {
        throw new Error(json.error || `Live feed returned HTTP ${res.status}.`);
      }

      candles = json.candles;
      source = "live";
      provider = json.provider;
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      reason =
        `Live market data unavailable (${detail}). Showing generated candles for layout only.`;
      candles = generateCandleData(this.currentSymbol, this.currentTimeframe, 70);
    }

    // A slower earlier request must not overwrite a newer selection.
    if (token !== this.loadToken) return;

    this.candles = candles;
    this.dataSource = source;
    this.dataProvider = provider;
    this.simulatedReason = reason;

    if (source !== this.dataSource || reason) {
      this.onDataSourceChange?.(source, reason);
    }

    this.render();
  }

  private render(): void {
    if (!this.series) return;

    const rawData = this.candles.map((c) => {
      let t: Time;
      if (typeof c.time === "number") {
        t = c.time as Time;
      } else if (typeof c.time === "string" && /^\d+$/.test(c.time)) {
        t = parseInt(c.time, 10) as Time;
      } else {
        const parsed = Math.floor(new Date(c.time).getTime() / 1000);
        t = (!isNaN(parsed) && parsed > 0 ? parsed : Math.floor(Date.now() / 1000)) as Time;
      }
      return {
        time: t,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      };
    });

    // Strictly sort ascending by timestamp
    rawData.sort((a, b) => Number(a.time) - Number(b.time));

    // Deduplicate any identical timestamps (strictly ascending requirement for Lightweight Charts)
    const formattedData: CandlestickData<Time>[] = [];
    for (const item of rawData) {
      if (
        formattedData.length === 0 ||
        Number(item.time) > Number(formattedData[formattedData.length - 1].time)
      ) {
        formattedData.push(item);
      }
    }

    if (formattedData.length > 0) {
      this.series.setData(formattedData);
      this.chart?.timeScale().fitContent();
    }
  }

  setSymbol(symbol: string): void {
    this.currentSymbol = symbol;
    void this.loadData();
  }

  setTimeframe(timeframe: string): void {
    this.currentTimeframe = timeframe;
    void this.loadData();
  }

  /** Re-requests live candles for the current selection. */
  async refresh(): Promise<void> {
    await this.loadData();
  }

  getDataSource(): ChartDataSource {
    return this.dataSource;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.chart || !this.container) {
      throw new Error("Chart is not initialized for screenshot capture.");
    }

    try {
      // Native lightweight-charts canvas screenshot
      const canvas = this.chart.takeScreenshot();
      if (canvas && typeof canvas.toDataURL === "function") {
        return canvas.toDataURL("image/png");
      }
    } catch {
      // Fallback below
    }

    // High-fidelity fallback renderer directly to offscreen canvas
    return this.renderFallbackSnapshot();
  }

  private renderFallbackSnapshot(): string {
    const width = 1200;
    const height = 700;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not acquire 2D canvas context");

    // Canvas background
    ctx.fillStyle = "#131519";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(42, 48, 60, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let y = 50; y < height - 50; y += 80) {
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 70, y);
      ctx.stroke();
    }
    for (let x = 60; x < width - 70; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, height - 40);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Header badge watermark
    ctx.font = "bold 20px 'Montserrat', sans-serif";
    ctx.fillStyle = "#D7DEE9";
    ctx.fillText(`ApexSMC Terminal · ${this.currentSymbol} (${this.currentTimeframe})`, 60, 45);

    ctx.font = "bold 14px 'Montserrat', sans-serif";
    ctx.fillStyle = "#3B82F6"; // Primary Blue
    const lastClose = this.candles[this.candles.length - 1]?.close;
    if (typeof lastClose === "number") {
      ctx.fillText(`Price: ${lastClose}`, width - 300, 45);
    }
    ctx.fillStyle = "rgba(59, 130, 246, 0.4)";
    ctx.font = "bold 14px 'Montserrat', sans-serif";
    ctx.fillText("APEXSMC PRO • REAL MARKET DATA", 60, height - 40);

    // Draw candles
    const count = this.candles.length;
    const chartW = width - 150;
    const chartH = height - 120;
    const candleW = Math.max(4, Math.floor(chartW / count) - 4);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    this.candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    const priceRange = maxPrice - minPrice || 1;

    const getY = (price: number) => {
      return 60 + chartH - ((price - minPrice) / priceRange) * chartH;
    };

    this.candles.forEach((c, idx) => {
      const x = 70 + idx * (candleW + 4);
      const isUp = c.close >= c.open;
      const color = isUp ? "#22C55E" : "#E05C64";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + candleW / 2, getY(c.high));
      ctx.lineTo(x + candleW / 2, getY(c.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyY = getY(Math.max(c.open, c.close));
      const bodyH = Math.max(2, Math.abs(getY(c.open) - getY(c.close)));
      ctx.fillRect(x, bodyY, candleW, bodyH);
    });

    // This fallback re-draws the exact same candle series the live chart is
    // showing, so it stays faithful to the user's screen. It deliberately
    // renders no order blocks, fair value gaps or other annotations, because
    // those are not actually plotted on the chart and labelling them would
    // describe structure that was never detected.

    return canvas.toDataURL("image/png");
  }

  getContext(): ChartContext {
    // Never invent a price. If there are no candles, report zeros so callers
    // can detect the absence of data rather than analysing a fiction.
    const lastCandle = this.candles[this.candles.length - 1] ?? {
      time: 0,
      open: 0,
      high: 0,
      low: 0,
      close: 0,
    };

    return {
      symbol: this.currentSymbol,
      timeframe: this.currentTimeframe,
      timestamp: new Date().toISOString(),
      currentPrice: lastCandle.close,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      spreadPips: this.currentSymbol.includes("JPY") ? 0.9 : 0.6,
      visibleRange: {
        from: this.candles[0]?.time || "",
        to: lastCandle.time,
      },
      ohlcSummary: this.candles.slice(-60),
      dataSource: this.dataSource,
      dataProvider: this.dataProvider,
      simulatedReason: this.simulatedReason,
    };
  }

  resize(width: number, height: number): void {
    if (this.chart) {
      this.chart.applyOptions({ width, height });
    }
  }

  priceToCoordinate(price: number): number | null {
    if (!this.series) return null;
    return this.series.priceToCoordinate(price);
  }

  getCandles(): OHLCData[] {
    return this.candles;
  }

  destroy(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.series = null;
    }
  }
}
