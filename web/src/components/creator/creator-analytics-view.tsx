"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  Globe,
  Users,
  Award,
  Video,
  Eye,
  CheckCircle2,
  ExternalLink,
  Download,
  Share2,
  Lock,
  AlertCircle,
} from "lucide-react";

export function CreatorAnalyticsView() {
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "all">("30d");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("flenzr_creator_profile");
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  const hasYoutube = Boolean(profile?.youtubeChannel);
  const isYoutubeVerified = Boolean(profile?.isYoutubeBioVerified);
  const hasInstagram = Boolean(profile?.instagramHandle);
  const isInstagramVerified = Boolean(profile?.isInstagramBioVerified);
  const hasAnyConnected = (hasYoutube && isYoutubeVerified) || (hasInstagram && isInstagramVerified);


  return (
    <div className="space-y-6">
      {/* Top Banner with Verification Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasAnyConnected ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`} />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Verified Audience &amp; Performance Metrics
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Performance metrics will appear when connected platform analytics are available.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#18181b] p-1 rounded-xl border border-[#27272a] text-xs">
            {(["30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === r
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-[#8c94a6] hover:text-white"
                }`}
              >
                {r === "30d" ? "Last 30 Days" : r === "90d" ? "Quarterly" : "All Time"}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled title="PDF export is not available yet"
            className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 border border-white/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Cross-Platform Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* YouTube Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold">
                YT
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {hasYoutube ? profile.youtubeChannel : "YouTube Channel"}
                </h4>
                <p className="text-[10px] text-[#7e8697]">
                  {isYoutubeVerified
                    ? "Ownership verified • Analytics unavailable"
                    : hasYoutube
                    ? "Channel Linked • Verification Pending"
                    : "Not Connected • Connect in Profile"}
                </p>
              </div>
            </div>
            {isYoutubeVerified ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Verified ✓
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-neutral-400 font-medium border border-white/10">
                Not Connected
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Median Views</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Avg CTR</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Avg Retention</div>
            </div>
          </div>
        </div>

        {/* Instagram Card */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                IG
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {hasInstagram ? `@${profile.instagramHandle}` : "Instagram Creator"}
                </h4>
                <p className="text-[10px] text-[#7e8697]">
                  {isInstagramVerified
                    ? "Ownership verified • Analytics unavailable"
                    : hasInstagram
                    ? "Handle Linked • Verification Pending"
                    : "Not Connected • Connect in Profile"}
                </p>
              </div>
            </div>
            {isInstagramVerified ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Verified ✓
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-neutral-400 font-medium border border-white/10">
                Not Connected
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Avg Reel Plays</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Engagement Rate</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">{"--"}</div>
              <div className="text-[10px] text-[#8c94a6]">Story Reach</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics: Geography + Age/Gender */}
      <div className="p-8 rounded-2xl bg-[#121215] border border-dashed border-[#27272a] text-center space-y-2">
        <h4 className="text-sm font-semibold text-white">Audience data is not available yet</h4>
        <p className="text-xs text-[#7e8697]">Social ownership verification does not provide audience demographics or performance analytics.</p>
      </div>

      {/* Aspect Score Pillars Breakdown */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Aspect Trust Score Pillars</h4>
            <p className="text-[10px] text-[#8c94a6]">Core trust benchmarks verified for prospective brand sponsors</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-bold border border-white/20">
            {"Not rated yet"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Authenticity</span>
            <div className="text-xl font-bold text-white">{"--"}</div>
            <p className="text-[10px] text-neutral-400 font-semibold">
              {"Authenticity data unavailable"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">On-Time Fulfillment</span>
            <div className="text-xl font-bold text-white">--</div>
            <p className="text-[10px] text-neutral-400">Unlocks after 1st completed deal</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Brand Retention</span>
            <div className="text-xl font-bold text-white">--</div>
            <p className="text-[10px] text-neutral-400">Unlocks after repeat sponsor</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Commercial CTR</span>
            <div className="text-xl font-bold text-white">--</div>
            <p className="text-[10px] text-neutral-400">Tracks via Smart Links</p>
          </div>
        </div>
      </div>
    </div>
  );
}
