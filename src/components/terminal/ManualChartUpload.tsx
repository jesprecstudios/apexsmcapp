"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileImage, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface ManualUploadAnalysis {
  bias: string;
  confluenceScore: number;
  reasoningCount?: number;
  scenariosCount?: number;
}

interface ManualChartUploadProps {
  symbol: string;
  timeframe: string;
  strategy: string;
  onClose: () => void;
  onAnalyzed: (result: ManualUploadAnalysis) => void;
}

type Stage = "idle" | "analyzing" | "done" | "error";

interface LiveCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Manual chart-image upload for third-party charts (TradingView, Deriv web,
 * broker platforms) that we cannot capture ourselves.
 *
 * The uploaded screenshot is sent alongside REAL OHLC bars for the selected
 * symbol and timeframe, so the model can verify the levels it reads off the
 * image against actual market data instead of guessing prices from pixels.
 */
export default function ManualChartUpload({
  symbol,
  timeframe,
  strategy,
  onClose,
  onAnalyzed,
}: ManualChartUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [dragging, setDragging] = useState(false);

  const acceptFile = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;

    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Unsupported file type. Please upload a PNG, JPEG or WebP image.");
      setStage("error");
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      setError("Image is larger than 8 MB. Please upload a smaller screenshot.");
      setStage("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFile(candidate);
      setPreview(String(reader.result));
      setStage("idle");
      setError(null);
      setNote(null);
    };
    reader.onerror = () => {
      setError("Could not read that file. Please try another image.");
      setStage("error");
    };
    reader.readAsDataURL(candidate);
  }, []);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setStage("idle");
    setError(null);
    setNote(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function analyze() {
    if (!file || !preview) {
      setError("Choose a chart image first.");
      setStage("error");
      return;
    }

    setStage("analyzing");
    setError(null);
    setNote(null);

    try {
      // Pull real candles so the model has exact prices, not pixel guesses.
      const params = new URLSearchParams({
        symbol,
        timeframe,
        count: "120",
      });
      const mdRes = await fetch(`/api/v1/market-data?${params.toString()}`);
      const md = await mdRes.json();

      let candlesSample: LiveCandle[] | undefined;
      let lastPrice: number | undefined;
      let highPrice: number | undefined;
      let lowPrice: number | undefined;

      if (mdRes.ok && md.success && Array.isArray(md.candles) && md.candles.length > 0) {
        candlesSample = md.candles;
        lastPrice = md.candles[md.candles.length - 1]?.close;
        highPrice = Math.max(...md.candles.map((c: LiveCandle) => c.high));
        lowPrice = Math.min(...md.candles.map((c: LiveCandle) => c.low));
      } else {
        // The image is still usable; just be explicit that the model is
        // working from pixels alone for this run.
        setNote(
          `Live OHLC for ${symbol} ${timeframe} is unavailable (${md.error || "no data"}). The model will analyse the image on its own, so its price levels will be approximate.`
        );
      }

      const res = await fetch("/api/v1/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preview,
          symbol,
          timeframe,
          strategy,
          ...(customPrompt.trim() ? { customPrompt: customPrompt.trim() } : {}),
          ...(candlesSample
            ? {
                chartContext: {
                  candlesSample,
                  candleCount: candlesSample.length,
                  lastPrice,
                  highPrice,
                  lowPrice,
                },
              }
            : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Analysis failed (HTTP ${res.status}).`);
      }

      const result = json.result ?? json.data ?? json;
      setStage("done");
      onAnalyzed?.({
        bias: result?.bias ?? "unknown",
        confluenceScore: result?.confluence?.score ?? 0,
        reasoningCount: result?.reasoning?.length,
        scenariosCount: result?.scenarios?.length,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed unexpectedly.");
      setStage("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border border-outline rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h2 className="font-headline font-bold text-sm text-on-surface">
              Upload Chart Snapshot
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Use this for charts we cannot capture directly, such as TradingView or your
            broker platform. The image is analysed for <span className="font-mono text-on-surface">{symbol} {timeframe}</span>,
            cross-checked against real OHLC bars from the market data feed.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-outline hover:border-primary/50 hover:bg-surface-container/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
            {preview ? (
              <div className="space-y-2">
                {/* Local data-URL preview: next/image cannot optimise these,
                    and the bytes never leave the browser before analysis. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Uploaded chart preview"
                  className="max-h-40 mx-auto rounded border border-outline"
                />
                <div className="flex items-center justify-center gap-2 text-[11px] text-on-surface-variant">
                  <FileImage className="w-3 h-3" />
                  <span className="font-mono">{file?.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-bearish hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-on-surface-variant">
                <Upload className="w-6 h-6 mx-auto opacity-60" />
                <p className="text-xs font-body">Drop a chart image here, or click to browse</p>
                <p className="text-[10px] opacity-70">PNG, JPEG or WebP &middot; max 8 MB</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-headline font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Focus question (optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. Is there a bearish order block above, and where is the next liquidity sweep?"
              className="w-full bg-surface-container border border-outline focus:border-primary rounded-md px-2 py-1.5 text-xs text-on-surface font-body outline-none placeholder:text-on-surface-variant/50 resize-none"
            />
          </div>

          {note && (
            <div className="flex items-start gap-2 text-[10px] text-on-surface-variant bg-surface-container border border-outline rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-warning" />
              <span>{note}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-[10px] text-bearish bg-bearish/10 border border-bearish/30 rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stage === "done" && (
            <div className="flex items-center gap-2 text-[11px] text-bullish bg-bullish/10 border border-bullish/30 rounded-md px-2 py-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Analysis complete. Results are in the analysis panel.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant bg-surface-container/30">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={analyze}
            disabled={stage === "analyzing" || !file}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-headline font-bold uppercase tracking-wider transition-all active:scale-95 ${
              stage === "analyzing" || !file
                ? "bg-surface-container text-on-surface-variant cursor-not-allowed border border-outline"
                : "bg-primary text-on-primary hover:bg-primary/90 glow-primary cursor-pointer"
            }`}
          >
            {stage === "analyzing" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <SparklesIcon />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}
