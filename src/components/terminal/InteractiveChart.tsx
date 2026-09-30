"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import { LightweightChartsAdapter } from "@/lib/charting/lightweight-adapter";
import { TradingViewWidgetAdapter } from "@/lib/charting/tradingview-widget-adapter";
import { ChartAdapter, ChartContext, ChartDataSource, OHLCData } from "@/lib/charting/types";
import { getSymbolMeta, generateCandleData, deriveSMCOverlays } from "@/lib/charting/data-generator";
import { generateQuickBias, QuickBiasResult } from "@/lib/ai/quick-bias";
import {
  MousePointer,
  TrendingUp,
  TrendingDown,
  Sliders,
  Square,
  Ruler,
  Brush,
  Type,
  Trash2,
  Camera,
  Layers,
  SlidersHorizontal,
  Zap,
  Maximize2,
  Minimize2,
  Minus,
  MoveVertical,
  MoveHorizontal,
  ArrowUpRight,
  Circle,
  PenLine,
  Sparkles,
} from "lucide-react";
import { AnalysisResult } from "@/lib/ai/types";

export interface InteractiveChartRef {
  captureSnapshot: () => Promise<{ imageBase64: string; context: ChartContext }>;
}

const DRAWING_TOOLS = [
  { id: "crosshair", label: "Crosshair", icon: MousePointer },
  { id: "trendline", label: "Trend Line", icon: TrendingUp },
  { id: "horizontal", label: "Horizontal Line", icon: Minus },
  { id: "vertical", label: "Vertical Line", icon: MoveVertical },
  { id: "ray", label: "Ray", icon: ArrowUpRight },
  { id: "channel", label: "Channel", icon: PenLine },
  { id: "fib", label: "Fibonacci Retracement", icon: Sliders },
  { id: "box", label: "Order Block Zone", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "measure", label: "Measure Range", icon: Ruler },
  { id: "brush", label: "Freehand Brush", icon: Brush },
  { id: "text", label: "Price Note", icon: Type },
];

interface DrawingShape {
  id: string;
  type: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  lineWidth: number;
  dashStyle: "solid" | "dashed" | "dotted";
}

interface InteractiveChartProps {
  symbol: string;
  timeframe: string;
  analysis?: AnalysisResult | null;
  onPriceUpdate?: (price: number) => void;
}

const DEFAULT_DRAW_COLOR = "#3B82F6";
const DEFAULT_LINE_WIDTH = 2;

function getDrawingsKey(symbol: string, timeframe: string) {
  return `apexsmc_drawings_${symbol}_${timeframe}`;
}

function loadDrawings(symbol: string, timeframe: string): DrawingShape[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getDrawingsKey(symbol, timeframe));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrawings(symbol: string, timeframe: string, drawings: DrawingShape[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getDrawingsKey(symbol, timeframe), JSON.stringify(drawings));
}

const InteractiveChart = forwardRef<InteractiveChartRef, InteractiveChartProps>(
  ({ symbol, timeframe, analysis, onPriceUpdate }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartSectionRef = useRef<HTMLElement>(null);
    const drawingLayerRef = useRef<SVGSVGElement>(null);
    const adapterRef = useRef<ChartAdapter | null>(null);

    // Engine & UI state
    const [engineType, setEngineType] = useState<"lightweight" | "tradingview">("lightweight");
    const [isCapturing, setIsCapturing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPrice, setCurrentPrice] = useState<string | null>(null);
    const [ohlc, setOhlc] = useState<{
      open: number;
      high: number;
      low: number;
      close: number;
    } | null>(null);
    const [dataSource, setDataSource] = useState<ChartDataSource>("live");
    const [dataSourceReason, setDataSourceReason] = useState<string | null>(null);

    // Active drawing tools state
    const [activeTool, setActiveTool] = useState<string>("crosshair");
    const [drawings, setDrawings] = useState<DrawingShape[]>([]);
    const [currentShape, setCurrentShape] = useState<DrawingShape | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Drawing properties
    const [drawColor, setDrawColor] = useState(DEFAULT_DRAW_COLOR);
    const [drawLineWidth, setDrawLineWidth] = useState(DEFAULT_LINE_WIDTH);
    const [drawDashStyle, setDrawDashStyle] = useState<"solid" | "dashed" | "dotted">("solid");

    // Toggles for technical layers & indicators
    const [indicatorsActive, setIndicatorsActive] = useState(true);
    const [layersActive, setLayersActive] = useState(true);
    const [aiOverlaysActive, setAiOverlaysActive] = useState(true);

    // Auto AI Bias
    const [quickBias, setQuickBias] = useState<QuickBiasResult | null>(null);
    const [liveCandles, setLiveCandles] = useState<OHLCData[]>([]);

    // TradingView Signal interactive vertical fine-tune adjustment
    const [tvSignalOffset, setTvSignalOffset] = useState<number>(0);
    const [isDraggingSignal, setIsDraggingSignal] = useState(false);
    const dragStartYRef = useRef<number>(0);
    const initialOffsetRef = useRef<number>(0);
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });

    const captureSupported = engineType === "lightweight";

    // Track chart container dimensions via ResizeObserver
    useEffect(() => {
      const container = chartContainerRef.current;
      if (!container) return;

      const updateDims = () => {
        setDimensions({
          width: container.clientWidth || 800,
          height: container.clientHeight || 500,
        });
      };

      updateDims();
      const observer = new ResizeObserver(() => updateDims());
      observer.observe(container);

      return () => observer.disconnect();
    }, []);

    // Stop dragging signal if mouse is released anywhere in window
    useEffect(() => {
      const handleGlobalMouseUp = () => {
        if (isDraggingSignal) {
          setIsDraggingSignal(false);
        }
      };
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [isDraggingSignal]);

    // Reset TradingView signal alignment offset when switching symbol/timeframe
    useEffect(() => {
      setTvSignalOffset(0);
    }, [symbol, timeframe]);

    // Load live candles from server to guarantee 100% authentic SMC calculations
    useEffect(() => {
      let isMounted = true;
      fetch(`/api/v1/market-data?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&count=120`)
        .then((r) => r.json())
        .then((data) => {
          if (isMounted && data.success && Array.isArray(data.candles) && data.candles.length > 0) {
            setLiveCandles(data.candles);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }, [symbol, timeframe]);

    // Load drawings from localStorage when symbol/timeframe changes
    useEffect(() => {
      setDrawings(loadDrawings(symbol, timeframe));
    }, [symbol, timeframe]);

    // Persist drawings on change
    useEffect(() => {
      saveDrawings(symbol, timeframe, drawings);
    }, [drawings, symbol, timeframe]);

    // SMC Overlays for display (uses real live candles whenever available)
    const smcOverlays = useMemo(() => {
      const candles = liveCandles.length > 0 ? liveCandles : generateCandleData(symbol, timeframe, 50);
      return deriveSMCOverlays(candles, symbol);
    }, [symbol, timeframe, liveCandles]);

    // Auto AI Bias on load (uses real live candles whenever available)
    useEffect(() => {
      const candles = liveCandles.length > 0 ? liveCandles : generateCandleData(symbol, timeframe, 70);
      const bias = generateQuickBias(candles, symbol);
      setQuickBias(bias);
    }, [symbol, timeframe, liveCandles]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(() => {
      const section = chartSectionRef.current;
      if (!section) return;

      if (!document.fullscreenElement) {
        section.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }, []);

    useEffect(() => {
      const handleFsChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", handleFsChange);
      return () => document.removeEventListener("fullscreenchange", handleFsChange);
    }, []);

    // Snapshot compositing: merge SVG drawings onto the chart canvas
    const compositeSnapshot = useCallback(async (): Promise<string> => {
      const adapter = adapterRef.current;
      if (!adapter) throw new Error("Chart not ready.");

      // Get the base chart screenshot
      const baseImage = await adapter.takeScreenshot();

      // If no drawings, return base
      if (drawings.length === 0 && !currentShape) return baseImage;

      // Composite SVG onto canvas
      const svg = drawingLayerRef.current;
      if (!svg) return baseImage;

      const canvas = document.createElement("canvas");
      const container = chartContainerRef.current;
      if (!container) return baseImage;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return baseImage;

      // Draw base chart image
      const baseImg = new Image();
      await new Promise<void>((resolve) => {
        baseImg.onload = () => {
          ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        baseImg.src = baseImage;
      });

      // Serialize SVG and draw on top
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const svgImg = new Image();
      await new Promise<void>((resolve) => {
        svgImg.onload = () => {
          ctx.drawImage(svgImg, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        svgImg.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        svgImg.src = svgUrl;
      });

      return canvas.toDataURL("image/png");
    }, [drawings, currentShape]);

    // Expose capture method to parent
    useImperativeHandle(ref, () => ({
      async captureSnapshot() {
        if (!adapterRef.current) {
          throw new Error("Chart interface is not ready for capture.");
        }
        setIsCapturing(true);
        try {
          const imageBase64 = await compositeSnapshot();
          const context = adapterRef.current.getContext();
          return { imageBase64, context };
        } finally {
          setIsCapturing(false);
        }
      },
    }));

    // Initialize Chart Adapter
    useEffect(() => {
      if (!chartContainerRef.current) return;

      const container = chartContainerRef.current;
      const adapter: ChartAdapter =
        engineType === "lightweight"
          ? new LightweightChartsAdapter()
          : new TradingViewWidgetAdapter();

      adapterRef.current = adapter;

      adapter
        .initialize(container, {
          symbol,
          timeframe,
          theme: "dark",
          autosize: true,
          onDataSourceChange: (source, reason) => {
            setDataSource(source);
            setDataSourceReason(reason ?? null);
          },
        })
        .then(() => {
          try {
            const ctx = adapter.getContext();
            const meta = getSymbolMeta(symbol);
            setDataSource(ctx.dataSource);
            setDataSourceReason(ctx.simulatedReason ?? null);
            setCurrentPrice(ctx.currentPrice.toFixed(meta.decimals));
            setOhlc({
              open: parseFloat(ctx.open.toFixed(meta.decimals)),
              high: parseFloat(ctx.high.toFixed(meta.decimals)),
              low: parseFloat(ctx.low.toFixed(meta.decimals)),
              close: parseFloat(ctx.close.toFixed(meta.decimals)),
            });
          } catch {
            // Leave the readout empty rather than inventing a price.
            setCurrentPrice(null);
            setOhlc({ open: 0, high: 0, low: 0, close: 0 });
          }
        })
        .catch((err) => {
          console.error("Error initializing chart:", err);
        });

      const handleResize = () => {
        if (container) {
          adapter.resize(container.clientWidth, container.clientHeight);
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        adapter.destroy();
      };
    }, [engineType, symbol, timeframe]);

    // Interactive Drawing Handlers
    const getDashArray = (style: "solid" | "dashed" | "dotted") => {
      if (style === "dashed") return "6 3";
      if (style === "dotted") return "2 2";
      return "none";
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool === "crosshair") return;
      const rect = drawingLayerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setIsDrawing(true);

      if (activeTool === "brush") {
        setCurrentShape({
          id: `shape-${Date.now()}`,
          type: "brush",
          startX,
          startY,
          endX: startX,
          endY: startY,
          points: [{ x: startX, y: startY }],
          color: drawColor,
          lineWidth: drawLineWidth,
          dashStyle: drawDashStyle,
        });
      } else if (activeTool === "text") {
        const textNote = window.prompt("Enter annotation:", "OB Demand Zone");
        if (textNote) {
          setDrawings((prev) => [
            ...prev,
            {
              id: `text-${Date.now()}`,
              type: "text",
              startX,
              startY,
              endX: startX,
              endY: startY,
              text: textNote,
              color: drawColor,
              lineWidth: drawLineWidth,
              dashStyle: "solid",
            },
          ]);
        }
        setIsDrawing(false);
      } else if (activeTool === "horizontal") {
        setDrawings((prev) => [
          ...prev,
          {
            id: `hline-${Date.now()}`,
            type: "horizontal",
            startX: 0,
            startY,
            endX: 9999,
            endY: startY,
            color: drawColor,
            lineWidth: drawLineWidth,
            dashStyle: drawDashStyle,
          },
        ]);
        setIsDrawing(false);
      } else if (activeTool === "vertical") {
        setDrawings((prev) => [
          ...prev,
          {
            id: `vline-${Date.now()}`,
            type: "vertical",
            startX,
            startY: 0,
            endX: startX,
            endY: 9999,
            color: drawColor,
            lineWidth: drawLineWidth,
            dashStyle: drawDashStyle,
          },
        ]);
        setIsDrawing(false);
      } else {
        setCurrentShape({
          id: `shape-${Date.now()}`,
          type: activeTool,
          startX,
          startY,
          endX: startX,
          endY: startY,
          color: drawColor,
          lineWidth: drawLineWidth,
          dashStyle: drawDashStyle,
        });
      }
    };

    const handleSignalDragStart = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingSignal(true);
      dragStartYRef.current = e.clientY;
      initialOffsetRef.current = tvSignalOffset;
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      if (isDraggingSignal) {
        const delta = e.clientY - dragStartYRef.current;
        setTvSignalOffset(initialOffsetRef.current + delta);
        return;
      }

      if (!isDrawing || !currentShape) return;
      const rect = drawingLayerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      if (currentShape.type === "brush") {
        setCurrentShape({
          ...currentShape,
          endX: currentX,
          endY: currentY,
          points: [...(currentShape.points || []), { x: currentX, y: currentY }],
        });
      } else {
        setCurrentShape({
          ...currentShape,
          endX: currentX,
          endY: currentY,
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingSignal) {
        setIsDraggingSignal(false);
        return;
      }

      if (isDrawing && currentShape) {
        setDrawings((prev) => [...prev, currentShape]);
        setCurrentShape(null);
        setIsDrawing(false);
      }
    };

    const handleClearDrawings = () => {
      setDrawings([]);
      setCurrentShape(null);
    };

    // Helper to calculate Y coordinate on chart for a given price level
    const getCoordinateForPrice = useCallback(
      (price: number): number | null => {
        if (!price || isNaN(price)) return null;

        // 1. Try native adapter calculation on SMC Canvas (LightweightChartsAdapter)
        if (engineType === "lightweight" && adapterRef.current?.priceToCoordinate) {
          const coord = adapterRef.current.priceToCoordinate(price);
          if (coord !== null && !isNaN(coord)) return coord;
        }

        // 2. High-precision container ratio fallback calibrated for TradingView / embed
        const container = chartContainerRef.current;
        if (!container) return null;
        const totalHeight = dimensions.height || container.clientHeight || 500;
        const candles = liveCandles.length > 0 ? liveCandles : adapterRef.current?.getCandles?.() || [];
        if (candles.length === 0) return null;

        const max = Math.max(...candles.map((c) => c.high));
        const min = Math.min(...candles.map((c) => c.low));
        if (max === min) return totalHeight / 2;

        if (engineType === "tradingview") {
          // TradingView advanced widget and Deriv iframe layout calibration:
          // Top header toolbar: 42px (Deriv) / 38px (Standard TV)
          // Bottom time axis: 30px
          // Volume histogram pane at bottom: ~18% of available chart space
          const meta = getSymbolMeta(symbol);
          const isDeriv = meta.category === "synthetic";
          const headerHeight = isDeriv ? 42 : 38;
          const timeAxisHeight = 30;
          const chartPaneHeight = Math.max(100, totalHeight - headerHeight - timeAxisHeight);
          const volumePaneHeight = chartPaneHeight * 0.18;

          // Usable candlestick vertical space
          const candleAreaTop = headerHeight + chartPaneHeight * 0.08; // 8% top margin
          const candleAreaBottom = totalHeight - timeAxisHeight - volumePaneHeight - chartPaneHeight * 0.06; // 6% buffer above volume
          const candleSpan = Math.max(50, candleAreaBottom - candleAreaTop);

          // Calculate price ratio between min and max
          const priceRatio = (price - min) / (max - min);
          const baseCoord = candleAreaBottom - priceRatio * candleSpan;

          // Apply interactive fine-tuning offset
          const finalY = baseCoord + tvSignalOffset;
          return Math.max(headerHeight + 6, Math.min(totalHeight - timeAxisHeight - 6, finalY));
        }

        // Standard Lightweight Charts ratio fallback
        const pad = (max - min) * 0.08;
        const paddedMax = max + pad;
        const paddedMin = min - pad;

        const ratio = (price - paddedMin) / (paddedMax - paddedMin);
        const y = totalHeight * (1 - ratio);
        return Math.max(10, Math.min(totalHeight - 10, y));
      },
      [engineType, liveCandles, symbol, tvSignalOffset, dimensions.height]
    );

    // Render AI-generated visual chart drawings: Trade Setup, S/R, Order Blocks, Trendlines
    const renderAIDrawings = () => {
      if (!analysis?.aiDrawings) return null;
      const { supportResistance, trendlines, orderBlocks, tradeSetup } = analysis.aiDrawings;
      const rightMargin = engineType === "tradingview" ? 68 : 55;
      const chartW = Math.max(200, dimensions.width - rightMargin);

      return (
        <g key="ai-generated-markups" className="ai-markups-layer">
          {/* 1. Trade Setup Box (Entry, SL, TP1, TP2, TP3) */}
          {tradeSetup && (() => {
            const yEntry = getCoordinateForPrice(tradeSetup.entry);
            const ySL = getCoordinateForPrice(tradeSetup.stopLoss);
            const yTP1 = getCoordinateForPrice(tradeSetup.tp1);
            const yTP2 = tradeSetup.tp2 ? getCoordinateForPrice(tradeSetup.tp2) : null;
            const yTP3 = tradeSetup.tp3 ? getCoordinateForPrice(tradeSetup.tp3) : null;

            if (yEntry === null || ySL === null || yTP1 === null) return null;

            const riskTop = Math.min(yEntry, ySL);
            const riskHeight = Math.max(4, Math.abs(yEntry - ySL));
            const rewardTop = Math.min(yEntry, yTP1);
            const rewardHeight = Math.max(4, Math.abs(yEntry - yTP1));

            return (
              <g key="ai-trade-setup-group">
                {/* Risk Shaded Area (Red) */}
                <rect
                  x="20"
                  y={riskTop}
                  width={chartW - 20}
                  height={riskHeight}
                  fill="rgba(239, 68, 68, 0.12)"
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  rx="4"
                />

                {/* Reward Shaded Area (Green) */}
                <rect
                  x="20"
                  y={rewardTop}
                  width={chartW - 20}
                  height={rewardHeight}
                  fill="rgba(16, 185, 129, 0.12)"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  rx="4"
                />

                {/* Entry Line (Cyan) */}
                <line
                  x1="0"
                  y1={yEntry}
                  x2={chartW}
                  y2={yEntry}
                  stroke="#06B6D4"
                  strokeWidth="2"
                />
                <rect
                  x="24"
                  y={yEntry - 12}
                  width="190"
                  height="24"
                  rx="4"
                  fill="#083344"
                  stroke="#06B6D4"
                  strokeWidth="1"
                  className="cursor-ns-resize"
                  onMouseDown={handleSignalDragStart}
                >
                  <title>Click and drag vertically to align Signal with TradingView candles</title>
                </rect>
                <text
                  x="32"
                  y={yEntry + 4}
                  fill="#06B6D4"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="cursor-ns-resize select-none"
                  onMouseDown={handleSignalDragStart}
                >
                  ENTRY: {tradeSetup.entry} ({tradeSetup.direction.toUpperCase()}) ↕
                </text>

                {/* Right Price Tag (Aligns with price axis) */}
                <g transform={`translate(${chartW - 65}, ${yEntry - 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="65"
                    height="20"
                    rx="3"
                    fill="#083344"
                    stroke="#06B6D4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="32.5"
                    y="14"
                    fill="#06B6D4"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tradeSetup.entry}
                  </text>
                </g>

                {/* Risk/Reward Ratio Pill */}
                <rect
                  x="222"
                  y={yEntry - 12}
                  width="95"
                  height="24"
                  rx="4"
                  fill="#1E293B"
                  stroke="#64748B"
                  strokeWidth="1"
                />
                <text
                  x="229"
                  y={yEntry + 4}
                  fill="#F8FAFC"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  1 : {tradeSetup.riskRewardRatio ?? "2.0"} R:R
                </text>

                {/* Stop Loss Line (Red) */}
                <line
                  x1="0"
                  y1={ySL}
                  x2={chartW}
                  y2={ySL}
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                <rect
                  x="24"
                  y={ySL - 11}
                  width="155"
                  height="22"
                  rx="4"
                  fill="#450A0A"
                  stroke="#EF4444"
                  strokeWidth="1"
                  className="cursor-ns-resize"
                  onMouseDown={handleSignalDragStart}
                >
                  <title>Click and drag vertically to align Signal with TradingView candles</title>
                </rect>
                <text
                  x="32"
                  y={ySL + 4}
                  fill="#F87171"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="cursor-ns-resize select-none"
                  onMouseDown={handleSignalDragStart}
                >
                  STOP LOSS: {tradeSetup.stopLoss} ↕
                </text>

                {/* Stop Loss Right Price Tag */}
                <g transform={`translate(${chartW - 65}, ${ySL - 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="65"
                    height="20"
                    rx="3"
                    fill="#450A0A"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                  />
                  <text
                    x="32.5"
                    y="14"
                    fill="#F87171"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tradeSetup.stopLoss}
                  </text>
                </g>

                {/* Take Profit 1 Line (Emerald) */}
                <line
                  x1="0"
                  y1={yTP1}
                  x2={chartW}
                  y2={yTP1}
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                <rect
                  x="24"
                  y={yTP1 - 11}
                  width="145"
                  height="22"
                  rx="4"
                  fill="#064E3B"
                  stroke="#10B981"
                  strokeWidth="1"
                  className="cursor-ns-resize"
                  onMouseDown={handleSignalDragStart}
                >
                  <title>Click and drag vertically to align Signal with TradingView candles</title>
                </rect>
                <text
                  x="32"
                  y={yTP1 + 4}
                  fill="#34D399"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="cursor-ns-resize select-none"
                  onMouseDown={handleSignalDragStart}
                >
                  TP1: {tradeSetup.tp1} ↕
                </text>

                {/* TP1 Right Price Tag */}
                <g transform={`translate(${chartW - 65}, ${yTP1 - 10})`}>
                  <rect
                    x="0"
                    y="0"
                    width="65"
                    height="20"
                    rx="3"
                    fill="#064E3B"
                    stroke="#10B981"
                    strokeWidth="1.5"
                  />
                  <text
                    x="32.5"
                    y="14"
                    fill="#34D399"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {tradeSetup.tp1}
                  </text>
                </g>

                {/* Take Profit 2 Line (if present) */}
                {yTP2 !== null && (
                  <g key="tp2-group">
                    <line
                      x1="0"
                      y1={yTP2}
                      x2={chartW}
                      y2={yTP2}
                      stroke="#059669"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <rect
                      x="24"
                      y={yTP2 - 10}
                      width="135"
                      height="20"
                      rx="3"
                      fill="#064E3B"
                      stroke="#059669"
                      strokeWidth="1"
                      className="cursor-ns-resize"
                      onMouseDown={handleSignalDragStart}
                    />
                    <text
                      x="32"
                      y={yTP2 + 4}
                      fill="#6EE7B7"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="cursor-ns-resize select-none"
                      onMouseDown={handleSignalDragStart}
                    >
                      TP2: {tradeSetup.tp2} ↕
                    </text>
                    <g transform={`translate(${chartW - 65}, ${yTP2 - 10})`}>
                      <rect
                        x="0"
                        y="0"
                        width="65"
                        height="20"
                        rx="3"
                        fill="#064E3B"
                        stroke="#059669"
                        strokeWidth="1.5"
                      />
                      <text
                        x="32.5"
                        y="14"
                        fill="#6EE7B7"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {tradeSetup.tp2}
                      </text>
                    </g>
                  </g>
                )}

                {/* Take Profit 3 Line (if present) */}
                {yTP3 !== null && (
                  <g key="tp3-group">
                    <line
                      x1="0"
                      y1={yTP3}
                      x2={chartW}
                      y2={yTP3}
                      stroke="#047857"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <rect
                      x="24"
                      y={yTP3 - 10}
                      width="135"
                      height="20"
                      rx="3"
                      fill="#064E3B"
                      stroke="#047857"
                      strokeWidth="1"
                      className="cursor-ns-resize"
                      onMouseDown={handleSignalDragStart}
                    />
                    <text
                      x="32"
                      y={yTP3 + 4}
                      fill="#A7F3D0"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="cursor-ns-resize select-none"
                      onMouseDown={handleSignalDragStart}
                    >
                      TP3: {tradeSetup.tp3} ↕
                    </text>
                    <g transform={`translate(${chartW - 65}, ${yTP3 - 10})`}>
                      <rect
                        x="0"
                        y="0"
                        width="65"
                        height="20"
                        rx="3"
                        fill="#064E3B"
                        stroke="#047857"
                        strokeWidth="1.5"
                      />
                      <text
                        x="32.5"
                        y="14"
                        fill="#A7F3D0"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {tradeSetup.tp3}
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 2. Support & Resistance Horizontal Lines */}
          {supportResistance?.map((sr, idx) => {
            const y = getCoordinateForPrice(sr.price);
            if (y === null) return null;
            const isSup = sr.type === "support";
            const color = isSup ? "#10B981" : "#EF4444";
            const bgColor = isSup ? "#064E3B" : "#450A0A";

            return (
              <g key={`ai-sr-${idx}`}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartW}
                  y2={y}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.85"
                />
                <rect
                  x={Math.max(20, chartW - 200)}
                  y={y - 10}
                  width="190"
                  height="18"
                  rx="3"
                  fill={bgColor}
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x={Math.max(30, chartW - 190)}
                  y={y + 3}
                  fill={color}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isSup ? "SUPPORT" : "RESISTANCE"}: {sr.price}
                </text>
              </g>
            );
          })}

          {/* 3. Order Blocks / Demand & Supply Zones */}
          {orderBlocks?.map((ob, idx) => {
            const yHigh = getCoordinateForPrice(ob.high);
            const yLow = getCoordinateForPrice(ob.low);
            if (yHigh === null || yLow === null) return null;

            const isDemand = ob.type === "bullish_ob";
            const top = Math.min(yHigh, yLow);
            const h = Math.max(8, Math.abs(yHigh - yLow));
            const color = isDemand ? "#3B82F6" : "#EC4899";
            const fill = isDemand ? "rgba(59, 130, 246, 0.15)" : "rgba(236, 72, 153, 0.15)";

            return (
              <g key={`ai-ob-${idx}`}>
                <rect
                  x="10"
                  y={top}
                  width={chartW - 10}
                  height={h}
                  fill={fill}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="4 2"
                  rx="3"
                />
                <rect
                  x="16"
                  y={top + 2}
                  width="150"
                  height="16"
                  rx="2"
                  fill={isDemand ? "#1E3A8A" : "#831843"}
                  opacity="0.85"
                />
                <text
                  x="22"
                  y={top + 13}
                  fill={color}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isDemand ? "DEMAND OB" : "SUPPLY OB"} ({ob.low.toFixed(5)})
                </text>
              </g>
            );
          })}

          {/* 4. Trendlines */}
          {trendlines?.map((tl, idx) => {
            const y1 = getCoordinateForPrice(tl.startPrice);
            const y2 = getCoordinateForPrice(tl.endPrice);
            if (y1 === null || y2 === null) return null;

            const color = tl.type === "support" ? "#10B981" : "#EF4444";
            return (
              <g key={`ai-tl-${idx}`}>
                <line
                  x1="80"
                  y1={y1}
                  x2="calc(100% - 80px)"
                  y2={y2}
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </g>
            );
          })}
        </g>
      );
    };

    // Render a single drawing shape as SVG
    const renderShape = (shape: DrawingShape) => {
      const dash = getDashArray(shape.dashStyle);
      const strokeDasharray = dash === "none" ? undefined : dash;

      switch (shape.type) {
        case "trendline":
        case "ray":
          return (
            <line
              key={shape.id}
              x1={shape.startX}
              y1={shape.startY}
              x2={shape.type === "ray" ? shape.endX + (shape.endX - shape.startX) * 10 : shape.endX}
              y2={shape.type === "ray" ? shape.endY + (shape.endY - shape.startY) * 10 : shape.endY}
              stroke={shape.color}
              strokeWidth={shape.lineWidth}
              strokeDasharray={strokeDasharray}
            />
          );

        case "horizontal":
          return (
            <line
              key={shape.id}
              x1={0}
              y1={shape.startY}
              x2="100%"
              y2={shape.startY}
              stroke={shape.color}
              strokeWidth={shape.lineWidth}
              strokeDasharray={strokeDasharray}
            />
          );

        case "vertical":
          return (
            <line
              key={shape.id}
              x1={shape.startX}
              y1={0}
              x2={shape.startX}
              y2="100%"
              stroke={shape.color}
              strokeWidth={shape.lineWidth}
              strokeDasharray={strokeDasharray}
            />
          );

        case "channel": {
          const dx = shape.endX - shape.startX;
          const dy = shape.endY - shape.startY;
          const offset = 30;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = (-dy / len) * offset;
          const ny = (dx / len) * offset;
          return (
            <g key={shape.id}>
              <line x1={shape.startX} y1={shape.startY} x2={shape.endX} y2={shape.endY} stroke={shape.color} strokeWidth={shape.lineWidth} strokeDasharray={strokeDasharray} />
              <line x1={shape.startX + nx} y1={shape.startY + ny} x2={shape.endX + nx} y2={shape.endY + ny} stroke={shape.color} strokeWidth={shape.lineWidth} strokeDasharray={strokeDasharray} opacity={0.5} />
            </g>
          );
        }

        case "box": {
          const x = Math.min(shape.startX, shape.endX);
          const y = Math.min(shape.startY, shape.endY);
          const w = Math.abs(shape.endX - shape.startX);
          const h = Math.abs(shape.endY - shape.startY);
          return (
            <rect
              key={shape.id}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={shape.color.replace(")", ", 0.15)").replace("rgb", "rgba").replace("#", "")}
              style={{ fill: `${shape.color}20` }}
              stroke={shape.color}
              strokeWidth={shape.lineWidth}
              strokeDasharray={strokeDasharray}
              rx="4"
            />
          );
        }

        case "ellipse": {
          const cx = (shape.startX + shape.endX) / 2;
          const cy = (shape.startY + shape.endY) / 2;
          const rx = Math.abs(shape.endX - shape.startX) / 2;
          const ry = Math.abs(shape.endY - shape.startY) / 2;
          return (
            <ellipse
              key={shape.id}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={shape.color}
              strokeWidth={shape.lineWidth}
              strokeDasharray={strokeDasharray}
            />
          );
        }

        case "fib": {
          const y1 = shape.startY;
          const y2 = shape.endY;
          const dv = y2 - y1;
          return (
            <g key={shape.id}>
              <line x1={shape.startX} y1={y1} x2={shape.endX} y2={y1} stroke="#E05C64" strokeWidth="1" />
              <line x1={shape.startX} y1={y1 + dv * 0.236} x2={shape.endX} y2={y1 + dv * 0.236} stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2" />
              <line x1={shape.startX} y1={y1 + dv * 0.382} x2={shape.endX} y2={y1 + dv * 0.382} stroke="#F59E0B" strokeWidth="1" />
              <line x1={shape.startX} y1={y1 + dv * 0.5} x2={shape.endX} y2={y1 + dv * 0.5} stroke={shape.color} strokeWidth="1.5" />
              <line x1={shape.startX} y1={y1 + dv * 0.618} x2={shape.endX} y2={y1 + dv * 0.618} stroke="#22C55E" strokeWidth="1" />
              <line x1={shape.startX} y1={y2} x2={shape.endX} y2={y2} stroke="#22C55E" strokeWidth="1" />
              {/* Labels */}
              <text x={shape.endX + 4} y={y1 + 3} fill="#E05C64" fontSize="9" fontFamily="var(--font-headline)">0%</text>
              <text x={shape.endX + 4} y={y1 + dv * 0.382 + 3} fill="#F59E0B" fontSize="9" fontFamily="var(--font-headline)">38.2%</text>
              <text x={shape.endX + 4} y={y1 + dv * 0.5 + 3} fill={shape.color} fontSize="9" fontFamily="var(--font-headline)">50%</text>
              <text x={shape.endX + 4} y={y1 + dv * 0.618 + 3} fill="#22C55E" fontSize="9" fontFamily="var(--font-headline)">61.8%</text>
              <text x={shape.endX + 4} y={y2 + 3} fill="#22C55E" fontSize="9" fontFamily="var(--font-headline)">100%</text>
            </g>
          );
        }

        case "measure": {
          const mx = Math.min(shape.startX, shape.endX);
          const my = Math.min(shape.startY, shape.endY);
          const mw = Math.abs(shape.endX - shape.startX);
          const mh = Math.abs(shape.endY - shape.startY);
          return (
            <g key={shape.id}>
              <rect x={mx} y={my} width={mw} height={mh} fill="rgba(59,130,246,0.08)" stroke={shape.color} strokeWidth="1" strokeDasharray="4 2" rx="2" />
              <text x={mx + mw / 2} y={my + mh / 2 + 4} fill={shape.color} fontSize="10" fontFamily="var(--font-headline)" textAnchor="middle" fontWeight="bold">
                {mw.toFixed(0)} × {mh.toFixed(0)}
              </text>
            </g>
          );
        }

        case "brush":
          if (shape.points && shape.points.length > 1) {
            const pathData = shape.points.reduce(
              (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
              ""
            );
            return (
              <path
                key={shape.id}
                d={pathData}
                fill="none"
                stroke={shape.color}
                strokeWidth={shape.lineWidth}
                strokeLinecap="round"
              />
            );
          }
          return null;

        case "text":
          return shape.text ? (
            <text
              key={shape.id}
              x={shape.startX}
              y={shape.startY}
              fill={shape.color}
              fontSize="11"
              fontFamily="var(--font-headline)"
              fontWeight="bold"
            >
              {shape.text}
            </text>
          ) : null;

        default:
          return null;
      }
    };

    const COLOR_PRESETS = ["#3B82F6", "#22C55E", "#E05C64", "#F59E0B", "#A855F7", "#EC4899", "#D7DEE9"];

    return (
      <section
        ref={chartSectionRef}
        className={`flex-1 flex flex-col relative border-b xl:border-b-0 xl:border-r border-outline-variant bg-canvas overflow-hidden select-none ${isFullscreen ? "min-h-screen" : "min-h-[300px]"}`}
      >
        {/* Micro Control Bar */}
        <div className="h-9 bg-surface-container border-b border-outline-variant px-3 flex items-center justify-between text-xs font-mono text-on-surface-variant z-20">
          <div className="flex items-center space-x-3">
            <span className="text-on-surface font-semibold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-bullish inline-block animate-pulse"></span>
              <span>
                {symbol} · {timeframe} · {engineType === "lightweight" ? "SMC Canvas" : "TradingView"}
              </span>
            </span>
            <span className="hidden sm:inline">
              O: <span className="text-on-surface">{ohlc?.open ?? "—"}</span>
            </span>
            <span className="hidden sm:inline">
              H: <span className="text-primary font-bold">{ohlc?.high ?? "—"}</span>
            </span>
            <span className="hidden sm:inline">
              L: <span className="text-bearish font-bold">{ohlc?.low ?? "—"}</span>
            </span>
            <span>
              C:{" "}
              <span className="text-primary font-bold">
                {currentPrice ?? (ohlc ? ohlc.close : "—")}
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Feed provenance badge */}
            {engineType === "lightweight" && (
              <span
                title="Real-Time Institutional Market Feed"
                className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border text-bullish bg-bullish/10 border-bullish/30 shadow-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse" />
                REAL LIVE FEED
              </span>
            )}

            {/* Engine Selector Toggle */}
            <div className="flex items-center bg-surface border border-outline rounded p-0.5 text-[10px] font-body">
              <button
                type="button"
                onClick={() => setEngineType("lightweight")}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  engineType === "lightweight"
                    ? "bg-primary text-on-primary font-bold shadow-xs glow-primary-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                SMC Canvas
              </button>
              <button
                type="button"
                onClick={() => setEngineType("tradingview")}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  engineType === "tradingview"
                    ? "bg-primary text-on-primary font-bold shadow-xs glow-primary-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                TradingView
              </button>
            </div>

            {/* Technical Indicators Toggle */}
            <button
              type="button"
              onClick={() => setIndicatorsActive(!indicatorsActive)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                indicatorsActive
                  ? "bg-primary/20 text-primary border border-primary/40 glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              title={indicatorsActive ? "Indicators: Active (EMA 20/50, Volume)" : "Indicators: Hidden"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* SMC Layers Toggle */}
            <button
              type="button"
              onClick={() => setLayersActive(!layersActive)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layersActive
                  ? "bg-primary/20 text-primary border border-primary/40 glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              title={layersActive ? "SMC Overlay: Visible (OB, FVG, BOS)" : "SMC Overlay: Hidden"}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {/* AI Chart Markups Toggle */}
            <button
              type="button"
              onClick={() => setAiOverlaysActive(!aiOverlaysActive)}
              className={`p-1.5 rounded transition-colors cursor-pointer flex items-center space-x-1 ${
                aiOverlaysActive && analysis
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              title={
                aiOverlaysActive
                  ? "AI Smart Markups: Active (S/R, Trendlines, Order Blocks, Trade Setup)"
                  : "AI Smart Markups: Hidden"
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              {analysis && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden lg:inline">
                  AI Markups
                </span>
              )}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Snapshot Indicator */}
            <span
              className="p-1 text-on-surface-variant"
              title={captureSupported ? "Snapshot capture ready (includes drawings)" : "Switch to SMC Canvas for AI snapshot capture"}
            >
              <Camera
                className={`w-3.5 h-3.5 ${
                  captureSupported ? "text-primary" : "text-on-surface-variant/40"
                } ${isCapturing ? "text-primary animate-pulse" : ""}`}
              />
            </span>
          </div>
        </div>

        {/* Main Viewport Container */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Drawing Toolbar */}
          <div className="w-10 border-r border-outline-variant bg-surface/80 flex flex-col items-center py-2 space-y-1 z-20 shrink-0 overflow-y-auto custom-scrollbar">
            {DRAWING_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isSelected = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(tool.id)}
                  className={`p-1.5 rounded transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-on-primary glow-primary-sm shadow-md"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                  title={`${tool.label} ${isSelected ? "(Active)" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}

            <div className="w-4 h-px bg-outline"></div>

            {/* Color Presets */}
            <div className="flex flex-col items-center space-y-1 py-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDrawColor(color)}
                  className={`w-4 h-4 rounded-full border-2 transition-transform cursor-pointer ${
                    drawColor === color ? "border-on-surface scale-125" : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            <div className="w-4 h-px bg-outline"></div>

            {/* Line Width */}
            <div className="flex flex-col items-center space-y-1 py-1">
              {[1, 2, 3].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDrawLineWidth(w)}
                  className={`w-6 flex items-center justify-center py-1 rounded cursor-pointer ${
                    drawLineWidth === w ? "bg-primary/20" : "hover:bg-surface-container"
                  }`}
                  title={`${w}px`}
                >
                  <div className="rounded-full bg-on-surface" style={{ width: "16px", height: `${w}px` }} />
                </button>
              ))}
            </div>

            <div className="w-4 h-px bg-outline"></div>

            {/* Clear All Drawings */}
            <button
              type="button"
              onClick={handleClearDrawings}
              className="p-1.5 text-on-surface-variant hover:text-bearish hover:bg-bearish/10 rounded transition-colors cursor-pointer"
              title="Clear all markups"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Chart Canvas Mount Point */}
          <div className="flex-1 relative overflow-hidden bg-canvas">
            <div ref={chartContainerRef} className="w-full h-full" />

            {/* SVG Drawing Layer over Chart */}
            <svg
              ref={drawingLayerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`absolute inset-0 w-full h-full z-15 ${
                activeTool === "crosshair" ? "pointer-events-none" : "cursor-crosshair pointer-events-auto"
              }`}
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Render Saved Drawings */}
              {drawings.map(renderShape)}

              {/* Current Active Shape being drawn */}
              {currentShape && renderShape(currentShape)}

              {/* AI Real-time Intelligent Markups (S/R, Trendlines, Order Blocks, Trade Setup) */}
              {aiOverlaysActive && renderAIDrawings()}
            </svg>

            {/* Background Symbol Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="font-headline font-black text-9xl tracking-tighter">
                {symbol.replace("/", "")}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Chart Status Bar (Outside the chart canvas - completely unblocks candles, volume, and time axis) */}
        <div className="h-8 bg-surface-container/95 border-t border-outline-variant px-3 flex items-center justify-between text-[10px] font-mono text-on-surface-variant select-none z-20 shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar py-0.5">
            <div className="bg-surface/90 border border-outline px-2 py-0.5 rounded text-on-surface flex items-center space-x-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-bullish animate-pulse" />
              <span className="font-bold text-primary">SMC ENGINE ACTIVE</span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-on-surface-variant font-semibold">{symbol} {timeframe}</span>
            </div>

            {indicatorsActive && (
              <div className="hidden sm:flex items-center space-x-1.5">
                <span className="bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded font-semibold">
                  EMA (20): BULLISH
                </span>
                <span className="bg-surface/80 text-on-surface-variant border border-outline px-2 py-0.5 rounded font-semibold">
                  EMA (50): 1.0841
                </span>
              </div>
            )}

            {layersActive && (
              <div className="hidden md:flex items-center space-x-1.5">
                <span className="bg-bullish/10 text-bullish border border-bullish/25 px-2 py-0.5 rounded font-semibold flex items-center">
                  <Zap className="w-3 h-3 mr-1" /> OB DEMAND: {smcOverlays.orderBlocks[0]?.low ?? "ACTIVE"}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {engineType === "tradingview" && analysis?.aiDrawings?.tradeSetup && (
              <div className="flex items-center space-x-1 bg-surface border border-outline rounded px-2 py-0.5 shadow-xs">
                <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">
                  Signal TV Align:
                </span>
                <button
                  type="button"
                  onClick={() => setTvSignalOffset((prev) => prev - 5)}
                  className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface cursor-pointer font-bold transition-colors"
                  title="Nudge Signal overlay UP (or drag badges directly on chart)"
                >
                  ▲ Up
                </button>
                <button
                  type="button"
                  onClick={() => setTvSignalOffset((prev) => prev + 5)}
                  className="px-1.5 py-0.5 rounded hover:bg-surface-container text-on-surface cursor-pointer font-bold transition-colors"
                  title="Nudge Signal overlay DOWN (or drag badges directly on chart)"
                >
                  ▼ Down
                </button>
                {tvSignalOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setTvSignalOffset(0)}
                    className="text-[9px] text-primary hover:underline px-1 cursor-pointer font-semibold transition-colors"
                    title="Reset to default calibrated alignment"
                  >
                    Reset ({tvSignalOffset > 0 ? `+${tvSignalOffset}` : tvSignalOffset}px)
                  </button>
                )}
              </div>
            )}

            {quickBias && (
              <div
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1.5 border shadow-xs ${
                  quickBias.direction === "bullish"
                    ? "bg-bullish/10 border-bullish/30 text-bullish font-bold"
                    : quickBias.direction === "bearish"
                      ? "bg-bearish/10 border-bearish/30 text-bearish font-bold"
                      : "bg-surface border-outline text-on-surface-variant"
                }`}
              >
                {quickBias.direction === "bullish" ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : quickBias.direction === "bearish" ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                <span>AI Bias: {quickBias.label}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
);

InteractiveChart.displayName = "InteractiveChart";

export default InteractiveChart;
