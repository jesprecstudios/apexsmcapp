"use client";

import { useState, useMemo } from "react";
import {
  History,
  Play,
  TrendingUp,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  XCircle,
  Target,
} from "lucide-react";

interface BacktestTrade {
  id: number;
  direction: "buy" | "sell";
  entry: number;
  sl: number;
  tp: number;
  result: "win" | "loss";
  rr: number;
  pnlPercent: number;
}

interface BacktestResult {
  strategyName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgRR: number;
  profitFactor: number;
  maxDrawdown: number;
  netPnl: number;
  equityCurve: number[];
  trades: BacktestTrade[];
}

const STRATEGIES = [
  { id: "ob_demand", label: "OB Demand Mitigation" },
  { id: "fvg_fill", label: "FVG Fill Retracement" },
  { id: "bos_continuation", label: "BOS Continuation" },
  { id: "choch_reversal", label: "CHoCH Reversal" },
];

function simulateBacktest(strategyId: string): BacktestResult {
  const strategyLabel = STRATEGIES.find((s) => s.id === strategyId)?.label || strategyId;
  const totalTrades = 80 + Math.floor(Math.random() * 60);
  const baseWinRate = strategyId === "ob_demand" ? 0.68 : strategyId === "fvg_fill" ? 0.62 : strategyId === "bos_continuation" ? 0.71 : 0.57;
  const winRate = baseWinRate + (Math.random() - 0.5) * 0.08;
  const wins = Math.round(totalTrades * winRate);
  const losses = totalTrades - wins;
  const avgRR = 1.5 + Math.random() * 1.5;
  const profitFactor = (wins * avgRR) / (losses || 1);
  const maxDrawdown = 5 + Math.random() * 12;

  const trades: BacktestTrade[] = [];
  let equity = 10000;
  const equityCurve: number[] = [equity];

  for (let i = 0; i < totalTrades; i++) {
    const isWin = Math.random() < winRate;
    const rr = isWin ? 1.2 + Math.random() * 2.5 : -(0.8 + Math.random() * 0.4);
    const pnlPercent = isWin ? rr * 1.0 : -1.0;
    equity += equity * (pnlPercent / 100);
    equityCurve.push(equity);

    trades.push({
      id: i + 1,
      direction: Math.random() > 0.5 ? "buy" : "sell",
      entry: 1.0850 + Math.random() * 0.02,
      sl: 1.0850 - 0.003,
      tp: 1.0850 + 0.007,
      result: isWin ? "win" : "loss",
      rr: Math.abs(rr),
      pnlPercent,
    });
  }

  return {
    strategyName: strategyLabel,
    totalTrades,
    wins,
    losses,
    winRate: winRate * 100,
    avgRR,
    profitFactor,
    maxDrawdown,
    netPnl: ((equity - 10000) / 10000) * 100,
    equityCurve,
    trades,
  };
}

interface StrategyBacktestPanelProps {
  symbol: string;
  timeframe: string;
}

export default function StrategyBacktestPanel({ symbol, timeframe }: StrategyBacktestPanelProps) {
  const [selectedStrategy, setSelectedStrategy] = useState("ob_demand");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = () => {
    setIsRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(simulateBacktest(selectedStrategy));
      setIsRunning(false);
    }, 800);
  };

  // Mini equity curve SVG
  const equitySvg = useMemo(() => {
    if (!result) return null;
    const data = result.equityCurve;
    const w = 320;
    const h = 60;
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal || 1;
    const points = data
      .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - minVal) / range) * h}`)
      .join(" ");
    return { points, w, h };
  }, [result]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="font-headline font-bold text-sm text-on-surface">Strategy Backtest</h2>
          <p className="text-[10px] text-on-surface-variant font-body">
            {symbol} · {timeframe} · Simulated historical performance
          </p>
        </div>
      </div>

      {/* Strategy Selector */}
      <div className="space-y-2">
        <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">Select Strategy</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStrategy(s.id)}
              className={`p-2 rounded-lg border text-[11px] font-body text-left transition-colors cursor-pointer ${
                selectedStrategy === s.id
                  ? "bg-primary/10 border-primary/40 text-primary font-semibold glow-primary-sm"
                  : "bg-surface-container border-outline text-on-surface-variant hover:border-primary/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunBacktest}
        disabled={isRunning}
        className={`w-full py-2.5 rounded-lg font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
          isRunning
            ? "bg-surface-container border border-primary/50 text-primary opacity-70 cursor-wait"
            : "bg-primary hover:bg-primary/90 text-on-primary glow-primary-sm"
        }`}
      >
        <Play className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
        <span>{isRunning ? "Running Backtest..." : "Run Backtest"}</span>
      </button>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-surface-container border border-outline text-center">
              <div className="font-mono text-lg font-bold text-primary">{result.winRate.toFixed(1)}%</div>
              <div className="text-[10px] text-on-surface-variant font-body">Win Rate</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-outline text-center">
              <div className="font-mono text-lg font-bold text-on-surface">1 : {result.avgRR.toFixed(1)}</div>
              <div className="text-[10px] text-on-surface-variant font-body">Avg R:R</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-outline text-center">
              <div className="font-mono text-lg font-bold text-gold">{result.profitFactor.toFixed(2)}</div>
              <div className="text-[10px] text-on-surface-variant font-body">Profit Factor</div>
            </div>
            <div className="p-3 rounded-lg bg-surface-container border border-outline text-center">
              <div className="font-mono text-lg font-bold text-bearish">-{result.maxDrawdown.toFixed(1)}%</div>
              <div className="text-[10px] text-on-surface-variant font-body">Max Drawdown</div>
            </div>
          </div>

          {/* Summary Row */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline text-xs font-mono">
            <span className="text-on-surface-variant">
              {result.totalTrades} trades · <span className="text-bullish">{result.wins}W</span> / <span className="text-bearish">{result.losses}L</span>
            </span>
            <span className={`font-bold ${result.netPnl >= 0 ? "text-bullish" : "text-bearish"}`}>
              Net: {result.netPnl >= 0 ? "+" : ""}{result.netPnl.toFixed(1)}%
            </span>
          </div>

          {/* Equity Curve */}
          {equitySvg && (
            <div className="space-y-1">
              <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>Equity Curve</span>
              </h4>
              <div className="bg-surface-container rounded-lg border border-outline p-2 overflow-hidden">
                <svg viewBox={`0 0 ${equitySvg.w} ${equitySvg.h}`} className="w-full h-16">
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={result.netPnl >= 0 ? "#22C55E" : "#E05C64"} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={result.netPnl >= 0 ? "#22C55E" : "#E05C64"} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,${equitySvg.h} ${equitySvg.points} ${equitySvg.w},${equitySvg.h}`}
                    fill="url(#eqGrad)"
                  />
                  <polyline
                    points={equitySvg.points}
                    fill="none"
                    stroke={result.netPnl >= 0 ? "#22C55E" : "#E05C64"}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Recent Trades */}
          <div className="space-y-1.5">
            <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wider">
              Recent Trades ({Math.min(result.trades.length, 8)}/{result.totalTrades})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {result.trades.slice(-8).reverse().map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded bg-surface-container border border-outline/50 text-[10px] font-mono"
                >
                  <div className="flex items-center space-x-2">
                    {t.direction === "buy" ? (
                      <TrendingUp className="w-3 h-3 text-bullish" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-bearish" />
                    )}
                    <span className="text-on-surface">{t.entry.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-on-surface-variant">R:R {t.rr.toFixed(1)}</span>
                    {t.result === "win" ? (
                      <span className="flex items-center space-x-0.5 text-bullish font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> <span>WIN</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-0.5 text-bearish font-semibold">
                        <XCircle className="w-3 h-3" /> <span>LOSS</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
