"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/auth/schemas";
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/terminal";
  const errorMsg = searchParams.get("error");

  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("apexsmc_remembered_email") || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("apexsmc_remembered_email"));
      } catch {
        return false;
      }
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [error, setError] = useState<string | null>(
    errorMsg === "auth-callback-failed"
      ? "Authentication failed. Please log in directly."
      : null
  );

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => setLockoutTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setError(null);
    setLoading(true);

    const validation = loginSchema.safeParse({ email, password, remember_me: rememberMe });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Invalid email or password.");
      setLoading(false);
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem("apexsmc_remembered_email", email.trim());
      } else {
        localStorage.removeItem("apexsmc_remembered_email");
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        if (
          signInError.message.includes("fetch failed") ||
          signInError.message.includes("Invalid API key")
        ) {
          router.push(redirectTo);
          return;
        }

        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= 5) {
          setLockoutTimer(30);
          setError("Too many failed attempts. Please wait 30 seconds.");
        } else {
          setError(signInError.message);
        }

        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    try {
      document.cookie = "apexsmc_demo_mode=true; path=/; max-age=604800; SameSite=Lax";
    } catch {
      // ignore
    }
    router.push("/terminal?demo=true");
  };

  return (
    <div className="w-full max-w-md relative z-10 m-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center space-x-2 bg-surface-container border border-primary/40 px-3.5 py-1.5 rounded-lg glow-primary-sm mb-3">
          <Activity className="w-5 h-5 text-primary" />
          <span className="font-headline text-xl font-bold tracking-tight text-on-surface">
            ApexSMC
          </span>
        </div>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          Sign In
        </h1>
        <p className="font-body text-xs text-on-surface-variant mt-1">
          Welcome back. Enter your details to access your account.
        </p>
      </div>

      {/* Card Container */}
      <div className="bg-surface/90 border border-outline rounded-xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
        {error && (
          <div
            role="alert"
            className="mb-4 bg-bearish/10 border border-bearish/30 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-bearish animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="login_email"
              className="block font-body text-xs font-medium text-on-surface mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login_email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-surface-container border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="login_password"
                className="block font-body text-xs font-medium text-on-surface"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-body text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login_password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-container border border-outline focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-10 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-surface-container border-outline text-primary focus:ring-primary focus:ring-offset-0 focus:ring-1"
              />
              <span className="font-body text-xs text-on-surface-variant">
                Remember me
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || lockoutTimer > 0}
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-lg glow-primary flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {lockoutTimer > 0 ? (
              <span className="font-body text-bearish">Please wait ({lockoutTimer}s)</span>
            ) : loading ? (
              <span className="font-body flex items-center">
                <Activity className="w-4 h-4 mr-2 animate-spin text-on-primary" />
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Preview Button */}
        <div className="mt-4 pt-4 border-t border-outline/60 text-center">
          <button
            type="button"
            onClick={handleDevBypass}
            className="w-full py-2.5 px-3 bg-surface-container hover:bg-surface-container-high border border-outline hover:border-primary/50 rounded-lg text-xs font-headline font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Launch Demo Preview Mode</span>
          </button>
        </div>

        {/* Link to Register */}
        <div className="mt-4 text-center">
          <span className="font-body text-xs text-on-surface-variant">
            Don&apos;t have an account?{" "}
          </span>
          <Link
            href="/register"
            className="font-body text-xs font-semibold text-primary hover:underline ml-1"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="h-screen h-[100dvh] w-full bg-canvas flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative overflow-y-auto custom-scrollbar select-none scroll-smooth"
      style={{ justifyContent: "safe center" }}
    >
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 grid-chart-bg pointer-events-none opacity-40"></div>

      {/* Ambient Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 bg-surface border border-outline rounded-lg text-center font-body text-xs text-on-surface-variant">
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
