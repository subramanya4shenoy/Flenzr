import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { HeroMotionDeck } from "@/components/home/hero-motion-deck";
import { CollabShowcaseMotion } from "@/components/home/collab-showcase-motion";
import { SpotlightBannerMotion } from "@/components/home/spotlight-banner-motion";
import { CreatorCloudMotion } from "@/components/home/creator-cloud-motion";
import { WorkflowStoryMotion } from "@/components/home/workflow-story-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 selection:bg-[#c1121f] selection:text-white flex flex-col">
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#c1121f]/20 via-[#c1121f]/5 to-transparent blur-3xl opacity-75" />
        <div className="absolute top-1/2 right-0 w-[550px] h-[550px] bg-[#c1121f]/8 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-red-950/20 blur-3xl rounded-full" />
      </div>

      {/* Localized Navigation Header with Language Switcher */}
      <HomeHeader />

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

      {/* Localized Footer with Language Switcher */}
      <HomeFooter />
    </div>
  );
}
