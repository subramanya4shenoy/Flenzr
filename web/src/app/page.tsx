import Link from "next/link";
import {
  Sparkles,
  Link2,
  QrCode,
  DollarSign,
  Smartphone,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#fdf0d5] selection:bg-[#c1121f] selection:text-[#fdf0d5]">
      {/* Background Decorative Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-[#c1121f]/20 via-[#c1121f]/5 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#c1121f]/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="relative border-b border-[#222222] bg-[#050505]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={34} variant="duotone" withWordmark={true} />
          </Link>

          <nav className="flex items-center gap-4 text-xs sm:text-sm font-medium">
            <Link
              href="/dashboard/creator"
              className="text-[#fdf0d5]/80 hover:text-[#fdf0d5] hover:underline underline-offset-4 transition-colors"
            >
              Creator Studio
            </Link>
            <Link
              href="/dashboard/brand"
              className="text-[#fdf0d5]/80 hover:text-[#fdf0d5] hover:underline underline-offset-4 transition-colors"
            >
              Brand Portal
            </Link>
            <Link
              href="/sarahmiller"
              className="text-[#fdf0d5]/60 hover:text-[#fdf0d5] transition-colors hidden sm:inline"
            >
              Media Kit Demo
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#2b2b2b] text-[#fdf0d5] hover:border-[#c1121f] transition-colors flex items-center gap-1.5"
            >
              <span>Swagger</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c1121f] animate-pulse" />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#c1121f]/10 text-[#fdf0d5] border border-[#c1121f]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#c1121f]" />
            <span>Modern Native Architecture • Python FastAPI + Next.js</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#fdf0d5] leading-tight">
            The Marketplace for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c1121f] via-[#e63946] to-[#fdf0d5]">
              Creators & Brands
            </span>
          </h1>

          <p className="text-[#fdf0d5]/75 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Unified across Web, Native iOS, and Native Android. Manage verified rate cards, 
            attribute link clicks, generate branded QR codes, and orchestrate campaign milestones 
            with escrow security.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard/creator"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-[#c1121f] hover:bg-[#a50e1a] text-[#fdf0d5] transition-all shadow-lg shadow-[#c1121f]/25 flex items-center gap-2 group cursor-pointer"
            >
              <span>Open Creator Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/dashboard/brand"
              className="px-6 py-3 rounded-xl font-bold text-sm bg-[#121212] hover:bg-[#1a1a1a] text-[#fdf0d5] border border-[#2b2b2b] hover:border-[#fdf0d5]/40 transition-colors cursor-pointer"
            >
              Open Brand Portal
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-[#c1121f]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#c1121f]/10 border border-[#c1121f]/30 flex items-center justify-center text-[#c1121f]">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#fdf0d5]">Dynamic Rate Cards</h3>
            <p className="text-sm text-[#fdf0d5]/70 leading-relaxed">
              Define pricing packages for YouTube dedicated reviews, Instagram Reels, and podcasts 
              with clear turnaround days and transparent pricing.
            </p>
          </div>

          <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-[#c1121f]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#c1121f]/10 border border-[#c1121f]/30 flex items-center justify-center text-[#c1121f]">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#fdf0d5]">Smart Tracked Links</h3>
            <p className="text-sm text-[#fdf0d5]/70 leading-relaxed">
              Auto-append UTM campaign metadata and track high-throughput click analytics 
              via fast 307 temporary redirects.
            </p>
          </div>

          <div className="bg-[#0e0e0e] border border-[#222222] rounded-2xl p-6 backdrop-blur-sm space-y-3 hover:border-[#c1121f]/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#c1121f]/10 border border-[#c1121f]/30 flex items-center justify-center text-[#c1121f]">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#fdf0d5]">Dynamic QR Code Engine</h3>
            <p className="text-sm text-[#fdf0d5]/70 leading-relaxed">
              Generate custom-styled, vector-sharp QR codes to embed in offline collateral, 
              video end screens, or live event media kits.
            </p>
          </div>
        </section>

        {/* Multi-Platform Architecture Breakdown */}
        <section className="mt-20 bg-[#0e0e0e] border border-[#222222] rounded-3xl p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#222222]">
            <div>
              <h2 className="text-2xl font-bold text-[#fdf0d5]">Multi-Client Architecture</h2>
              <p className="text-sm text-[#fdf0d5]/70 mt-1">
                A single source of business logic serving all clients via strongly-typed OpenAPI contracts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#c1121f]/10 text-[#fdf0d5] border border-[#c1121f]/30">
                100% Contract Validated
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#fdf0d5] font-semibold">
                <Layers className="w-4 h-4 text-[#c1121f]" />
                <span>Backend Core</span>
              </div>
              <p className="text-[#fdf0d5]/65">
                Python 3.14, FastAPI, SQLAlchemy 2.0 Async, Alembic, Supabase PostgreSQL & Auth.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#fdf0d5] font-semibold">
                <Smartphone className="w-4 h-4 text-[#c1121f]" />
                <span>Native iOS</span>
              </div>
              <p className="text-[#fdf0d5]/65">
                Swift 6, SwiftUI, Swift Concurrency, MVVM, Keychain storage, separate Creator & Brand targets.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#fdf0d5] font-semibold">
                <Smartphone className="w-4 h-4 text-[#c1121f]" />
                <span>Native Android</span>
              </div>
              <p className="text-[#fdf0d5]/65">
                Kotlin, Jetpack Compose, Coroutines & Flow, Hilt, Room, separate Creator & Brand modules.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#fdf0d5] font-semibold">
                <TrendingUp className="w-4 h-4 text-[#c1121f]" />
                <span>Web Platform</span>
              </div>
              <p className="text-[#fdf0d5]/65">
                Next.js 16 App Router, React 19, Tailwind CSS, TanStack Query, SSR Public Creator Pages.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
