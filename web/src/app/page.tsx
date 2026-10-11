import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { HeroMotionDeck } from "@/components/home/hero-motion-deck";
import { CollabShowcaseMotion } from "@/components/home/collab-showcase-motion";
import { SpotlightBannerMotion } from "@/components/home/spotlight-banner-motion";
import { CreatorCloudMotion } from "@/components/home/creator-cloud-motion";
import { WorkflowStoryMotion } from "@/components/home/workflow-story-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-[#c1121f] selection:text-white flex flex-col">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#c1121f]/8 via-[#c1121f]/2 to-transparent blur-3xl opacity-75" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-[#c1121f]/4 blur-3xl rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="relative border-b border-neutral-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center shrink-0 z-10">
            <Logo size={32} variant="duotone" withWordmark={true} />
          </Link>

          {/* Center: Mathematically Centered Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium absolute left-1/2 -translate-x-1/2">
            <Link
              href="#how-it-works"
              className="text-neutral-700 hover:text-black transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#collab-engine"
              className="text-neutral-700 hover:text-black transition-colors"
            >
              Collab Engine
            </Link>
            <Link
              href="#creators"
              className="text-neutral-700 hover:text-black transition-colors"
            >
              Creator Marketplace
            </Link>
            <Link
              href="/sarahmiller"
              className="text-neutral-700 hover:text-black transition-colors inline-flex items-center gap-1.5"
            >
              <span>Demo Rate Card</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#c1121f]/10 text-[#c1121f] leading-none inline-flex items-center">
                EARN ₹
              </span>
            </Link>
          </nav>

          {/* Right: Auth Action Buttons */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold shrink-0 z-10">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-full text-neutral-800 hover:text-black hover:bg-neutral-100 transition-colors inline-flex items-center leading-none"
            >
              Sign In
            </Link>
            <Link
              href="/signup/creator"
              className="px-4 py-2 rounded-full bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-all shadow-sm inline-flex items-center gap-1.5 leading-none"
            >
              <span>Join as Influencer</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {/* 1. Hero Section: Minimal Title + Spring Fan-out Cards Deck */}
        <HeroMotionDeck />

        {/* 2. Interactive Collab Showcase Stack Section (Pinterest 00:04) */}
        <div id="collab-engine">
          <CollabShowcaseMotion />
        </div>

        {/* 3. Cinematic Spotlight Creator Banner & Brand Marquee (Pinterest 00:07) */}
        <SpotlightBannerMotion />

        {/* 4. "You will find your audience among us" Creator Cloud (Pinterest 00:21) */}
        <div id="creators">
          <CreatorCloudMotion />
        </div>

        {/* 5. "Every piece of content tells a story" 3-Card Story Bento (Pinterest 00:24) */}
        <div id="how-it-works">
          <WorkflowStoryMotion />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-neutral-200 bg-neutral-50 mt-auto text-xs text-neutral-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 space-y-4">
              <Logo size={32} variant="duotone" withWordmark={true} />
              <p className="text-neutral-500 text-xs max-w-sm leading-relaxed">
                Flenzr is the marketplace where creators monetize their audience with upfront rate cards and brands scale high-converting sponsorship campaigns.
              </p>
            </div>

            <div className="space-y-3">
              <div className="font-bold text-black uppercase tracking-wider text-[11px]">
                For Influencers
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/signup/creator" className="hover:text-black transition-colors">
                    Register &amp; Start Earning
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/creator" className="hover:text-black transition-colors">
                    Creator Earnings &amp; Payouts
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/creator" className="hover:text-black transition-colors">
                    Standard Rate Cards (₹)
                  </Link>
                </li>
                <li>
                  <Link href="/sarahmiller" className="hover:text-black transition-colors">
                    Demo Rate Card Profile
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="font-bold text-black uppercase tracking-wider text-[11px]">
                For Brands
              </div>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard/brand" className="hover:text-black transition-colors">
                    Brand Portal
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/brand" className="hover:text-black transition-colors">
                    Hire Top Creators
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/brand" className="hover:text-black transition-colors">
                    Draft Review &amp; Revisions
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/brand" className="hover:text-black transition-colors">
                    Escrow Payments in ₹
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
            <div>
              © 2026 Flenzr Inc. The marketplace for influencers and brands.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/sarahmiller" className="hover:text-black transition-colors">
                Sample Rate Card Profile
              </Link>
              <span>•</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#c1121f] transition-colors"
              >
                Developer API
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
