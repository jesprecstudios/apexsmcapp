"use client";

import { X, BookOpen, Layers, Zap, TrendingUp, ShieldCheck } from "lucide-react";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  if (!isOpen) return null;

  const topics = [
    {
      title: "Order Blocks (OB)",
      icon: Layers,
      color: "text-primary",
      desc: "Order Blocks represent the last opposing candle before an aggressive expansion that breaks market structure. Bullish Order Blocks mark high-probability institutional demand zones; Bearish Order Blocks mark key institutional supply mitigations.",
    },
    {
      title: "Fair Value Gaps (FVG)",
      icon: TrendingUp,
      color: "text-yellow-400",
      desc: "A Fair Value Gap is a 3-candle price imbalance where candle 1's wick and candle 3's wick do not overlap, leaving a price void. Markets seek to rebalance these liquidity voids before continuing their primary directional trend.",
    },
    {
      title: "Break of Structure (BOS) & CHoCH",
      icon: ShieldCheck,
      color: "text-bullish",
      desc: "BOS confirms trend continuation when price prints a new swing high or low. Change of Character (CHoCH) signifies early structural exhaustion and alerts traders to potential trend reversals.",
    },
    {
      title: "Deriv Synthetic Indices Mechanics",
      icon: Zap,
      color: "text-emerald-400",
      desc: "Deriv Synthetics (V75, V100, Crash 1000, Boom 1000) simulate authentic volatility with cryptographic random number generators. Crash 1000 averages one sudden drop every 1000 ticks, while Boom 1000 averages one explosive upward spike every 1000 ticks.",
    },
  ];

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-surface border border-outline rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 cursor-default">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline shrink-0">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-on-surface">
              Smart Money Concepts & Terminal Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 font-body text-xs text-on-surface-variant">
          <p className="leading-relaxed">
            Welcome to ApexSMC. This terminal combines institutional order flow tracking with
            automated Smart Money Concepts analysis across Forex, Precious Metals, and Deriv
            Synthetic Indices.
          </p>

          <div className="space-y-3 pt-2">
            {topics.map((t) => {
              const Icon = t.icon;
              return (
                <div
                  key={t.title}
                  className="p-4 rounded-lg bg-surface-container border border-outline/70 space-y-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <h3 className="font-headline font-bold text-xs text-on-surface">{t.title}</h3>
                  </div>
                  <p className="leading-relaxed text-[11px] text-on-surface-variant">{t.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between text-xs mt-3">
            <div>
              <span className="font-headline font-bold text-primary block">Full Manual &amp; Beginner Guide Available</span>
              <span className="text-[11px] text-on-surface-variant">
                Consult <code className="text-primary font-mono text-[10px]">APEXSMC_USER_GUIDE.md</code> in the project workspace for complete step-by-step walkthroughs of every feature.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline bg-surface-container flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
