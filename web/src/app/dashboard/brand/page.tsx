"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Search,
  Plus,
  Filter,
  DollarSign,
  Users,
  Star,
  Tag,
  MapPin,
  ExternalLink,
  Send,
  CheckCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

interface CreatorCard {
  id: string;
  handle: string;
  display_name: string;
  niche: string;
  rating: number;
  location: string;
  starting_rate: number;
  bio: string;
  verified: boolean;
}

interface CampaignItem {
  id: string;
  title: string;
  target_niche: string;
  budget_dollars: number;
  status: "active" | "draft" | "completed";
  deliverables: string;
  applicants_count: number;
}

export default function BrandDashboardPage() {
  const [activeTab, setActiveTab] = useState<"discovery" | "campaigns" | "applications">("discovery");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("All");

  // Mock creators from discovery database
  const [creators] = useState<CreatorCard[]>([
    {
      id: "c-1",
      handle: "sarahmiller",
      display_name: "Sarah Miller",
      niche: "Technology & Gear",
      rating: 5.0,
      location: "San Francisco, CA",
      starting_rate: 1200,
      bio: "Tech reviewer, consumer audio enthusiast, and 4K workflow specialist.",
      verified: true,
    },
    {
      id: "c-2",
      handle: "davidchen",
      display_name: "David Chen",
      niche: "Software & Productivity",
      rating: 4.9,
      location: "Seattle, WA",
      starting_rate: 1800,
      bio: "Developer advocate and SaaS reviewer covering modern engineering stacks.",
      verified: true,
    },
    {
      id: "c-3",
      handle: "elena_fit",
      display_name: "Elena Rostova",
      niche: "Health & Nutrition",
      rating: 4.8,
      location: "Austin, TX",
      starting_rate: 950,
      bio: "Certified nutritionist creating evidence-based supplement reviews.",
      verified: true,
    },
    {
      id: "c-4",
      handle: "marcus_travels",
      display_name: "Marcus Cole",
      niche: "Travel & Lifestyle",
      rating: 4.9,
      location: "New York, NY",
      starting_rate: 2200,
      bio: "Cinematic travel filmmaker partnering with premium hospitality brands.",
      verified: false,
    },
  ]);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: "camp-1",
      title: "Lumina Horizon Noise-Canceling Headphone Launch",
      target_niche: "Technology & Gear",
      budget_dollars: 15000,
      status: "active",
      deliverables: "1x Dedicated 8-10 min YouTube review with unboxing & sound test",
      applicants_count: 6,
    },
    {
      id: "camp-2",
      title: "Lumina Studio USB-C Audio Interface",
      target_niche: "Software & Productivity",
      budget_dollars: 8500,
      status: "active",
      deliverables: "60-second Instagram Reel + Story Link",
      applicants_count: 4,
    },
  ]);

  // Campaign Creation Modal
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampTitle, setNewCampTitle] = useState("");
  const [newCampNiche, setNewCampNiche] = useState("Technology & Gear");
  const [newCampBudget, setNewCampBudget] = useState("10000");
  const [newCampDeliverables, setNewCampDeliverables] = useState("");
  const [newCampBrief, setNewCampBrief] = useState("");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampTitle) return;
    const item: CampaignItem = {
      id: `camp-${Date.now()}`,
      title: newCampTitle,
      target_niche: newCampNiche,
      budget_dollars: Number(newCampBudget) || 5000,
      status: "active",
      deliverables: newCampDeliverables || "1x Dedicated Video",
      applicants_count: 0,
    };
    setCampaigns([item, ...campaigns]);
    setNewCampTitle("");
    setNewCampDeliverables("");
    setNewCampBrief("");
    setShowNewCampaign(false);
  };

  const filteredCreators = creators.filter((c) => {
    const matchesQuery =
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNiche = selectedNiche === "All" || c.niche.includes(selectedNiche);
    return matchesQuery && matchesNiche;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={30} variant="duotone" withWordmark={true} />
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#171717] text-[#fdf0d5]/80 font-semibold border border-[#2b2b2b]">
              Brand Portal • Lumina Audio
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <button
              onClick={() => setShowNewCampaign(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Campaign</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Brand Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Active Campaigns</span>
              <Briefcase className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">{campaigns.length}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Allocated Budget</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              ${campaigns.reduce((a, c) => a + c.budget_dollars, 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Total Creator Applicants</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {campaigns.reduce((a, c) => a + c.applicants_count, 0)}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("discovery")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "discovery"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Creator Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "campaigns"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Campaigns ({campaigns.length})</span>
          </button>
        </div>

        {/* TAB 1: CREATOR DISCOVERY */}
        {activeTab === "discovery" && (
          <section className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search creators by name, handle, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                {["All", "Technology", "Software", "Health", "Travel"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedNiche(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedNiche === n
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Creator Directory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5">
                          <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-bold text-emerald-400">
                            {creator.display_name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-base">{creator.display_name}</h3>
                            {creator.verified && (
                              <CheckCircle className="w-4 h-4 fill-emerald-500 text-slate-950" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400">@{creator.handle}</p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                        <Star className="w-3.5 h-3.5 fill-amber-300" />
                        {creator.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{creator.bio}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        {creator.niche}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        {creator.location}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Packages from</span>
                      <span className="text-base font-extrabold text-white">
                        ${creator.starting_rate.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${creator.handle}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1"
                      >
                        <span>Media Kit</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => alert(`Invite sent to @${creator.handle}!`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Invite</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 2: CAMPAIGN MANAGER */}
        {activeTab === "campaigns" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {camp.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{camp.target_niche}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{camp.title}</h3>
                    <p className="text-xs text-slate-300">{camp.deliverables}</p>
                  </div>

                  <div className="flex items-center gap-8 text-center sm:text-right">
                    <div>
                      <span className="text-xs text-slate-500 block">Budget</span>
                      <span className="text-lg font-black text-white">
                        ${camp.budget_dollars.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">Applicants</span>
                      <span className="text-lg font-black text-emerald-400">
                        {camp.applicants_count}
                      </span>
                    </div>

                    <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
                      Review Offers
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New Campaign Modal */}
        {showNewCampaign && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCampaign}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white">Launch New Campaign Brief</h3>
              <p className="text-xs text-slate-400">
                Creators in the discovery directory can browse and submit applications.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Campaign Title</label>
                  <input
                    type="text"
                    value={newCampTitle}
                    onChange={(e) => setNewCampTitle(e.target.value)}
                    placeholder="e.g. Q4 Wireless Headphone Launch"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Target Niche</label>
                    <select
                      value={newCampNiche}
                      onChange={(e) => setNewCampNiche(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                    >
                      <option>Technology & Gear</option>
                      <option>Software & Productivity</option>
                      <option>Health & Nutrition</option>
                      <option>Travel & Lifestyle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Total Budget (USD)</label>
                    <input
                      type="number"
                      value={newCampBudget}
                      onChange={(e) => setNewCampBudget(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                      placeholder="10000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Deliverable Requirements</label>
                  <input
                    type="text"
                    value={newCampDeliverables}
                    onChange={(e) => setNewCampDeliverables(e.target.value)}
                    placeholder="e.g. 1x Dedicated 8-10 min YouTube review + Instagram Reel"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Brief Description</label>
                  <textarea
                    rows={3}
                    value={newCampBrief}
                    onChange={(e) => setNewCampBrief(e.target.value)}
                    placeholder="Describe the product, key talking points, and guidelines..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCampaign(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  Publish Campaign
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
