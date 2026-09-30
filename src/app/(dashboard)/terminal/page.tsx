"use client";

import { useState, useRef, useEffect } from "react";
import TopNavBar from "@/components/terminal/TopNavBar";
import SideRail from "@/components/terminal/SideRail";
import InteractiveChart, { InteractiveChartRef } from "@/components/terminal/InteractiveChart";
import AIAnalysisPanel from "@/components/terminal/AIAnalysisPanel";
import HistoryDrawer from "@/components/terminal/HistoryDrawer";
import OrderModal from "@/components/terminal/OrderModal";
import DocumentationModal from "@/components/terminal/DocumentationModal";
import SettingsModal, {
  readStoredRiskProfile,
  type RiskProfileSettings,
} from "@/components/terminal/SettingsModal";
import SmartMoneyToolsPanel from "@/components/terminal/SmartMoneyToolsPanel";
import LiquidityHeatmapPanel from "@/components/terminal/LiquidityHeatmapPanel";
import EconomicCalendarPanel from "@/components/terminal/EconomicCalendarPanel";
import StrategyBacktestPanel from "@/components/terminal/StrategyBacktestPanel";
import TradeJournalPanel from "@/components/terminal/TradeJournalPanel";
import NotificationPanel from "@/components/terminal/NotificationPanel";
import ManualChartUpload from "@/components/terminal/ManualChartUpload";
import { AlertCircle, CloudUpload, Sparkles, X } from "lucide-react";
import { AnalysisResult, AnalysisStrategy } from "@/lib/ai/types";
import { STRATEGY_REGISTRY } from "@/lib/ai/strategy-registry";
import { ChartCaptureUnsupportedError } from "@/lib/charting/types";
import { getSymbolMeta } from "@/lib/charting/data-generator";
import { useLiveQuote } from "@/hooks/useLiveQuote";

export default function TerminalPage() {
  const [currentSymbol, setCurrentSymbol] = useState("EUR/USD");
  const [currentTimeframe, setCurrentTimeframe] = useState("H1");
  const [currentStrategy, setCurrentStrategy] = useState<AnalysisStrategy>("smc");
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Lot size cannot be derived without an account size, so the risk profile is
  // the only piece of state that makes the trade ticket appear.
  const [riskProfile, setRiskProfile] = useState<RiskProfileSettings | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [mobileTab, setMobileTab] = useState<"chart" | "analysis" | "history">("chart");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
    url?: string;
  } | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState("charts");

  // Resizable split ratio (percentage for chart panel)
  const [splitRatio, setSplitRatio] = useState(70);
  const isDraggingRef = useRef(false);

  const chartRef = useRef<InteractiveChartRef>(null);
  const liveQuote = useLiveQuote(currentSymbol, currentTimeframe);

  // Restore the saved account size so the trade ticket and lot-size ladder
  // appear without re-entering the balance every session. localStorage is
  // read in an effect because this component renders on the server first.
  useEffect(() => {
    const stored = readStoredRiskProfile();
    if (stored.accountBalance > 0) {
      setRiskProfile(stored);
    }
  }, []);
  // Orders must never be pre-filled from the static catalog price, so fall
  // back to it only when no live feed is available, and say so in the UI.
  const actionablePrice = liveQuote.available ? liveQuote.price : getSymbolMeta(currentSymbol).basePrice;

  /**
   * Runs an analysis for a specific strategy.
   *
   * The strategy is an explicit parameter rather than read from state at call
   * time: `setCurrentStrategy` does not apply until the next render, so reading
   * `currentStrategy` inside the request body would send the previously selected
   * tab. That race is why switching tabs appeared to return the same result.
   */
  const handleSnapshotAnalyze = async (_strategy?: AnalysisStrategy, customPrompt?: string) => {
    setIsAnalyzing(true);
    setNotification(null);

    // Always run the "combined" strategy so a single analysis covers SMC,
    // patterns, reversals and confluence at once.  The user-facing tabs are
    // pure view-filters over this result — no re-analysis needed.
    const strategy: AnalysisStrategy = "combined";

    try {
      // 1. Capture client-side chart snapshot & context from InteractiveChart
      if (!chartRef.current) {
        throw new Error("Chart interface is not ready for capture.");
      }

      const { imageBase64, context } = await chartRef.current.captureSnapshot();

      // 2. Upload snapshot directly to storage
      setNotification({
        type: "info",
        message: "Uploading chart snapshot...",
      });

      const uploadRes = await fetch("/api/snapshots/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          symbol: currentSymbol,
          timeframe: currentTimeframe,
          visibleRange: context.visibleRange,
          chartTimestamp: context.timestamp,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to upload snapshot to Cloudinary.");
      }

      // 3. Dispatch market analysis request
      setNotification({
        type: "info",
        message: "Analyzing market structure and key levels...",
        url: uploadData.url,
      });

      const analysisRes = await fetch("/api/v1/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotId: uploadData.snapshotId,
          imageUrl: uploadData.url,
          imageBase64: imageBase64,
          symbol: currentSymbol,
          timeframe: currentTimeframe,
          strategy,
          customPrompt,
          // Only send a risk profile once the trader has entered one. Without
          // it the API omits the trade plan rather than guessing a lot size.
          riskProfile:
            riskProfile && riskProfile.accountBalance > 0
              ? {
                  accountBalance: riskProfile.accountBalance,
                  riskPercent: riskProfile.riskPercent,
                }
              : undefined,
          chartContext: {
            visibleRange: context.visibleRange,
            candleCount: context.ohlcSummary?.length,
            lastPrice: context.currentPrice,
            highPrice: context.high,
            lowPrice: context.low,
            // Send the actual bars so the model reasons over real numbers
            // instead of estimating levels from the rendered image.
            candlesSample: context.ohlcSummary,
            dataSource: context.dataSource,
          },
        }),
      });

      const analysisData = await analysisRes.json();
      if (!analysisRes.ok) {
        throw new Error(analysisData.error || "Analysis failed to complete.");
      }

      // 4. Update state with validated analysis
      setCurrentAnalysis(analysisData.data);
      setHistoryRefreshKey((prev) => prev + 1);

      // An upstream outage returns a valid "insufficient_data" body rather than
      // an HTTP error. Surfacing that as a success toast was misleading, so
      // tell the user plainly that no analysis was produced.
      const unavailable = analysisData.data.modelMetadata?.modelName === "unavailable";
      if (unavailable) {
        setNotification({
          type: "error",
          message: analysisData.data.summary,
        });
      } else {
        setNotification({
          type: "success",
          message: `Analysis Complete: ${analysisData.data.bias.toUpperCase()} Bias (${analysisData.data.confluence.score}% Confluence)${analysisData.data.tradePlan ? ` · ${analysisData.data.tradePlan.lots.toFixed(2)} lots` : ""}`,
          url: uploadData.url,
        });
      }

      // Automatically switch to analysis tab on mobile
      if (window.innerWidth < 1280) {
        setMobileTab("analysis");
      }

      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err: unknown) {
      const error = err as Error;
      if (error instanceof ChartCaptureUnsupportedError) {
        setNotification({
          type: "error",
          message: error.message,
        });
      } else {
        setNotification({
          type: "error",
          message: error.message || "Snapshot and analysis failed.",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Strategy tabs are pure view-filters — they only switch which section of
   * the single analysis result is displayed, without re-running anything.
   */
  const handleStrategyChange = (strategy: AnalysisStrategy) => {
    setCurrentStrategy(strategy);
  };

  const handleSelectHistoryAnalysis = (analysis: AnalysisResult) => {
    setCurrentAnalysis(analysis);
    setCurrentSymbol(analysis.symbol);
    setCurrentTimeframe(analysis.timeframe);
    // Switch to charts mode so the AI analysis panel (where the loaded
    // result is displayed) is visible instead of a feature panel.
    setActiveSideTab("charts");
    if (window.innerWidth < 1280) {
      setMobileTab("analysis");
    }
    setNotification({
      type: "info",
      message: `Loaded historical analysis for ${analysis.symbol} (${analysis.timeframe})`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Resize handle drag
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const startX = e.clientX;
    const startRatio = splitRatio;
    const container = (e.target as HTMLElement).parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;

    const handleMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - startX;
      const newRatio = startRatio + (dx / containerWidth) * 100;
      setSplitRatio(Math.min(85, Math.max(40, newRatio)));
    };

    const handleUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  // Determine whether to show a side panel or the default AI panel
  const showSidePanel = activeSideTab !== "charts";

  // When a feature panel is active (not charts), hide the chart on all
  // breakpoints so the panel gets the full workspace width.
  const showChart = !showSidePanel;

  // Render the active side panel content
  const renderSidePanel = () => {
    switch (activeSideTab) {
      case "smc":
        return <SmartMoneyToolsPanel symbol={currentSymbol} timeframe={currentTimeframe} />;
      case "heatmap":
        return <LiquidityHeatmapPanel symbol={currentSymbol} timeframe={currentTimeframe} />;
      case "calendar":
        return <EconomicCalendarPanel symbol={currentSymbol} />;
      case "backtest":
        return <StrategyBacktestPanel symbol={currentSymbol} timeframe={currentTimeframe} />;
      case "journal":
        return <TradeJournalPanel symbol={currentSymbol} />;
      case "notifications":
        return <NotificationPanel symbol={currentSymbol} />;
      default:
        return (
          <AIAnalysisPanel
            symbol={currentSymbol}
            timeframe={currentTimeframe}
            strategy={currentStrategy}
            onStrategyChange={handleStrategyChange}
            riskProfile={riskProfile}
            isAnalyzing={isAnalyzing}
            analysis={currentAnalysis}
            onRunInquiry={(inquiry) => handleSnapshotAnalyze(currentStrategy, inquiry)}
            onRefresh={() => handleSnapshotAnalyze(currentStrategy)}
          />
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-canvas text-on-surface flex flex-col overflow-hidden select-none relative">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="absolute top-16 right-6 z-50 flex items-center space-x-2.5 bg-surface border border-outline rounded-lg px-4 py-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2">
          {notification.type === "success" ? (
            <CloudUpload className="w-4 h-4 text-primary shrink-0" />
          ) : notification.type === "info" ? (
            <Sparkles className="w-4 h-4 text-primary animate-spin shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-bearish shrink-0" />
          )}
          <div className="text-xs">
            <span
              className={`font-semibold ${
                notification.type === "error" ? "text-bearish" : "text-primary"
              }`}
            >
              {notification.message}
            </span>
            {notification.url && (
              <span className="block font-mono text-[10px] text-on-surface-variant truncate max-w-xs">
                Asset: {notification.url.startsWith("data:") ? "Local Base64" : notification.url}
              </span>
            )}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 ml-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Global Navigation & Terminal Control Bar */}
      <TopNavBar
        currentSymbol={currentSymbol}
        currentTimeframe={currentTimeframe}
        onSymbolChange={setCurrentSymbol}
        onTimeframeChange={setCurrentTimeframe}
        onSnapshotAnalyze={() => handleSnapshotAnalyze(currentStrategy)}
        onOpenManualUpload={() => setIsUploadOpen(true)}
        isAnalyzing={isAnalyzing}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* 2. Main Terminal Body: Side Rail + Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <SideRail
          activeTab={activeSideTab}
          onTabChange={(tab) => {
            setActiveSideTab(tab);
            if (tab === "journal") {
              setMobileTab("history");
            } else if (tab !== "charts") {
              setMobileTab("analysis");
            } else {
              setMobileTab("chart");
            }
          }}
          onNewOrder={() => setIsOrderModalOpen(true)}
          onDocumentation={() => setIsDocModalOpen(true)}
          onSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Content Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-canvas overflow-hidden">
          {/* Mobile Tab Switcher */}
          <div className="xl:hidden flex items-center bg-surface border-b border-outline text-xs font-label">
            <button
              onClick={() => {
                setMobileTab("chart");
                // Ensure the sidebar returns to charts mode so the chart
                // actually renders (showChart depends on activeSideTab).
                setActiveSideTab("charts");
              }}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === "chart"
                  ? "text-primary border-b-2 border-primary font-bold bg-surface-container"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setMobileTab("analysis")}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === "analysis"
                  ? "text-primary border-b-2 border-primary font-bold bg-surface-container"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {showSidePanel ? activeSideTab.charAt(0).toUpperCase() + activeSideTab.slice(1) : "Analysis"}
            </button>
            <button
              onClick={() => setMobileTab("history")}
              className={`flex-1 py-2 text-center transition-colors ${
                mobileTab === "history"
                  ? "text-primary border-b-2 border-primary font-bold bg-surface-container"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              History
            </button>
          </div>

          {/* Upper Section: Resizable Split on Desktop */}
          <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
            {/* Interactive Chart Component — hidden when a feature tab is active */}
            {showChart && (
              <div
                className={`flex flex-col min-h-0 ${
                  mobileTab === "chart" ? "flex" : "hidden xl:flex"
                }`}
                style={{ flex: `0 0 ${splitRatio}%` }}
              >
                <InteractiveChart
                  ref={chartRef}
                  symbol={currentSymbol}
                  timeframe={currentTimeframe}
                  analysis={currentAnalysis}
                />
              </div>
            )}

            {/* Resize Handle (desktop only, charts mode only) */}
            {showChart && (
              <div
                className="hidden xl:flex items-center justify-center w-1.5 cursor-col-resize group hover:bg-primary/20 transition-colors z-30 shrink-0"
                onMouseDown={handleResizeMouseDown}
                title="Drag to resize"
              >
                <div className="w-0.5 h-8 bg-outline group-hover:bg-primary rounded-full transition-colors" />
              </div>
            )}

            {/* Right Panel: AI Analysis or Feature Panel */}
            {/* When chart is hidden, take full width; otherwise use the split ratio */}
            <div
              className={`h-full ${
                showChart ? "min-w-[280px]" : "w-full"
              } ${
                mobileTab === "analysis" || !showChart ? "flex flex-col flex-1" : "hidden xl:flex"
              }`}
              style={showChart ? { flex: `1 1 ${100 - splitRatio}%` } : undefined}
            >
              {renderSidePanel()}
            </div>
          </div>

          {/* Bottom Collapsible Drawer: Analysis History (charts mode only) */}
          <div className={`${mobileTab === "history" ? "block" : showChart ? "hidden xl:block" : "hidden"}`}>
            <HistoryDrawer
              onSelectAnalysis={handleSelectHistoryAnalysis}
              refreshTrigger={historyRefreshKey}
            />
          </div>
        </main>
      </div>

      {/* Interactive Modals */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        symbol={currentSymbol}
        currentPrice={actionablePrice}
        priceIsLive={liveQuote.available}
        onOrderPlaced={(order) => {
          setNotification({
            type: "success",
            message: `Order Executed: ${order.type.toUpperCase()} ${order.volume} Lots of ${order.symbol} at ${order.price}`,
          });
          setHistoryRefreshKey((k) => k + 1);
        }}
      />

      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onRiskProfileChange={setRiskProfile}
      />

      {isUploadOpen && (
        <ManualChartUpload
          symbol={currentSymbol}
          timeframe={currentTimeframe}
          strategy={currentStrategy}
          onClose={() => setIsUploadOpen(false)}
          onAnalyzed={(result) => {
            setIsAnalyzing(false);
            setHistoryRefreshKey((k) => k + 1);
            setNotification({
              type: "success",
              message: `Upload analysed: ${String(result.bias).toUpperCase()} bias, confluence ${result.confluenceScore}/100. Open the analysis panel for the full breakdown.`,
            });
          }}
        />
      )}
    </div>
  );
}
