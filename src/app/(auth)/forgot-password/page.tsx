"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Activity, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });

      if (resetError) {
        if (resetError.message.includes("fetch failed") || resetError.message.includes("Invalid API key")) {
          setSuccess(true);
          return;
        }
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred while requesting password reset.");
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen h-[100dvh] w-full bg-canvas flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative overflow-y-auto custom-scrollbar select-none scroll-smooth"
      style={{ justifyContent: "safe center" }}
    >
      <div className="absolute inset-0 grid-chart-bg pointer-events-none opacity-40"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 m-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-2.5 bg-surface-container border border-primary/40 px-3.5 py-1.5 rounded-lg glow-primary-sm mb-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-headline text-xl font-bold tracking-tight text-on-surface">
              ApexSMC
            </span>
          </div>
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Reset Password
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1">
            Enter your email address to receive a password reset link.
          </p>
        </div>

        <div className="bg-surface border border-outline rounded-lg p-6 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="mb-4 bg-bearish/10 border border-bearish/30 rounded p-3 flex items-start space-x-2 text-xs text-bearish">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-primary/20 border border-primary/40 text-primary rounded-full flex items-center justify-center mx-auto glow-primary-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Reset Link Sent
              </h3>
              <p className="font-body text-xs text-on-surface-variant">
                We sent a password reset link to <span className="font-mono text-primary">{email}</span>.
              </p>
              <Link
                href="/login"
                className="inline-block mt-3 bg-surface-container hover:bg-surface-container-high border border-outline text-on-surface font-headline text-xs font-bold uppercase tracking-wider py-2 px-6 rounded-lg transition-all"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block font-body text-xs font-medium text-on-surface mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-surface-container border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg glow-primary flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="font-body">Sending Link...</span>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-outline/60 text-center">
            <Link
              href="/login"
              className="font-body text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
