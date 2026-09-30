"use client";

import { useEffect, useState } from "react";
import { X, Settings, Volume2, Grid, Sparkles, Check, Wallet, Loader2, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "apexsmc.riskProfile";

export interface RiskProfileSettings {
  accountBalance: number;
  riskPercent: number;
}

export function readStoredRiskProfile(): RiskProfileSettings {
  if (typeof window === "undefined") return { accountBalance: 0, riskPercent: 0.01 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accountBalance: 0, riskPercent: 0.01 };
    const parsed = JSON.parse(raw) as Partial<RiskProfileSettings>;
    const balance = Number(parsed.accountBalance);
    const risk = Number(parsed.riskPercent);
    return {
      accountBalance: Number.isFinite(balance) && balance > 0 ? balance : 0,
      riskPercent: Number.isFinite(risk) && risk > 0 && risk <= 0.1 ? risk : 0.01,
    };
  } catch {
    return { accountBalance: 0, riskPercent: 0.01 };
  }
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRiskProfileChange?: (profile: RiskProfileSettings) => void;
}

const RISK_PRESETS = [
  { label: "0.5%", value: 0.005 },
  { label: "1%", value: 0.01 },
  { label: "2%", value: 0.02 },
  { label: "3%", value: 0.03 },
];

export default function SettingsModal({ isOpen, onClose, onRiskProfileChange }: SettingsModalProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [autoSMC, setAutoSMC] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [accountBalance, setAccountBalance] = useState("");
  const [riskPercent, setRiskPercent] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const stored = readStoredRiskProfile();
    setAccountBalance(stored.accountBalance > 0 ? String(stored.accountBalance) : "");
    setRiskPercent(String(stored.riskPercent * 100));
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedBalance = Number(accountBalance);
  const balanceValid = Number.isFinite(parsedBalance) && parsedBalance > 0;
  const parsedRisk = Number(riskPercent);
  const riskValid = Number.isFinite(parsedRisk) && parsedRisk > 0 && parsedRisk <= 10;

  const handleSave = async () => {
    if (!balanceValid || !riskValid) return;
    setIsSaving(true);
    const profile: RiskProfileSettings = {
      accountBalance: parsedBalance,
      riskPercent: parsedRisk / 100,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage may be unavailable in private mode; the in-memory value below
      // still lets the trader run this analysis session.
    }
    onRiskProfileChange?.(profile);
    setIsSaving(false);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-surface border border-outline rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 cursor-default">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-on-surface">Terminal Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-4 font-body text-xs text-on-surface">
          {/* Sound Alerts */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-4 h-4 text-primary" />
              <div>
                <div className="font-semibold">Audio Notifications</div>
                <div className="text-[11px] text-on-surface-variant">
                  Play tone on price alerts & SMC structure breaks
                </div>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? "bg-primary" : "bg-outline"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Chart Grid Lines */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline">
            <div className="flex items-center space-x-3">
              <Grid className="w-4 h-4 text-primary" />
              <div>
                <div className="font-semibold">Chart Grid Pattern</div>
                <div className="text-[11px] text-on-surface-variant">
                  Display subtle institutional coordinate grid
                </div>
              </div>
            </div>
            <button
              onClick={() => setGridVisible(!gridVisible)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                gridVisible ? "bg-primary" : "bg-outline"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  gridVisible ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Automatic SMC Zones */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <div className="font-semibold">SMC Structure Detection</div>
                <div className="text-[11px] text-on-surface-variant">
                  Automatically highlight Order Blocks & Fair Value Gaps
                </div>
              </div>
            </div>
            <button
              onClick={() => setAutoSMC(!autoSMC)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                autoSMC ? "bg-primary" : "bg-outline"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  autoSMC ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/*
            Risk Profile. Position size cannot be computed without it, and the
            lot-size ladder in the analysis panel is derived from these two
            numbers. Kept in localStorage so an account size never has to be
            typed before every analysis.
          */}
          <div className="p-3 rounded-lg bg-surface-container border border-outline space-y-3">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-primary" />
              <div>
                <div className="font-semibold">Risk Profile</div>
                <div className="text-[11px] text-on-surface-variant">
                  Drives lot size in every analysis
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="account-balance" className="text-[11px] text-on-surface-variant">
                Account balance
              </label>
              <div className="flex items-center gap-2">
                <span className="text-on-surface-variant font-mono">$</span>
                <input
                  id="account-balance"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  placeholder="10000"
                  className={`flex-1 bg-surface border rounded px-2.5 py-1.5 font-mono text-on-surface outline-none focus:border-primary ${
                    accountBalance && !balanceValid ? "border-bearish" : "border-outline"
                  }`}
                />
              </div>
              {accountBalance && !balanceValid && (
                <p className="text-[10px] text-bearish flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Enter a balance greater than zero.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-on-surface-variant">Risk per trade</span>
                <span className="font-mono text-primary text-[11px] font-bold">{riskPercent}%</span>
              </div>
              <div className="flex gap-2">
                {RISK_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setRiskPercent(preset.label.replace("%", ""))}
                    className={`flex-1 py-1 rounded border text-[11px] font-mono transition-colors ${
                      parsedRisk === preset.value
                        ? "bg-primary/20 border-primary text-primary font-bold"
                        : "border-outline text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant">
                1-2% is the conventional range. Anything above 3% compounds losses quickly.
              </p>
            </div>
          </div>

          {/* Candle Data Refresh Rate */}
          <div className="p-3 rounded-lg bg-surface-container border border-outline space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Feed Update Interval</span>
              <span className="font-mono text-primary text-[11px] font-bold">
                {refreshInterval} seconds
              </span>
            </div>
            <div className="flex gap-2">
              {["1", "3", "5", "10", "30"].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setRefreshInterval(sec)}
                  className={`flex-1 py-1 rounded border text-[11px] font-mono transition-colors ${
                    refreshInterval === sec
                      ? "bg-primary/20 border-primary text-primary font-bold"
                      : "bg-surface-container border-outline text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline bg-surface-container flex items-center justify-between gap-3">
          <span className="text-[10px] text-on-surface-variant">
            {balanceValid
              ? `Sizing at $${parsedBalance.toLocaleString()} and ${riskPercent}% risk.`
              : "Set a balance to enable lot sizing."}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-on-surface-variant hover:text-on-surface font-headline text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!balanceValid || !riskValid || isSaving}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-on-primary font-headline text-xs font-bold uppercase rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
