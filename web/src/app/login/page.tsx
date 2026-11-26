"use client";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { AuthErrorNotice } from "@/components/auth-error-notice";
import { startGoogleLogin } from "@/lib/google-login";
import { useState } from "react";
import Link from "next/link";
import { selectLocalAccount } from "@/lib/local-data";
import { motion } from "motion/react";
import { ArrowRight, Check, Sparkles, Shield, User, Building2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/i18n/language-context";
import { useAuthSession } from "@/lib/use-auth-session";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="var(--ui-ink-4285f4)"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="var(--ui-ink-34a853)"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="var(--ui-ink-fbbc05)"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="var(--ui-ink-ea4335)"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { profileHref, session } = useAuthSession();
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try { await startGoogleLogin(role); }
    catch (error) { alert(error instanceof Error ? error.message : "Could not sign in with Google"); setGoogleLoading(false); }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return alert("Please enter your email");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Sign in failed"); return; }
      selectLocalAccount(data.identity.user.email);
      try {
        const isCreator = data.identity.active_roles?.includes("creator");
        localStorage.setItem(
          "flenzr_auth_session",
          JSON.stringify({
            email: data.identity.user.email,
            fullName: data.identity.user.full_name || (isCreator ? "Creator" : "Brand"),
            handle: "",
            role: isCreator ? "creator" : "brand",
          })
        );
      } catch {}
      const next = new URLSearchParams(window.location.search).get("next") || "";
      const notificationLink = /^\/dashboard\/(?:notifications|(?:enquiries|offers)\/[0-9a-f-]{36}|collaborations\/[0-9a-f-]{36}(?:\?view=(?:proposal|deliveries|proof|activity))?)$/i.test(next);
      window.location.assign(notificationLink ? next : data.redirect);
    } catch { alert("Could not sign in. Please try again."); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[color:var(--ui-paint-09090b)] text-[color:var(--ui-ink-neutral-100)] selection:bg-[color:var(--ui-paint-c1121f)] selection:text-[color:var(--ui-ink-ffffff)] flex flex-col font-sans">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[color:var(--ui-paint-c1121f)]/15 via-transparent to-transparent blur-3xl opacity-75" />
      </div>

      {/* Top Header */}
      <header className="relative border-b border-[color:var(--ui-line-neutral-800)] bg-[color:var(--ui-paint-09090b)]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={profileHref}
            title={session ? (session.role === "brand" ? "Brand Portal" : "Creator Studio & Profile") : "Flenzr Home"}
            className="flex items-center shrink-0"
          >
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher /><LanguageSwitcher variant="compact" />
            <div className="text-xs text-[color:var(--ui-ink-neutral-400)] font-medium flex items-center gap-2">
              <Link
                href="/signup/creator"
                className="text-[color:var(--ui-ink-c1121f)] font-bold hover:underline"
              >
                {t("Join as Influencer")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-[color:var(--ui-paint-121215)] border border-[color:var(--ui-line-neutral-800)] rounded-3xl p-6 sm:p-9 shadow-2xl text-left">
          {/* Role Toggle */}
          <div className="flex p-1 bg-[color:var(--ui-paint-neutral-900)] border border-[color:var(--ui-line-neutral-800)] rounded-2xl mb-7">
            <button
              type="button"
              onClick={() => setRole("creator")}
              className={`flex-1 h-9 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer ${
                role === "creator"
                  ? "bg-[color:var(--ui-paint-neutral-800)] text-[color:var(--ui-ink-ffffff)] shadow-xs border border-[color:var(--ui-line-neutral-700)]"
                  : "text-[color:var(--ui-ink-neutral-400)] hover:text-[color:var(--ui-ink-ffffff)]"
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Creator / Influencer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("brand")}
              className={`flex-1 h-9 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer ${
                role === "brand"
                  ? "bg-[color:var(--ui-paint-neutral-800)] text-[color:var(--ui-ink-ffffff)] shadow-xs border border-[color:var(--ui-line-neutral-700)]"
                  : "text-[color:var(--ui-ink-neutral-400)] hover:text-[color:var(--ui-ink-ffffff)]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Brand / Sponsor</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[color:var(--ui-ink-ffffff)] tracking-tight">
              {t("Welcome back")}.
            </h1>
            <p className="text-xs sm:text-sm text-[color:var(--ui-ink-neutral-400)] mt-1">
              {role === "creator"
                ? "Log in to manage your ₹ rate cards, bio link, and active brand deals."
                : "Log in to discover influencers, negotiate rate cards, and secure Vault payouts."}
            </p>
          </div>

          <AuthErrorNotice />
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 px-4 rounded-2xl border border-[color:var(--ui-line-neutral-700)] hover:border-[color:var(--ui-line-neutral-500)] bg-[color:var(--ui-paint-neutral-900)] hover:bg-[color:var(--ui-paint-neutral-800)] font-bold text-xs sm:text-sm text-[color:var(--ui-ink-ffffff)] transition-all inline-flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50 leading-none"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>
              {googleLoading ? "Signing in..." : t("Continue with Google")}
            </span>
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[color:var(--ui-line-neutral-800)]" />
            </div>
            <span className="relative px-3 bg-[color:var(--ui-paint-121215)] text-[11px] font-semibold text-[color:var(--ui-ink-neutral-400)] uppercase tracking-wider">
              Or with email
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-neutral-300)]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl bg-[color:var(--ui-paint-neutral-950)] border border-[color:var(--ui-line-neutral-800)] text-[color:var(--ui-ink-ffffff)] px-4 py-3 text-sm font-semibold outline-hidden focus:border-[color:var(--ui-line-c1121f)] transition-colors placeholder:text-[color:var(--ui-ink-neutral-600)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[color:var(--ui-ink-neutral-300)]">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("A password reset link has been dispatched to your email address.");
                  }}
                  className="text-[11px] text-[color:var(--ui-ink-c1121f)] font-semibold hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl bg-[color:var(--ui-paint-neutral-950)] border border-[color:var(--ui-line-neutral-800)] text-[color:var(--ui-ink-ffffff)] px-4 py-3 text-sm font-semibold outline-hidden focus:border-[color:var(--ui-line-c1121f)] transition-colors placeholder:text-[color:var(--ui-ink-neutral-600)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="theme-on-accent w-full h-12 rounded-full bg-[color:var(--ui-paint-c1121f)] hover:bg-[color:var(--ui-paint-a50e1a)] text-[color:var(--ui-ink-ffffff)] font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.01] inline-flex items-center justify-center gap-2 cursor-pointer mt-2 leading-none"
            >
              <span>{isLoading ? "Signing In..." : t("Sign In")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[color:var(--ui-line-neutral-800)] flex items-center justify-between text-xs text-[color:var(--ui-ink-neutral-400)]">
            <span>{t("Don't have an account?")}</span>
            <Link
              href={role === "creator" ? "/signup/creator" : "/dashboard/brand"}
              className="font-bold text-[color:var(--ui-ink-c1121f)] hover:underline"
            >
              {role === "creator" ? t("Join as Influencer") : "Register Brand"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
