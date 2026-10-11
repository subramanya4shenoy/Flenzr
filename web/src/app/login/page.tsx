"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Check, Sparkles, Shield, User, Building2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"creator" | "brand">("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Simulate instantaneous Google OAuth token exchange
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "flenzr_auth_session",
          JSON.stringify({
            provider: "google",
            email: role === "creator" ? "subu@flenzr.com" : "brand@sponsor.io",
            fullName: role === "creator" ? "Subramanya Shenoy" : "Lumina Global",
            role,
          })
        );
      }
      setGoogleLoading(false);
      router.push(role === "creator" ? "/dashboard/creator" : "/dashboard/brand");
    }, 700);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return alert("Please enter your email");
    setIsLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "flenzr_auth_session",
          JSON.stringify({
            provider: "email",
            email,
            role,
          })
        );
      }
      setIsLoading(false);
      router.push(role === "creator" ? "/dashboard/creator" : "/dashboard/brand");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-[#c1121f] selection:text-white flex flex-col font-sans">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#c1121f]/8 via-transparent to-transparent blur-3xl opacity-75" />
      </div>

      {/* Top Header */}
      <header className="relative border-b border-neutral-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size={32} variant="duotone" withWordmark={true} />
          </Link>
          <div className="text-xs text-neutral-500 font-medium flex items-center gap-2">
            <span>New to Flenzr?</span>
            <Link
              href="/signup/creator"
              className="text-[#c1121f] font-bold hover:underline"
            >
              Sign Up as Creator
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-9 shadow-xl shadow-black/5 text-left">
          {/* Role Toggle */}
          <div className="flex p-1 bg-neutral-100 rounded-2xl mb-7">
            <button
              type="button"
              onClick={() => setRole("creator")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "creator"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Creator / Influencer</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("brand")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === "brand"
                  ? "bg-white text-black shadow-xs"
                  : "text-neutral-500 hover:text-black"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Brand / Sponsor</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Welcome back.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 mt-1">
              {role === "creator"
                ? "Log in to manage your ₹ rate cards, bio link, and active brand deals."
                : "Log in to discover influencers, negotiate rate cards, and escrow payouts."}
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3 px-4 rounded-2xl border-2 border-neutral-200 hover:border-black bg-white hover:bg-neutral-50 font-bold text-xs sm:text-sm text-neutral-800 transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>
              {googleLoading ? "Signing in with Google..." : "Continue with Google"}
            </span>
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Or with email
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold outline-hidden focus:border-black transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("A password reset link has been dispatched to your email address.");
                  }}
                  className="text-[11px] text-[#c1121f] font-semibold hover:underline"
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
                className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold outline-hidden focus:border-black transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? "Signing In..." : "Sign In to Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Don&apos;t have an account?</span>
            <Link
              href={role === "creator" ? "/signup/creator" : "/dashboard/brand"}
              className="font-bold text-[#c1121f] hover:underline"
            >
              {role === "creator" ? "Join as Influencer" : "Register Brand"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
