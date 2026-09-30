import {
  ChartAdapter,
  ChartOptions,
  ChartContext,
  ChartCaptureUnsupportedError,
} from "./types";
import { getSymbolMeta } from "./data-generator";

const PROVIDER_LABEL = "TradingView / Deriv widget";

/**
 * Adapter for the TradingView / Deriv Charting embeddable widgets.
 *
 * Both widgets render inside a cross-origin iframe owned by the provider.
 * The same-origin policy prevents us from reading its pixels, and the
 * embeddable widget exposes no image-export or chart-context API.
 *
 * Consequently this adapter CANNOT produce a faithful snapshot. It reports
 * that limitation rather than re-drawing a chart from generated data, because
 * a re-drawn image would not match the chart the user is looking at and any
 * AI analysis of it would describe a market that never existed.
 *
 * "SMC Canvas" (LightweightChartsAdapter) is the analysis-capable engine.
 */
export class TradingViewWidgetAdapter implements ChartAdapter {
  private container: HTMLElement | null = null;
  private currentSymbol = "V75";
  private currentTimeframe = "60";
  private isDerivSynthetic = true;

  async initialize(container: HTMLElement, options: ChartOptions): Promise<void> {
    this.container = container;
    this.setSymbol(options.symbol);
    this.setTimeframe(options.timeframe);
    this.renderWidget();
  }

  private mapTimeframeToDerivTimePeriod(timeframe: string): string {
    switch (timeframe) {
      case "M1":
      case "1":
        return "1";
      case "M5":
      case "5":
        return "5";
      case "M15":
      case "15":
        return "15";
      case "H1":
      case "60":
        return "60";
      case "H4":
      case "240":
        return "240";
      case "D1":
      case "D":
      case "1440":
        return "1440";
      default:
        return "60";
    }
  }

  private renderWidget(): void {
    if (!this.container) return;
    this.container.innerHTML = "";

    const meta = getSymbolMeta(this.currentSymbol);
    this.isDerivSynthetic = meta.category === "synthetic";

    if (this.isDerivSynthetic) {
      // 1. Deriv Official TradingView Chart Platform Embed
      // Deriv's embed parser expects 'instrument' (e.g. instrument=CRASH1000).
      // When 'instrument' is missing or unrecognized, Deriv falls back to 'R_25' (Volatility 25).
      const derivSymbol = meta.derivSymbol || "R_75";
      const derivPeriod = this.mapTimeframeToDerivTimePeriod(this.currentTimeframe);
      const iframe = document.createElement("iframe");
      iframe.src = `https://charts.deriv.com/deriv?instrument=${encodeURIComponent(
        derivSymbol
      )}&symbol=${encodeURIComponent(
        derivSymbol
      )}&timePeriod=${derivPeriod}&theme=dark&hide-signup=true`;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.backgroundColor = "#131519";
      iframe.title = `Deriv TradingView Chart - ${meta.name}`;
      iframe.allow = "fullscreen";

      // Wrap in responsive container
      const wrapper = document.createElement("div");
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.position = "relative";
      wrapper.style.overflow = "hidden";
      wrapper.appendChild(iframe);

      this.container.appendChild(wrapper);
    } else {
      // 2. Standard TradingView Advanced Chart Widget
      const widgetOuter = document.createElement("div");
      widgetOuter.className = "tradingview-widget-container";
      widgetOuter.style.width = "100%";
      widgetOuter.style.height = "100%";
      widgetOuter.style.backgroundColor = "#131519";

      const widgetInner = document.createElement("div");
      widgetInner.className = "tradingview-widget-container__widget";
      widgetInner.style.width = "100%";
      widgetInner.style.height = "100%";
      widgetOuter.appendChild(widgetInner);

      let tvSymbol = "FX:EURUSD";
      const cleaned = this.currentSymbol.replace("/", "").toUpperCase();
      if (cleaned === "EURUSD" || cleaned === "GBPUSD" || cleaned === "USDJPY") {
        tvSymbol = `FX:${cleaned}`;
      } else if (cleaned === "XAUUSD") {
        tvSymbol = `OANDA:XAUUSD`;
      } else if (cleaned === "BTCUSD") {
        tvSymbol = `BINANCE:BTCUSDT`;
      }

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: this.currentTimeframe,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1", // Candlestick
        locale: "en",
        backgroundColor: "rgba(19, 21, 25, 1)",
        gridColor: "rgba(42, 46, 57, 0.5)",
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: true,
        save_image: true,
        calendar: false,
        hide_volume: false,
        support_host: "https://www.tradingview.com",
      });

      widgetOuter.appendChild(script);
      this.container.appendChild(widgetOuter);
    }
  }

  setSymbol(symbol: string): void {
    if (this.currentSymbol === symbol) return;
    this.currentSymbol = symbol;
    const meta = getSymbolMeta(symbol);
    this.isDerivSynthetic = meta.category === "synthetic";
    if (this.container) {
      this.renderWidget();
    }
  }

  setTimeframe(timeframe: string): void {
    const prev = this.currentTimeframe;
    if (timeframe === "M1") this.currentTimeframe = "1";
    else if (timeframe === "M5") this.currentTimeframe = "5";
    else if (timeframe === "M15") this.currentTimeframe = "15";
    else if (timeframe === "H1") this.currentTimeframe = "60";
    else if (timeframe === "H4") this.currentTimeframe = "240";
    else if (timeframe === "D1") this.currentTimeframe = "D";
    else this.currentTimeframe = "60";

    if (this.container && prev !== this.currentTimeframe) {
      this.renderWidget();
    }
  }

  async takeScreenshot(): Promise<string> {
    throw new ChartCaptureUnsupportedError(
      PROVIDER_LABEL,
      "Switch the chart engine to 'SMC Canvas' to run AI analysis."
    );
  }

  getContext(): ChartContext {
    throw new ChartCaptureUnsupportedError(
      PROVIDER_LABEL,
      "Switch the chart engine to 'SMC Canvas' to run AI analysis."
    );
  }

  resize(width: number, height: number): void {
    void width;
    void height;
    // Iframe handles 100% responsiveness automatically
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
