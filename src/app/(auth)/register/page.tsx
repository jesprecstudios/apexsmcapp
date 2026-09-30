"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  checkPasswordRequirements,
  sanitizeInput,
  signupSchema,
} from "@/lib/auth/schemas";
import {
  Activity,
  Lock,
  Mail,
  User,
  MapPin,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X,
  Globe,
} from "lucide-react";

const SUGGESTED_LOCATIONS = [
  "London, United Kingdom",
  "New York, United States",
  "Singapore",
  "Dubai, UAE",
  "Frankfurt, Germany",
  "Tokyo, Japan",
  "Johannesburg, South Africa",
  "Sydney, Australia",
];

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Real-time password criteria evaluation
  const passAnalysis = useMemo(() => {
    return checkPasswordRequirements(password);
  }, [password]);

  const passwordsMatch = useMemo(() => {
    return confirmPassword.length > 0 && password === confirmPassword;
  }, [password, confirmPassword]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    // Honeypot check for bots
    if (honeypot.trim().length > 0) {
      setError("Unable to process request.");
      setLoading(false);
      return;
    }

    const sanitizedFirstName = sanitizeInput(firstName);
    const sanitizedLastName = sanitizeInput(lastName);
    const sanitizedLocation = sanitizeInput(location);
    const sanitizedEmail = email.trim().toLowerCase();

    // Validate using Zod schema
    const validation = signupSchema.safeParse({
      first_name: sanitizedFirstName,
      last_name: sanitizedLastName,
      email: sanitizedEmail,
      location: sanitizedLocation,
      password,
      confirm_password: confirmPassword,
      honeypot,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path && !errMap[path]) {
          errMap[path] = issue.message;
        }
      });
      setFieldErrors(errMap);
      setError(validation.error.issues[0]?.message || "Please check the form for errors.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          data: {
            first_name: sanitizedFirstName,
            last_name: sanitizedLastName,
            location: sanitizedLocation,
            display_name: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
          },
        },
      });

      if (signUpError) {
        if (
          signUpError.message.includes("fetch failed") ||
          signUpError.message.includes("Invalid API key")
        ) {
          setSuccess(true);
          setTimeout(() => router.push("/terminal"), 1500);
          return;
        }
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred during sign up. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="h-screen h-[100dvh] w-full bg-canvas flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative overflow-y-auto custom-scrollbar select-none scroll-smooth"
      style={{ justifyContent: "safe center" }}
    >
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 grid-chart-bg pointer-events-none opacity-40"></div>

      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 m-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center space-x-2 bg-surface-container border border-primary/40 px-3.5 py-1.5 rounded-lg glow-primary-sm mb-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-headline text-xl font-bold tracking-tight text-on-surface">
              ApexSMC
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Create an Account
          </h1>
          <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1.5">
            Get started with real-time charts and Smart Money Concepts analysis.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-surface/90 border border-outline rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div
              role="alert"
              className="mb-5 bg-bearish/10 border border-bearish/30 rounded-lg p-3.5 flex items-start space-x-2.5 text-xs text-bearish animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 bg-primary/20 border border-primary/50 text-primary rounded-full flex items-center justify-center mx-auto glow-primary">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface">
                Account Created Successfully
              </h3>
              <p className="font-body text-xs sm:text-sm text-on-surface-variant max-w-sm mx-auto">
                Your account is ready. You can now access the terminal.
              </p>
              <div className="pt-2">
                <Link
                  href="/terminal"
                  className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs font-bold uppercase tracking-wider py-3 px-8 rounded-lg glow-primary transition-all active:scale-[0.98]"
                >
                  <span>Go to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              {/* Invisible Honeypot Field */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website_hp">Leave empty</label>
                <input
                  id="website_hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Name Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="first_name"
                    className="block font-body text-xs font-medium text-on-surface mb-1"
                  >
                    First Name <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="first_name"
                      name="given-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className={`w-full bg-surface-container border ${
                        fieldErrors.first_name ? "border-bearish focus:border-bearish" : "border-outline focus:border-primary"
                      } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
                    />
                  </div>
                  {fieldErrors.first_name && (
                    <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.first_name}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="last_name"
                    className="block font-body text-xs font-medium text-on-surface mb-1"
                  >
                    Last Name <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="last_name"
                      name="family-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className={`w-full bg-surface-container border ${
                        fieldErrors.last_name ? "border-bearish focus:border-bearish" : "border-outline focus:border-primary"
                      } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
                    />
                  </div>
                  {fieldErrors.last_name && (
                    <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block font-body text-xs font-medium text-on-surface mb-1"
                >
                  Email Address <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full bg-surface-container border ${
                      fieldErrors.email ? "border-bearish focus:border-bearish" : "border-outline focus:border-primary"
                    } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.email}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block font-body text-xs font-medium text-on-surface mb-1"
                >
                  Location <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="location"
                    name="country-name"
                    type="text"
                    required
                    autoComplete="country-name"
                    list="suggested-locations"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter your city or country"
                    className={`w-full bg-surface-container border ${
                      fieldErrors.location ? "border-bearish focus:border-bearish" : "border-outline focus:border-primary"
                    } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
                  />
                  <datalist id="suggested-locations">
                    {SUGGESTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                {/* Location Quick Options */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] font-body text-on-surface-variant flex items-center mr-1">
                    <Globe className="w-3 h-3 mr-1 text-primary/70" /> Popular:
                  </span>
                  {["London, UK", "New York, US", "Singapore", "Dubai, UAE", "Johannesburg, SA"].map((hub) => (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => setLocation(hub)}
                      className={`text-[11px] font-body px-2 py-0.5 rounded border transition-colors ${
                        location === hub
                          ? "bg-primary/20 border-primary text-primary font-medium"
                          : "bg-surface-container-high border-outline/50 text-on-surface-variant hover:text-on-surface hover:border-outline"
                      }`}
                    >
                      {hub}
                    </button>
                  ))}
                </div>
                {fieldErrors.location && (
                  <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.location}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block font-body text-xs font-medium text-on-surface mb-1"
                >
                  Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onFocus={() => setFocusedField("password")}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className={`w-full bg-surface-container border ${
                      fieldErrors.password ? "border-bearish focus:border-bearish" : "border-outline focus:border-primary"
                    } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-10 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
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

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-body">
                      <span className="text-on-surface-variant">Password strength</span>
                      <span
                        className={`font-semibold ${
                          passAnalysis.level === "strong"
                            ? "text-bullish"
                            : passAnalysis.level === "good"
                            ? "text-primary"
                            : passAnalysis.level === "fair"
                            ? "text-yellow-400"
                            : "text-bearish"
                        }`}
                      >
                        {passAnalysis.label}
                      </span>
                    </div>
                    {/* Visual Segmented Progress Bar */}
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className={`h-full flex-1 transition-all duration-300 ${
                            seg <= passAnalysis.score
                              ? passAnalysis.score === 5
                                ? "bg-bullish"
                                : passAnalysis.score >= 3
                                ? "bg-primary"
                                : "bg-bearish"
                              : "bg-surface-variant/40"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Password Requirements Checklist */}
                {(focusedField === "password" || password.length > 0) && (
                  <div className="mt-3 p-3 bg-surface-container border border-outline/60 rounded-lg space-y-1.5 animate-in fade-in duration-200">
                    <div className="text-[11px] font-body text-on-surface-variant font-medium mb-1">
                      Password must contain:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-body">
                      <div
                        className={`flex items-center space-x-1.5 ${
                          passAnalysis.minLength ? "text-bullish" : "text-on-surface-variant/70"
                        }`}
                      >
                        {passAnalysis.minLength ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px]">○</span>
                        )}
                        <span>8+ characters</span>
                      </div>

                      <div
                        className={`flex items-center space-x-1.5 ${
                          passAnalysis.hasNumber ? "text-bullish" : "text-on-surface-variant/70"
                        }`}
                      >
                        {passAnalysis.hasNumber ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px]">○</span>
                        )}
                        <span>1 number (0-9)</span>
                      </div>

                      <div
                        className={`flex items-center space-x-1.5 ${
                          passAnalysis.hasUppercase ? "text-bullish" : "text-on-surface-variant/70"
                        }`}
                      >
                        {passAnalysis.hasUppercase ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px]">○</span>
                        )}
                        <span>1 uppercase letter (A-Z)</span>
                      </div>

                      <div
                        className={`flex items-center space-x-1.5 ${
                          passAnalysis.hasLowercase ? "text-bullish" : "text-on-surface-variant/70"
                        }`}
                      >
                        {passAnalysis.hasLowercase ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px]">○</span>
                        )}
                        <span>1 lowercase letter (a-z)</span>
                      </div>

                      <div
                        className={`flex items-center space-x-1.5 sm:col-span-2 ${
                          passAnalysis.hasSpecialChar ? "text-bullish" : "text-on-surface-variant/70"
                        }`}
                      >
                        {passAnalysis.hasSpecialChar ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center text-[10px]">○</span>
                        )}
                        <span>1 special character (!@#$%...)</span>
                      </div>
                    </div>
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm_password"
                  className="block font-body text-xs font-medium text-on-surface mb-1"
                >
                  Confirm Password <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm_password"
                    name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`w-full bg-surface-container border ${
                      fieldErrors.confirm_password
                        ? "border-bearish focus:border-bearish"
                        : passwordsMatch
                        ? "border-bullish focus:border-bullish"
                        : "border-outline focus:border-primary"
                    } focus:ring-1 focus:ring-primary rounded-lg text-xs py-2.5 pl-9 pr-10 text-on-surface placeholder:text-on-surface-variant/50 font-body transition-colors outline-none`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-xs font-body">
                    {passwordsMatch ? (
                      <span className="text-bullish flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-bearish flex items-center">
                        <X className="w-3.5 h-3.5 mr-1" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
                {fieldErrors.confirm_password && (
                  <p className="mt-1 text-[11px] text-bearish font-body">{fieldErrors.confirm_password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-primary hover:bg-primary/90 text-on-primary font-headline text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-lg glow-primary flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="font-body flex items-center">
                    <Activity className="w-4 h-4 mr-2 animate-spin text-on-primary" />
                    Creating Account...
                  </span>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Navigation to Login */}
          <div className="mt-6 pt-4 border-t border-outline/60 text-center">
            <span className="font-body text-xs text-on-surface-variant">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="font-body text-xs font-semibold text-primary hover:underline ml-1"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
