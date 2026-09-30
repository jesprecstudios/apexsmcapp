"use client";

import { useState } from "react";
import { getSymbolMeta } from "@/lib/charting/data-generator";
import { X, ArrowUpRight, ArrowDownRight, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  /**
   * False when currentPrice came from the static symbol catalog because no
   * live feed is configured. The ticket must say so, otherwise the trader
   * reads a fabricated number as an executable quote.
   */
  priceIsLive?: boolean;
  onOrderPlaced?: (order: {
    symbol: string;
    type: "buy" | "sell";
    volume: number;
    price: number;
    sl: number;
    tp: number;
  }) => void;
}

export default function OrderModal({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  priceIsLive = false,
  onOrderPlaced,
}: OrderModalProps) {
  const meta = getSymbolMeta(symbol);
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [volume, setVolume] = useState("0.10");
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  // Pre-calculate smart SMC-aligned SL & TP
  const slOffset = meta.volatility * (orderType === "buy" ? -1.8 : 1.8);
  const tpOffset = meta.volatility * (orderType === "buy" ? 4.2 : -4.2);

  const calculatedSl = parseFloat((currentPrice + slOffset).toFixed(meta.decimals));
  const calculatedTp = parseFloat((currentPrice + tpOffset).toFixed(meta.decimals));

  const [sl, setSl] = useState<string>(String(calculatedSl));
  const [tp, setTp] = useState<string>(String(calculatedTp));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitted(true);
    if (onOrderPlaced) {
      onOrderPlaced({
        symbol,
        type: orderType,
        volume: parseFloat(volume) || 0.1,
        price: currentPrice,
        sl: parseFloat(sl) || calculatedSl,
        tp: parseFloat(tp) || calculatedTp,
      });
    }
    setTimeout(() => {
      setOrderSubmitted(false);
      onClose();
    }, 1200);
  };

  const riskRewardRatio = "1 : 2.3";

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-surface border border-outline rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 cursor-default">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
          <div className="flex items-center space-x-2.5">
            <span className="font-headline font-bold text-base text-on-surface">New Order</span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-container border border-outline text-primary">
              {meta.symbol}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderSubmitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-bullish/20 border border-bullish/40 flex items-center justify-center mx-auto text-bullish">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface">Order Executed</h3>
            <p className="font-body text-xs text-on-surface-variant">
              {orderType.toUpperCase()} {volume} Lots of {meta.symbol} at {currentPrice}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Direction Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrderType("buy");
                  setSl(String(parseFloat((currentPrice - meta.volatility * 1.8).toFixed(meta.decimals))));
                  setTp(String(parseFloat((currentPrice + meta.volatility * 4.2).toFixed(meta.decimals))));
                }}
                className={`py-2.5 px-3 rounded-lg border font-headline text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${
                  orderType === "buy"
                    ? "bg-bullish text-canvas border-bullish shadow-lg font-black"
                    : "bg-surface-container border-outline text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Buy / Long</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType("sell");
                  setSl(String(parseFloat((currentPrice + meta.volatility * 1.8).toFixed(meta.decimals))));
                  setTp(String(parseFloat((currentPrice - meta.volatility * 4.2).toFixed(meta.decimals))));
                }}
                className={`py-2.5 px-3 rounded-lg border font-headline text-xs font-bold uppercase flex items-center justify-center space-x-1.5 transition-all ${
                  orderType === "sell"
                    ? "bg-bearish text-canvas border-bearish shadow-lg font-black"
                    : "bg-surface-container border-outline text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Sell / Short</span>
              </button>
            </div>

            {/* Price and Spread Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline font-mono text-xs">
              <div>
                <span className="text-on-surface-variant text-[11px] block">
                  {priceIsLive ? "Market Price (live)" : "Reference Price (not live)"}
                </span>
                <span className="font-bold text-on-surface text-sm">
                  {currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: meta.decimals,
                    maximumFractionDigits: meta.decimals,
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-on-surface-variant text-[11px] block">Spread</span>
                <span className="text-primary font-semibold">{meta.spread} pips</span>
              </div>
            </div>

            {!priceIsLive && (
              <div className="flex items-start gap-2 text-[10px] text-warning bg-warning/10 border border-warning/30 rounded-md px-2 py-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>
                  No live feed is configured, so this price comes from a static reference
                  table and will not match the executable market. Do not trade from it.
                </span>
              </div>
            )}

            {/* Volume / Lot Size */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-body text-xs text-on-surface-variant">Volume (Lots)</label>
                <span className="font-mono text-[11px] text-on-surface-variant">Min: 0.01</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="50"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full bg-surface-container border border-outline focus:border-primary rounded-lg p-2.5 font-mono text-xs text-on-surface outline-none"
              />
              <div className="flex gap-1.5 mt-1.5">
                {["0.01", "0.05", "0.10", "0.50", "1.00"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVolume(v)}
                    className={`flex-1 py-1 rounded border text-[11px] font-mono transition-colors ${
                      volume === v
                        ? "bg-primary/20 border-primary text-primary font-bold"
                        : "bg-surface-container border-outline text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <label className="font-body text-xs text-bearish block mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="any"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="w-full bg-surface-container border border-bearish/40 focus:border-bearish rounded-lg p-2.5 text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="font-body text-xs text-bullish block mb-1">Take Profit</label>
                <input
                  type="number"
                  step="any"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  className="w-full bg-surface-container border border-bullish/40 focus:border-bullish rounded-lg p-2.5 text-on-surface outline-none"
                />
              </div>
            </div>

            {/* Risk / Reward Readout */}
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono bg-surface-container-high/50 p-2 rounded">
              <span className="flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 text-primary mr-1" />
                Est. Risk/Reward:
              </span>
              <span className="font-bold text-primary">{riskRewardRatio}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-headline text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer ${
                orderType === "buy"
                  ? "bg-bullish hover:bg-bullish/90 text-canvas font-black shadow-lg"
                  : "bg-bearish hover:bg-bearish/90 text-canvas font-black shadow-lg"
              }`}
            >
              <span>
                Place {orderType.toUpperCase()} Order · {volume} Lots
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
