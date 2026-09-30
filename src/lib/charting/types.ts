export interface ChartOptions {
  symbol: string;
  timeframe: string;
  theme: "dark" | "light";
  autosize?: boolean;
  /** Called when the adapter swaps between live and simulated candles. */
  onDataSourceChange?: (source: ChartDataSource, reason?: string) => void;
}

export interface OHLCData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SMCOverlayData {
  orderBlocks: Array<{
    id: string;
    type: "BULLISH" | "BEARISH";
    high: number;
    low: number;
    startIndex: number;
    endIndex: number;
    mitigated: boolean;
  }>;
  fairValueGaps: Array<{
    id: string;
    type: "BULLISH" | "BEARISH";
    high: number;
    low: number;
    time: string;
  }>;
  breaksOfStructure: Array<{
    id: string;
    price: number;
    type: "BOS" | "CHOCH";
    direction: "BULLISH" | "BEARISH";
    time: string;
  }>;
  liquiditySweeps: Array<{
    id: string;
    price: number;
    type: "BSL" | "SSL";
    time: string;
  }>;
}

/**
 * Provenance of the candles currently rendered.
 *
 * "simulated" data is generated locally and MUST be labelled in the UI and
 * MUST NOT be presented to the analysis engine as market data.
 */
export type ChartDataSource = "live" | "simulated";

export interface ChartContext {
  symbol: string;
  timeframe: string;
  timestamp: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  spreadPips: number;
  visibleRange: {
    from: string | number;
    to: string | number;
  };
  ohlcSummary: OHLCData[];
  dataSource: ChartDataSource;
  /** Which upstream feed served the bars, when dataSource is "live". */
  dataProvider?: "twelvedata" | "deriv";
  /** Why live data was unavailable, when dataSource is "simulated". */
  simulatedReason?: string;
}

/**
 * Raised when a chart provider cannot export a faithful image of the chart
 * that is actually on screen (e.g. a third-party widget rendered in a
 * cross-origin iframe that we are not permitted to read or screenshot).
 *
 * Callers MUST surface this to the user. Substituting a re-drawn or
 * synthetic image here would send the analysis engine a chart the user
 * never saw, producing confident but fabricated analysis.
 */
export class ChartCaptureUnsupportedError extends Error {
  readonly providerLabel: string;

  constructor(providerLabel: string, detail: string) {
    super(
      `Chart image capture is not supported by the ${providerLabel} integration. ${detail}`
    );
    this.name = "ChartCaptureUnsupportedError";
    this.providerLabel = providerLabel;
  }
}

export interface ChartAdapter {
  initialize(container: HTMLElement, options: ChartOptions): Promise<void>;
  setSymbol(symbol: string): void;
  setTimeframe(timeframe: string): void;
  takeScreenshot(): Promise<string>; // Returns base64 PNG data URL
  getContext(): ChartContext;
  resize(width: number, height: number): void;
  destroy(): void;
  priceToCoordinate?(price: number): number | null;
  getCandles?(): OHLCData[];
}
