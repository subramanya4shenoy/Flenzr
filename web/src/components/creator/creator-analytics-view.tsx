"use client";

import { useState } from "react";
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
} from "lucide-react";

export function CreatorAnalyticsView() {
  const [timeRange, setTimeRange] = useState<"30d" | "90d" | "all">("30d");

  const GEOS = [
    { country: "India", percentage: 74, color: "bg-white" },
    { country: "United States", percentage: 12, color: "bg-neutral-300" },
    { country: "United Arab Emirates", percentage: 6, color: "bg-neutral-400" },
    { country: "United Kingdom", percentage: 4, color: "bg-neutral-500" },
    { country: "Others", percentage: 4, color: "bg-neutral-600" },
  ];

  const AGE_GROUPS = [
    { label: "18 - 24", percentage: 42 },
    { label: "25 - 34", percentage: 46 },
    { label: "35 - 44", percentage: 9 },
    { label: "45+", percentage: 3 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Verification Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121215] border border-[#27272a] shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Verified Audience &amp; Performance Metrics
            </h2>
          </div>
          <p className="text-xs text-[#8c94a6] mt-0.5">
            Cryptographically authenticated via YouTube Data API &amp; Instagram Graph API. No self-reported screenshots.
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
            onClick={() => alert("Generating verified PDF media kit...")}
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
                <h4 className="text-xs font-bold text-white">YouTube Tech Channel</h4>
                <p className="text-[10px] text-[#7e8697]">API Authenticated • 420K Subscribers</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              Verified ✓
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">850K</div>
              <div className="text-[10px] text-[#8c94a6]">Median Views</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">5.2%</div>
              <div className="text-[10px] text-[#8c94a6]">Avg CTR</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">6:42m</div>
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
                <h4 className="text-xs font-bold text-white">Instagram Creator</h4>
                <p className="text-[10px] text-[#7e8697]">Meta Graph API • 184K Followers</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              Verified ✓
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">120K</div>
              <div className="text-[10px] text-[#8c94a6]">Avg Reel Plays</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">4.8%</div>
              <div className="text-[10px] text-[#8c94a6]">Engagement Rate</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#18181b]">
              <div className="text-lg font-bold text-white">18.4K</div>
              <div className="text-[10px] text-[#8c94a6]">Story Reach</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demographics: Geography + Age/Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Geographic Distribution */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-neutral-300" />
              <span>Audience Geographies</span>
            </h4>
            <span className="text-[10px] text-[#8c94a6]">Top 5 Regions</span>
          </div>

          <div className="space-y-3 pt-1">
            {GEOS.map((g) => (
              <div key={g.country} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#a1a1aa] font-medium">{g.country}</span>
                  <span className="text-white font-bold">{g.percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden">
                  <div
                    className={`h-full ${g.color} rounded-full transition-all duration-500`}
                    style={{ width: `${g.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Age & Gender Breakdown */}
        <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-neutral-300" />
              <span>Age &amp; Gender Demographics</span>
            </h4>
            <span className="text-[10px] text-white font-bold bg-white/10 px-2 py-0.5 rounded border border-white/20">
              78% Male • 22% Female
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {AGE_GROUPS.map((a) => (
              <div key={a.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#a1a1aa] font-medium">{a.label} years</span>
                  <span className="text-white font-bold">{a.percentage}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#18181b] overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${a.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Aspect Score Pillars Breakdown */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Aspect Trust Score Pillars (86/100)</h4>
            <p className="text-[10px] text-[#8c94a6]">Why top hardware brands book collaborations with you</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-bold border border-white/20">
            Top 1% Creator
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Authenticity</span>
            <div className="text-xl font-bold text-white">92 / 100</div>
            <p className="text-[10px] text-emerald-400 font-semibold">&lt; 1.8% Bot followers detected</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">On-Time Fulfillment</span>
            <div className="text-xl font-bold text-white">87%</div>
            <p className="text-[10px] text-neutral-300">Avg. 5.4 days turnaround</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Brand Retention</span>
            <div className="text-xl font-bold text-white">91%</div>
            <p className="text-[10px] text-neutral-300">Repeat sponsor re-booking rate</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1">
            <span className="text-[10px] text-[#8c94a6] uppercase font-bold">Commercial CTR</span>
            <div className="text-xl font-bold text-white">4.8%</div>
            <p className="text-[10px] text-emerald-400 font-semibold">2.5x Category Average</p>
          </div>
        </div>
      </div>
    </div>
  );
}
