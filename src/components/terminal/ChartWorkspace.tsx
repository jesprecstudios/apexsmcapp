"use client";

import { useState } from "react";
import {
  MousePointer,
  TrendingUp,
  Sliders,
  Square,
  Ruler,
  Brush,
  Type,
  Trash2,
  Camera,
  Layers,
  SlidersHorizontal,
} from "lucide-react";

interface ChartWorkspaceProps {
  symbol: string;
  timeframe: string;
}

export default function ChartWorkspace({
  symbol,
  timeframe,
}: ChartWorkspaceProps) {
  const [activeTool, setActiveTool] = useState("crosshair");

  return (
    <section className="flex-1 flex flex-col relative border-b xl:border-b-0 xl:border-r border-outline-variant bg-canvas overflow-hidden select-none min-h-[420px]">
      {/* Chart Micro Control Bar */}
      <div className="h-9 bg-surface-container border-b border-outline-variant px-3 flex items-center justify-between text-xs font-mono text-on-surface-variant">
        <div className="flex items-center space-x-3">
          <span className="text-on-surface font-semibold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
            <span>
              {symbol} · {timeframe} · FXCM
            </span>
          </span>
          <span className="hidden sm:inline">
            O: <span className="text-on-surface">1.08580</span>
          </span>
          <span className="hidden sm:inline">
            H: <span className="text-primary font-bold">1.08720</span>
          </span>
          <span className="hidden sm:inline">
            L: <span className="text-bearish font-bold">1.08340</span>
          </span>
          <span>
            C: <span className="text-primary font-bold">1.08642</span>
          </span>
          <span className="text-primary font-semibold hidden md:inline">
            +0.00262 (+0.24%)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] bg-navy px-1.5 py-0.5 rounded text-on-surface font-body font-medium border border-outline">
            SMC Engine Active
          </span>
          <button
            className="text-on-surface-variant hover:text-on-surface p-1 rounded"
            title="Chart Indicators"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            className="text-on-surface-variant hover:text-on-surface p-1 rounded"
            title="Layers"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            className="text-on-surface-variant hover:text-on-surface p-1 rounded"
            title="Chart Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Left Minimalist Chart Toolbar */}
        <div className="w-10 border-r border-outline-variant bg-surface/50 flex flex-col items-center py-2 space-y-2 z-20 shrink-0">
          <button
            onClick={() => setActiveTool("crosshair")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "crosshair"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Crosshair"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("trendline")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "trendline"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Trend Line"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("fib")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "fib"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Fibonacci Retracement"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("box")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "box"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Order Block Box (Rectangle)"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("measure")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "measure"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Measure Distance"
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("brush")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "brush"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Brush / Markup"
          >
            <Brush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool("text")}
            className={`p-1.5 rounded transition-colors ${
              activeTool === "text"
                ? "text-primary bg-surface-container border border-primary/30"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            title="Text Note"
          >
            <Type className="w-4 h-4" />
          </button>
          <div className="w-4 h-px bg-outline"></div>
          <button
            className="p-1.5 text-on-surface-variant hover:text-bearish rounded transition-colors"
            title="Clear Markups"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Candlestick Graphic Viewport */}
        <div className="flex-1 relative grid-chart-bg overflow-hidden flex flex-col justify-between">
          {/* SVG Candlesticks and SMC Overlays */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 1000 500"
          >
            <defs>
              {/* Bullish Order Block Gradient Glow */}
              <linearGradient id="bullishOBGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#0E1A2F" stopOpacity="0.45" />
              </linearGradient>
              {/* FVG Imbalance Gradient */}
              <linearGradient id="fvgGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.12" />
              </linearGradient>
            </defs>

            {/* Grid Horizontal Guides */}
            <line stroke="#262D3B" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="1000" y1="90" y2="90" />
            <line stroke="#262D3B" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="1000" y1="170" y2="170" />
            <line stroke="#262D3B" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="1000" y1="250" y2="250" />
            <line stroke="#262D3B" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="1000" y1="330" y2="330" />
            <line stroke="#262D3B" strokeDasharray="3 3" strokeWidth="0.75" x1="0" x2="1000" y1="410" y2="410" />

            {/* SMC OVERLAY 1: BOS (Break of Structure) Horizontal Line Ray */}
            <line stroke="#3B82F6" strokeDasharray="4 4" strokeWidth="1.5" x1="420" x2="950" y1="120" y2="120" />
            <rect fill="#151820" height="18" rx="2" stroke="#3B82F6" strokeWidth="1" width="165" x="520" y="110" />
            <text fill="#3B82F6" fontFamily="Montserrat, sans-serif" fontSize="10" fontWeight="600" x="528" y="123">
              BOS (Break of Structure) 1.08890
            </text>

            {/* SMC OVERLAY 2: Liquidity Sweep Indicator (BSL Swept) */}
            <line stroke="#F59E0B" strokeDasharray="2 2" strokeWidth="1.2" x1="180" x2="380" y1="95" y2="95" />
            <circle cx="280" cy="95" fill="#F59E0B" r="3.5" />
            <path d="M 270 85 L 280 73 L 290 85 Z" fill="#F59E0B" />
            <rect fill="#151820" height="16" rx="2" stroke="#F59E0B" strokeWidth="1" width="130" x="235" y="55" />
            <text fill="#F59E0B" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="600" x="242" y="67">
              BSL SWEPT (Buy-Side Liq)
            </text>

            {/* SMC OVERLAY 3: Translucent Fair Value Gap (FVG) Zone */}
            <rect fill="url(#fvgGrad)" height="52" stroke="#F59E0B" strokeDasharray="3 2" strokeWidth="1" width="360" x="460" y="270" />
            <rect fill="#101216" height="15" rx="2" stroke="#F59E0B" strokeWidth="0.5" width="180" x="465" y="275" />
            <text fill="#F59E0B" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="500" x="470" y="286">
              H1 Bullish FVG [1.08420 - 1.08510]
            </text>

            {/* SMC OVERLAY 4: Bullish Order Block (OB) POI Highlight */}
            <rect fill="url(#bullishOBGrad)" height="48" stroke="#3B82F6" strokeWidth="1.2" width="550" x="310" y="340" />
            <rect fill="#101216" height="16" rx="2" stroke="#3B82F6" strokeWidth="1" width="170" x="315" y="345" />
            <text fill="#3B82F6" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="700" x="322" y="357">
              POI: H1 Bullish OB 1.08380
            </text>

            {/* SMC OVERLAY 5: Invalidation Stop Loss Zone Below */}
            <line stroke="#E05C64" strokeDasharray="3 3" strokeWidth="1.2" x1="290" x2="880" y1="440" y2="440" />
            <rect fill="#151820" height="15" rx="2" stroke="#E05C64" strokeWidth="1" width="125" x="315" y="432" />
            <text fill="#E05C64" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="600" x="322" y="443">
              Invalidation (SL): 1.08190
            </text>

            {/* Candlesticks Sequence (Forex market reversal setup) */}
            {/* Candle 1 */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="80" x2="80" y1="120" y2="230" />
            <rect fill="#E05C64" height="70" rx="1" width="14" x="73" y="140" />
            {/* Candle 2 */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="120" x2="120" y1="180" y2="310" />
            <rect fill="#E05C64" height="90" rx="1" width="14" x="113" y="200" />
            {/* Candle 3 */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="160" x2="160" y1="270" y2="330" />
            <rect fill="#4CAF88" height="30" rx="1" width="14" x="153" y="280" />
            {/* Candle 4: Liquidity run upwards */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="200" x2="200" y1="90" y2="280" />
            <rect fill="#4CAF88" height="75" rx="1" width="14" x="193" y="160" />
            {/* Candle 5: Bearish displacement */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="240" x2="240" y1="110" y2="320" />
            <rect fill="#E05C64" height="150" rx="1" width="14" x="233" y="150" />
            {/* Candle 6: Liquidity Sweep into Order Block */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="280" x2="280" y1="260" y2="385" />
            <rect fill="#E05C64" height="85" rx="1" width="14" x="273" y="280" />
            {/* Candle 7: Absorption candle in OB */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="320" x2="320" y1="310" y2="382" />
            <rect fill="#4CAF88" height="25" rx="1" width="14" x="313" y="325" />
            {/* Candle 8: Bullish Impulse (Creation of FVG) */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="360" x2="360" y1="240" y2="340" />
            <rect fill="#4CAF88" height="80" rx="1" width="14" x="353" y="250" />
            {/* Candle 9: Green continuation */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="400" x2="400" y1="170" y2="280" />
            <rect fill="#4CAF88" height="85" rx="1" width="14" x="393" y="180" />
            {/* Candle 10: Retest pullback */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="440" x2="440" y1="210" y2="295" />
            <rect fill="#E05C64" height="50" rx="1" width="14" x="433" y="225" />
            {/* Candle 11: Higher low */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="480" x2="480" y1="200" y2="275" />
            <rect fill="#4CAF88" height="45" rx="1" width="14" x="473" y="210" />
            {/* Candle 12: BOS breakout candle */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="520" x2="520" y1="110" y2="230" />
            <rect fill="#4CAF88" height="90" rx="1" width="14" x="513" y="125" />
            {/* Candle 13 */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="560" x2="560" y1="115" y2="190" />
            <rect fill="#E05C64" height="35" rx="1" width="14" x="553" y="130" />
            {/* Candle 14 */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="600" x2="600" y1="105" y2="175" />
            <rect fill="#4CAF88" height="40" rx="1" width="14" x="593" y="115" />
            {/* Candle 15 */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="640" x2="640" y1="125" y2="205" />
            <rect fill="#E05C64" height="50" rx="1" width="14" x="633" y="135" />
            {/* Candle 16 */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="680" x2="680" y1="110" y2="190" />
            <rect fill="#4CAF88" height="60" rx="1" width="14" x="673" y="120" />
            {/* Candle 17 */}
            <line stroke="#E05C64" strokeWidth="1.5" x1="720" x2="720" y1="140" y2="230" />
            <rect fill="#E05C64" height="65" rx="1" width="14" x="713" y="150" />
            {/* Candle 18 */}
            <line stroke="#4CAF88" strokeWidth="1.5" x1="760" x2="760" y1="130" y2="220" />
            <rect fill="#4CAF88" height="65" rx="1" width="14" x="753" y="145" />
            {/* Candle 19: Live tick candle */}
            <line stroke="#4CAF88" strokeWidth="1.8" x1="800" x2="800" y1="165" y2="235" />
            <rect fill="#4CAF88" height="45" rx="1" width="14" x="793" y="175" />

            {/* LIVE CURRENT PRICE LINE */}
            <line stroke="#4CAF88" strokeDasharray="3 2" strokeWidth="1.2" x1="0" x2="1000" y1="188" y2="188" />
          </svg>

          {/* Floating Live Ticker Tag on Active Candle */}
          <div className="absolute right-16 top-[174px] bg-primary text-on-primary font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow glow-primary-sm flex items-center space-x-1.5 z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-on-primary animate-pulse"></span>
            <span>1.08642</span>
          </div>

          {/* SMC On-Chart Annotation Legend Pills */}
          <div className="absolute bottom-3 left-4 flex flex-wrap gap-2 z-10 pointer-events-none">
            <div className="bg-surface/85 backdrop-blur border border-outline px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded bg-primary"></span>
              <span className="text-on-surface">Bullish Order Block [OB]</span>
            </div>
            <div className="bg-surface/85 backdrop-blur border border-outline px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded bg-gold"></span>
              <span className="text-on-surface">Fair Value Gap [FVG]</span>
            </div>
            <div className="bg-surface/85 backdrop-blur border border-outline px-2.5 py-1 rounded text-[11px] font-mono flex items-center space-x-1.5">
              <span className="w-2 h-0.5 bg-primary"></span>
              <span className="text-on-surface">Break of Structure [BOS]</span>
            </div>
          </div>

          {/* Watermark Background Symbol */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <span className="font-headline font-black text-9xl tracking-tighter">
              {symbol.replace("/", "")}
            </span>
          </div>
        </div>

        {/* Monospace Vertical Price Scale Axis (Right) */}
        <div className="w-16 border-l border-outline-variant bg-surface/90 flex flex-col justify-between py-2 text-right font-mono text-[11px] text-on-surface-variant select-none z-20">
          <div className="px-2">1.09200</div>
          <div className="px-2">1.09050</div>
          <div className="px-2 text-primary font-semibold">1.08890</div>
          <div className="px-2">1.08750</div>
          <div className="bg-primary text-on-primary font-bold px-1.5 py-0.5 rounded-l text-[10px] glow-primary-sm">
            1.08642
          </div>
          <div className="px-2 text-gold font-medium">1.08510</div>
          <div className="px-2 text-primary">1.08380</div>
          <div className="px-2 text-bearish font-semibold">1.08190</div>
          <div className="px-2">1.08050</div>
          <div className="px-2 border-t border-outline text-[9px] pt-1 text-center font-body text-on-surface-variant">
            Spread: <span className="text-primary font-mono font-bold">0.6</span>
          </div>
        </div>
      </div>

      {/* Bottom Time-Scale Axis */}
      <div className="h-6 bg-surface-container border-t border-outline-variant flex items-center justify-between px-14 font-mono text-[10px] text-on-surface-variant">
        <span>08:00</span>
        <span>10:00</span>
        <span>12:00</span>
        <span className="text-primary font-semibold">14:00 NY Open</span>
        <span>16:00</span>
        <span>18:00</span>
        <span className="text-on-surface">19:30 LIVE</span>
      </div>
    </section>
  );
}
