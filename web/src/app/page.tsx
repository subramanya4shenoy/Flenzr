import Link from "next/link";
import {
  Sparkles,
  Link2,
  QrCode,
  DollarSign,
  ShieldCheck,
  Smartphone,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-emerald-600/15 via-teal-700/10 to-transparent blur-3xl opacity-75" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-emerald-900/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="relative border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-emerald-500/20">
              F
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              FLENZR
            </span>
          </div>

          <nav className="flex items-center gap-4 text-xs sm:text-sm font-medium">
            <Link
              href="/sarahmiller"
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              Public Profile Demo
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>FastAPI Docs</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Modern Native Architecture • Python FastAPI + Next.js</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            The Marketplace for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
              Creators & Brands
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Unified across Web, Native iOS, and Native Android. Manage verified rate cards, 
            attribute link clicks, generate branded QR codes, and orchestrate campaign milestones 
            with escrow security.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/sarahmiller"
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 group"
            >
              <span>Explore Public Creator Profile</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
            >
              View OpenAPI 3.1 Swagger
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Dynamic Rate Cards</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Define pricing packages for YouTube dedicated reviews, Instagram Reels, and podcasts 
              with clear turnaround days and transparent pricing.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Tracked Links</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Auto-append UTM campaign metadata and track high-throughput click analytics 
              via fast 307 temporary redirects.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Dynamic QR Code Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate custom-styled, vector-sharp QR codes to embed in offline collateral, 
              video end screens, or live event media kits.
            </p>
          </div>
        </section>

        {/* Multi-Platform Architecture Breakdown */}
        <section className="mt-20 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-white">Multi-Client Architecture</h2>
              <p className="text-sm text-slate-400 mt-1">
                A single source of business logic serving all clients via strongly-typed OpenAPI contracts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Contract Validated
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Backend Core</span>
              </div>
              <p className="text-slate-400">
                Python 3.14, FastAPI, SQLAlchemy 2.0 Async, Alembic, Supabase PostgreSQL & Auth.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Native iOS</span>
              </div>
              <p className="text-slate-400">
                Swift 6, SwiftUI, Swift Concurrency, MVVM, Keychain storage, separate Creator & Brand targets.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Native Android</span>
              </div>
              <p className="text-slate-400">
                Kotlin, Jetpack Compose, Coroutines & Flow, Hilt, Room, separate Creator & Brand modules.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Web Platform</span>
              </div>
              <p className="text-slate-400">
                Next.js 16 App Router, React 19, Tailwind CSS, TanStack Query, SSR Public Creator Pages.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
