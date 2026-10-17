"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Check, Sparkles, Shield, User, Building2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { getCreatorByEmail } from "@/lib/api";

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

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("flenzr_auth_session");
    if (raw) {
      try {
        const session = JSON.parse(raw);
        if (session && (session.email || session.handle)) {
          router.replace(session.role === "brand" ? "/dashboard/brand" : "/dashboard/creator");
        }
      } catch {}
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const targetEmail = role === "creator" ? "subu@flenzr.com" : "brand@sponsor.io";
    const defaultName = role === "creator" ? "Subramanya Shenoy" : "Lumina Global";

    if (typeof window !== "undefined") {
      let handle = role === "creator" ? "subu_creates" : "luminaglobal";
      try {
        if (role === "creator") {
          const liveCreator = await getCreatorByEmail(targetEmail);
          if (liveCreator) {
            handle = liveCreator.handle;
            localStorage.setItem(
              "flenzr_creator_profile",
              JSON.stringify({
                fullName: liveCreator.display_name,
                handle: liveCreator.handle,
                niche: liveCreator.niche,
                email: targetEmail,
                instagramHandle: liveCreator.instagram_handle,
                isInstagramBioVerified: liveCreator.instagram_verified,
                youtubeChannel: liveCreator.youtube_channel,
                isYoutubeBioVerified: liveCreator.youtube_verified,
              })
            );
          }
        }
      } catch (err) {
        console.warn("Could not fetch creator profile on login", err);
      }

      localStorage.setItem(
        "flenzr_auth_session",
        JSON.stringify({
          provider: "google",
          email: targetEmail,
          fullName: defaultName,
          handle,
          role,
        })
      );
    }

    setGoogleLoading(false);
    router.push(role === "creator" ? "/dashboard/creator" : "/dashboard/brand");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return alert("Please enter your email");
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    if (typeof window !== "undefined") {
      let derivedHandle = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
      let derivedName = derivedHandle.charAt(0).toUpperCase() + derivedHandle.slice(1);

      try {
        if (role === "creator") {
          const liveCreator = await getCreatorByEmail(cleanEmail);
          if (liveCreator) {
            derivedHandle = liveCreator.handle;
            derivedName = liveCreator.display_name;
            localStorage.setItem(
              "flenzr_creator_profile",
              JSON.stringify({
                fullName: liveCreator.display_name,
                handle: liveCreator.handle,
                niche: liveCreator.niche,
                email: cleanEmail,
                instagramHandle: liveCreator.instagram_handle,
                isInstagramBioVerified: liveCreator.instagram_verified,
                youtubeChannel: liveCreator.youtube_channel,
                isYoutubeBioVerified: liveCreator.youtube_verified,
              })
            );
          } else {
            localStorage.setItem(
              "flenzr_creator_profile",
              JSON.stringify({
                fullName: derivedName,
                handle: derivedHandle,
                niche: "Content Creator",
                email: cleanEmail,
                instagramHandle: derivedHandle,
                isInstagramBioVerified: false,
                youtubeChannel: null,
                isYoutubeBioVerified: false,
              })
            );
          }
        }
      } catch (err) {
        console.warn("Could not check email profile", err);
      }

      localStorage.setItem(
        "flenzr_auth_session",
        JSON.stringify({
          provider: "email",
          email: cleanEmail,
          fullName: derivedName,
          handle: derivedHandle,
          role,
        })
      );
    }

    setIsLoading(false);
    router.push(role === "creator" ? "/dashboard/creator" : "/dashboard/brand");
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 selection:bg-[#c1121f] selection:text-white flex flex-col font-sans">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-[#c1121f]/15 via-transparent to-transparent blur-3xl opacity-75" />
      </div>

      {/* Top Header */}
      <header className="relative border-b border-neutral-800 bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size={32} variant="duotone-dark" withWordmark={true} />
          </Link>
          <div className="text-xs text-neutral-400 font-medium flex items-center gap-2">
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
        <div className="max-w-md w-full bg-[#121215] border border-neutral-800 rounded-3xl p-6 sm:p-9 shadow-2xl text-left">
          {/* Role Toggle */}
          <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-2xl mb-7">
            <button
              type="button"
              onClick={() => setRole("creator")}
              className={`flex-1 h-9 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 leading-none transition-all cursor-pointer ${
                role === "creator"
                  ? "bg-neutral-800 text-white shadow-xs border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
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
                  ? "bg-neutral-800 text-white shadow-xs border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Brand / Sponsor</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              {role === "creator"
                ? "Log in to manage your ₹ rate cards, bio link, and active brand deals."
                : "Log in to discover influencers, negotiate rate cards, and secure Vault payouts."}
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full h-12 px-4 rounded-2xl border border-neutral-700 hover:border-neutral-500 bg-neutral-900 hover:bg-neutral-800 font-bold text-xs sm:text-sm text-white transition-all inline-flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50 leading-none"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>
              {googleLoading ? "Signing in with Google..." : "Continue with Google"}
            </span>
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <span className="relative px-3 bg-[#121215] text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Or with email
            </span>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 text-white px-4 py-3 text-sm font-semibold outline-hidden focus:border-[#c1121f] transition-colors placeholder:text-neutral-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
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
                className="w-full rounded-2xl bg-neutral-950 border border-neutral-800 text-white px-4 py-3 text-sm font-semibold outline-hidden focus:border-[#c1121f] transition-colors placeholder:text-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white font-bold text-sm shadow-lg shadow-[#c1121f]/25 transition-all hover:scale-[1.01] inline-flex items-center justify-center gap-2 cursor-pointer mt-2 leading-none"
            >
              <span>{isLoading ? "Signing In..." : "Sign In to Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
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
