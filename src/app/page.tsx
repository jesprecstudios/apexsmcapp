"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  CandlestickChart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  Layers,
  ShieldCheck,
  Camera,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Flame,
} from "lucide-react";

interface SlideData {
  id: string;
  badge: string;
  badgeIcon: React.ElementType;
  headline: string;
  subhead: string;
  bullets: Array<{ title: string; desc: string }>;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  renderPreview: () => React.ReactNode;
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Swipe / Drag state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const SLIDE_INTERVAL = 6000; // 6 seconds per slide
  const TICK_INTERVAL = 50;

  const slides: SlideData[] = [
    {
      id: "smc",
      badge: "Institutional Order Flow",
      badgeIcon: Layers,
      headline: "Trade With The Banks, Not Against Them",
      subhead:
        "Identify high-probability institutional setups. Map unmitigated Order Blocks, Fair Value Gaps, and liquidity sweeps across any timeframe.",
      bullets: [
        {
          title: "Order Block Demand & Supply",
          desc: "Pinpoint institutional discount & premium mitigation zones with precision.",
        },
        {
          title: "Fair Value Gap (FVG) Imbalance",
          desc: "Track 3-candle price voids and liquidity rebalance targets.",
        },
        {
          title: "Market Structure Shifts",
          desc: "Confirm true trend continuity with BOS rays and CHoCH structural breaks.",
        },
      ],
      primaryCtaText: "Launch Terminal",
      primaryCtaLink: "/terminal",
      secondaryCtaText: "Create Account",
      secondaryCtaLink: "/register",
      renderPreview: () => (
        <div className="bg-surface/90 border border-outline rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline/70 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-headline font-bold text-sm text-on-surface">EUR/USD · H1</span>
              <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded font-semibold">
                SMC ACTIVE
              </span>
            </div>
            <span className="font-mono text-xs font-semibold text-primary">1.08642</span>
          </div>

          {/* Simulated Chart Mockup */}
          <div className="h-44 bg-surface-container rounded-xl border border-outline/60 p-3 relative overflow-hidden flex flex-col justify-between">
            {/* Background Grid */}
            <div className="absolute inset-0 grid-chart-bg opacity-30 pointer-events-none"></div>

            {/* BOS Line Ray */}
            <div className="absolute top-10 left-6 right-6 border-b border-dashed border-primary/70 flex items-center justify-between text-[9px] font-mono text-primary z-10">
              <span className="bg-surface-container px-1 rounded">BOS (Break of Structure)</span>
              <span className="bg-surface-container px-1 rounded font-bold">1.08720</span>
            </div>

            {/* FVG Corridor Box */}
            <div className="absolute top-18 left-16 right-12 h-10 bg-gold/15 border-y border-dashed border-gold/60 rounded flex items-center justify-between px-2 text-[9px] font-mono text-gold z-10">
              <span>Fair Value Gap [FVG]</span>
              <span>1.08550 - 1.08610</span>
            </div>

            {/* Bullish Order Block Demand Zone */}
            <div className="absolute bottom-6 left-8 right-16 h-12 bg-primary/20 border border-primary/70 rounded-lg flex items-center justify-between px-3 text-[10px] font-mono text-primary glow-primary-sm z-10">
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="w-2 h-2 rounded bg-primary"></span>
                <span>Bullish Order Block [OB]</span>
              </div>
              <span className="font-bold">1.08420</span>
            </div>

            {/* Price Candlesticks Representation */}
            <div className="relative z-0 h-full flex items-end justify-around px-4 opacity-50 pb-2">
              <div className="w-2 h-16 bg-bearish rounded-xs"></div>
              <div className="w-2 h-24 bg-bearish rounded-xs"></div>
              <div className="w-2 h-12 bg-bullish rounded-xs"></div>
              <div className="w-2 h-32 bg-bullish rounded-xs"></div>
              <div className="w-2 h-20 bg-bullish rounded-xs"></div>
            </div>
          </div>

          {/* Level Badges */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div className="bg-surface-container p-2 rounded border border-outline">
              <span className="text-on-surface-variant block text-[9px]">DEMAND POI</span>
              <span className="font-bold text-primary">1.08420</span>
            </div>
            <div className="bg-surface-container p-2 rounded border border-outline">
              <span className="text-on-surface-variant block text-[9px]">STOP LOSS</span>
              <span className="font-bold text-bearish">1.08120</span>
            </div>
            <div className="bg-surface-container p-2 rounded border border-outline">
              <span className="text-on-surface-variant block text-[9px]">TARGET TP1</span>
              <span className="font-bold text-bullish">1.09200</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "deriv",
      badge: "Deriv Synthetic Indices 24/7",
      badgeIcon: Zap,
      headline: "Trade Synthetic Volatility Around The Clock",
      subhead:
        "No weekend market closures. Practice and trade Volatility 75, Crash 1000, and Boom 1000 powered by real market dynamics 24 hours a day, 365 days a year.",
      bullets: [
        {
          title: "Volatility 75 & 100 (V75 / V100)",
          desc: "Constant statistical volatility with fluid order flow and clear market structure.",
        },
        {
          title: "Crash 1000 & Boom 1000",
          desc: "Poisson drop probability models and explosive directional spikes for sniper entries.",
        },
        {
          title: "Dual Charting Support",
          desc: "Seamlessly switch between TradingView Deriv charts and the native SMC Canvas engine.",
        },
      ],
      primaryCtaText: "Trade Synthetics",
      primaryCtaLink: "/terminal",
      secondaryCtaText: "Create Account",
      secondaryCtaLink: "/register",
      renderPreview: () => (
        <div className="bg-surface/90 border border-outline rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline/70 pb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-headline font-bold text-sm text-on-surface">Deriv Synthetics</span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold flex items-center">
                <Clock className="w-3 h-3 mr-1" /> 24/7/365 LIVE
              </span>
            </div>
            <span className="text-xs font-mono text-on-surface-variant">Zero Weekend Gaps</span>
          </div>

          {/* Indices Tickers Grid */}
          <div className="grid grid-cols-2 gap-2.5 font-mono">
            <div className="bg-surface-container p-3 rounded-xl border border-primary/40 glow-primary-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-headline font-bold text-xs text-on-surface">V75 INDEX</span>
                <span className="text-[9px] bg-primary/20 text-primary px-1 rounded">75% VOL</span>
              </div>
              <div className="font-bold text-sm text-primary">325,480.20</div>
              <span className="text-[10px] text-bullish flex items-center mt-0.5">
                <TrendingUp className="w-3 h-3 mr-0.5" /> High Liquidity
              </span>
            </div>

            <div className="bg-surface-container p-3 rounded-xl border border-bearish/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-headline font-bold text-xs text-on-surface">CRASH 1000</span>
                <span className="text-[9px] bg-bearish/20 text-bearish px-1 rounded">CRASH</span>
              </div>
              <div className="font-bold text-sm text-bearish">1,120.45</div>
              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                1:1000 Drop Event
              </span>
            </div>

            <div className="bg-surface-container p-3 rounded-xl border border-bullish/40">
              <div className="flex items-center justify-between mb-1">
                <span className="font-headline font-bold text-xs text-on-surface">BOOM 1000</span>
                <span className="text-[9px] bg-bullish/20 text-bullish px-1 rounded">BOOM</span>
              </div>
              <div className="font-bold text-sm text-bullish">1,085.60</div>
              <span className="text-[10px] text-bullish flex items-center mt-0.5">
                <Flame className="w-3 h-3 mr-0.5" /> Spike Engine
              </span>
            </div>

            <div className="bg-surface-container p-3 rounded-xl border border-outline">
              <div className="flex items-center justify-between mb-1">
                <span className="font-headline font-bold text-xs text-on-surface">JUMP 75</span>
                <span className="text-[9px] bg-surface-container-high text-on-surface-variant px-1 rounded">JUMP</span>
              </div>
              <div className="font-bold text-sm text-on-surface">4,620.00</div>
              <span className="text-[10px] text-primary block mt-0.5">
                Discrete Steps
              </span>
            </div>
          </div>

          {/* Synthetics Badge Banner */}
          <div className="p-2.5 bg-navy/60 border border-primary/30 rounded-xl text-xs flex items-center justify-between font-body">
            <span className="text-on-surface-variant">Live TradingView &amp; Canvas support</span>
            <span className="text-primary font-semibold font-headline">Ready 24/7</span>
          </div>
        </div>
      ),
    },
    {
      id: "confluence",
      badge: "Risk & Confluence Engine",
      badgeIcon: ShieldCheck,
      headline: "High-Conviction Setups With Measured Risk",
      subhead:
        "Never trade blindly. View objective technical confluence scores, structural invalidation points, and calculated risk-to-reward ratios before placing an order.",
      bullets: [
        {
          title: "Objective Confluence Scoring",
          desc: "Evidence-weighted model synthesizing order blocks, liquidity sweeps, and trend alignment.",
        },
        {
          title: "Clear Invalidation Stops",
          desc: "Precise stop-loss levels where the market setup structure is technically broken.",
        },
        {
          title: "Calculated R:R Ratios",
          desc: "Instant scenario calculations showing minimum 1:3 reward-to-risk objectives.",
        },
      ],
      primaryCtaText: "Explore Setups",
      primaryCtaLink: "/terminal",
      secondaryCtaText: "Create Account",
      secondaryCtaLink: "/register",
      renderPreview: () => (
        <div className="bg-surface/90 border border-outline rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-3.5 max-w-md w-full">
          {/* Executive Setup Banner */}
          <div className="bg-navy/70 border border-primary/50 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold glow-primary-sm">
                <ArrowUpRight className="w-5 h-5 font-bold" />
              </div>
              <div>
                <span className="font-headline text-sm font-extrabold text-primary block">
                  BULLISH BIAS
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  SMC Confluence Setup · EUR/USD
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xl font-bold text-primary block">86%</span>
              <span className="text-[9px] text-on-surface-variant uppercase font-body">
                Confluence
              </span>
            </div>
          </div>

          {/* Risk-to-Reward Highlight */}
          <div className="flex items-center justify-between bg-surface-container px-3 py-2 rounded-lg border border-outline text-xs font-mono">
            <span className="text-on-surface-variant font-body">Calculated Ratio:</span>
            <span className="text-primary font-bold bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
              R:R = 1 : 3.8
            </span>
          </div>

          {/* Key Levels List */}
          <div className="space-y-1.5 text-xs font-mono">
            <div className="bg-surface-container p-2 rounded-lg border border-outline flex items-center justify-between">
              <span className="text-on-surface-variant font-body text-[11px]">Entry POI</span>
              <span className="font-bold text-on-surface">1.08450</span>
            </div>
            <div className="bg-surface-container p-2 rounded-lg border border-bearish/40 flex items-center justify-between">
              <span className="text-on-surface-variant font-body text-[11px]">Stop Invalidation</span>
              <span className="font-bold text-bearish">1.08120</span>
            </div>
            <div className="bg-surface-container p-2 rounded-lg border border-primary/40 flex items-center justify-between">
              <span className="text-on-surface-variant font-body text-[11px]">Target TP1</span>
              <span className="font-bold text-primary">1.09200</span>
            </div>
          </div>

          {/* Confluence Factor Checks */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2 text-[11px] text-on-surface-variant">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Asian Session Lows Swept (+25 pts)</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-on-surface-variant">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Unmitigated H1 Order Block Tap (+20 pts)</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-on-surface-variant">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Higher Timeframe Directional Alignment (+20 pts)</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "journal",
      badge: "Cloud Storage & Playbook",
      badgeIcon: Camera,
      headline: "One-Click Chart Snapshots & Trade Playbook",
      subhead:
        "Capture clean high-resolution chart snapshots instantly to Cloudinary. Build a systematic trading playbook, review your execution, and refine your edge.",
      bullets: [
        {
          title: "Instant Cloud Snapshots",
          desc: "Capture the active canvas with exact price range coordinates and timestamps.",
        },
        {
          title: "Interactive History Drawer",
          desc: "Revisit and reload past analyzed trade setups with one click.",
        },
        {
          title: "Multi-Strategy Catalog",
          desc: "Filter records by SMC, Classical Patterns, Candlestick Reversals, or Confluence.",
        },
      ],
      primaryCtaText: "Get Started Free",
      primaryCtaLink: "/register",
      secondaryCtaText: "Sign In",
      secondaryCtaLink: "/login",
      renderPreview: () => (
        <div className="bg-surface/90 border border-outline rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-3.5 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-outline/70 pb-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-primary" />
              <span className="font-headline font-bold text-sm text-on-surface">Snapshot Gallery</span>
            </div>
            <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded font-semibold">
              CLOUDINARY STORAGE
            </span>
          </div>

          {/* Historical Saved Cards */}
          <div className="space-y-2 text-xs">
            <div className="bg-surface-container p-2.5 rounded-xl border border-primary/30 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-headline font-bold text-on-surface">EUR/USD H1</span>
                  <span className="text-[9px] font-mono bg-primary/20 text-primary px-1 rounded font-semibold">
                    SMC
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Demand OB reaction after liquidity sweep
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-primary">86%</span>
                <span className="text-[9px] text-primary block uppercase font-headline">BULLISH</span>
              </div>
            </div>

            <div className="bg-surface-container p-2.5 rounded-xl border border-outline flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-headline font-bold text-on-surface">V75 M15</span>
                  <span className="text-[9px] font-mono bg-surface-container-high text-on-surface-variant px-1 rounded font-semibold">
                    DERIV
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  High-volatility CHoCH retest
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-bearish">78%</span>
                <span className="text-[9px] text-bearish block uppercase font-headline">BEARISH</span>
              </div>
            </div>

            <div className="bg-surface-container p-2.5 rounded-xl border border-outline flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-headline font-bold text-on-surface">CRASH 1000 H1</span>
                  <span className="text-[9px] font-mono bg-gold/20 text-gold px-1 rounded font-semibold">
                    PATTERNS
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant block mt-0.5">
                  Ascending channel ceiling retest
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-on-surface">72%</span>
                <span className="text-[9px] text-on-surface-variant block uppercase font-headline">NEUTRAL</span>
              </div>
            </div>
          </div>

          <div className="pt-1 text-center">
            <span className="text-[11px] text-on-surface-variant font-body">
              All chart captures stored securely with instant replay
            </span>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  // Autoplay timer with progress calculation
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (TICK_INTERVAL / SLIDE_INTERVAL) * 100;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isPaused, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance) {
      handleNext(); // Swiped left -> show next
    } else if (diff < -minSwipeDistance) {
      handlePrev(); // Swiped right -> show prev
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current || dragStartX.current === null) return;
    const diff = dragStartX.current - e.clientX;
    const minDragDistance = 50;

    if (diff > minDragDistance) {
      handleNext();
    } else if (diff < -minDragDistance) {
      handlePrev();
    }

    isDragging.current = false;
    dragStartX.current = null;
  };

  return (
    <div
      className="h-screen max-h-screen w-screen overflow-hidden bg-canvas text-on-surface flex flex-col justify-between select-none relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Background Subtle Grid & Ambient Glows */}
      <div className="absolute inset-0 grid-chart-bg pointer-events-none opacity-40"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="h-14 sm:h-16 px-4 sm:px-8 border-b border-outline-variant flex items-center justify-between z-30 shrink-0 bg-surface/80 backdrop-blur-md">
        {/* Brand Monogram */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center border border-primary/40 glow-primary-sm group-hover:border-primary transition-colors">
            <CandlestickChart className="w-5 h-5 text-primary" />
          </div>
          <span className="font-headline text-lg sm:text-xl font-bold tracking-tight text-on-surface">
            ApexSMC
          </span>
          <span className="font-mono text-[10px] text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded uppercase font-semibold">
            PRO
          </span>
        </Link>

        {/* Center Quick Slide Tracker */}
        <div className="hidden md:flex items-center space-x-1 bg-surface-container border border-outline rounded-full px-3 py-1 text-xs font-headline">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => {
                setCurrentSlide(idx);
                setProgress(0);
              }}
              className={`px-3 py-0.5 rounded-full transition-all text-[11px] font-bold uppercase tracking-wider ${
                currentSlide === idx
                  ? "bg-primary text-on-primary glow-primary-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {idx + 1}. {s.id.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center space-x-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-headline font-bold text-on-surface-variant hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-headline font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-on-primary py-2 px-3.5 sm:px-4 rounded-lg glow-primary shadow-lg transition-all active:scale-95 flex items-center space-x-1.5"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Sideways Carousel Container */}
      <main className="flex-1 relative overflow-hidden flex items-center min-h-0">
        {/* Navigation Arrow Left */}
        <button
          onClick={handlePrev}
          aria-label="Previous Slide"
          className="absolute left-2 sm:left-4 z-30 p-2.5 rounded-full bg-surface/80 hover:bg-surface border border-outline hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all backdrop-blur shadow-lg active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Navigation Arrow Right */}
        <button
          onClick={handleNext}
          aria-label="Next Slide"
          className="absolute right-2 sm:right-4 z-30 p-2.5 rounded-full bg-surface/80 hover:bg-surface border border-outline hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all backdrop-blur shadow-lg active:scale-90"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Horizontal Sliding Track */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out will-change-transform"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide) => {
            const BadgeIcon = slide.badgeIcon;
            return (
              <section
                key={slide.id}
                className="w-full h-full shrink-0 flex items-center justify-center px-6 sm:px-12 lg:px-20 py-4 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                  {/* Left Column: Feature Narrative */}
                  <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
                    {/* Badge */}
                    <div className="inline-flex items-center space-x-2 bg-surface-container border border-primary/40 px-3 py-1 rounded-full glow-primary-sm">
                      <BadgeIcon className="w-4 h-4 text-primary" />
                      <span className="font-headline text-xs font-bold uppercase tracking-wider text-primary">
                        {slide.badge}
                      </span>
                    </div>

                    {/* Headline */}
                    <h1 className="font-headline text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-on-surface leading-tight">
                      {slide.headline}
                    </h1>

                    {/* Subhead */}
                    <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xl">
                      {slide.subhead}
                    </p>

                    {/* Feature Bullets */}
                    <div className="space-y-2.5 pt-1">
                      {slide.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start space-x-2.5">
                          <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-headline text-xs font-bold text-on-surface mr-1.5">
                              {b.title}:
                            </span>
                            <span className="font-body text-xs text-on-surface-variant">
                              {b.desc}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap items-center gap-3 pt-3">
                      <Link
                        href={slide.primaryCtaLink}
                        className="bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs sm:text-sm font-bold uppercase tracking-wider py-3 px-6 rounded-lg glow-primary flex items-center space-x-2 transition-all active:scale-95 shadow-xl"
                      >
                        <span>{slide.primaryCtaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      <Link
                        href={slide.secondaryCtaLink}
                        className="bg-surface-container hover:bg-surface-container-high border border-outline text-on-surface font-headline text-xs sm:text-sm font-bold uppercase tracking-wider py-3 px-5 rounded-lg transition-all hover:border-primary/50"
                      >
                        {slide.secondaryCtaText}
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Live Feature Preview Card */}
                  <div className="lg:col-span-5 flex justify-center items-center">
                    {slide.renderPreview()}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Bottom Sideways Navigation & Autoplay Progress Bar */}
      <footer className="h-16 sm:h-20 border-t border-outline-variant bg-surface/90 backdrop-blur px-4 sm:px-8 flex flex-col justify-center shrink-0 z-30">
        {/* Progress Bar Container */}
        <div className="w-full bg-surface-container h-1 rounded-full mb-3 overflow-hidden border border-outline/50 relative">
          <div
            className="bg-gradient-to-r from-primary to-primary-light h-full rounded-full transition-all duration-75 glow-primary-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Slide Indicator Cards */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto w-full">
          {slides.map((s, idx) => {
            const isActive = currentSlide === idx;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSlide(idx);
                  setProgress(0);
                }}
                className={`py-1.5 px-2 sm:px-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? "bg-navy/80 border-primary text-primary glow-primary-sm"
                    : "bg-surface-container/60 border-outline/70 text-on-surface-variant hover:text-on-surface hover:border-outline"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase font-bold tracking-wider">
                    0{idx + 1}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                  )}
                </div>
                <div className="font-headline font-bold text-[10px] sm:text-xs truncate mt-0.5 text-on-surface">
                  {s.badge}
                </div>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
