"use client";

import { useState, useEffect } from "react";
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
import { searchCreators } from "@/lib/api";


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

  const [creators, setCreators] = useState<CreatorCard[]>([
    {
      id: "c-subu",
      handle: "subu_creates",
      display_name: "Subramanya Shenoy",
      niche: "Technology & Hardware",
      rating: 5.0,
      location: "Bengaluru, Karnataka",
      starting_rate: 10000,
      bio: "Tech reviewer, consumer hardware specialist, and verified Flenzr creator.",
      verified: true,
    },
    {
      id: "c-rohan",
      handle: "rohansharma_live",
      display_name: "Rohan Sharma",
      niche: "Software & Productivity",
      rating: 4.9,
      location: "Hyderabad, Telangana",
      starting_rate: 35000,
      bio: "Developer educator and SaaS reviewer covering modern engineering stacks.",
      verified: true,
    },
    {
      id: "c-sarah",
      handle: "sarahmiller",
      display_name: "Sarah Miller",
      niche: "Technology & Gear",
      rating: 5.0,
      location: "Bengaluru, Karnataka",
      starting_rate: 25000,
      bio: "Tech reviewer, consumer audio enthusiast, and 4K workflow specialist.",
      verified: true,
    },
  ]);

  useEffect(() => {
    searchCreators().then((live) => {
      if (Array.isArray(live) && live.length > 0) {
        setCreators(
          live.map((c, idx) => ({
            id: `c-live-${idx}`,
            handle: c.handle,
            display_name: c.display_name,
            niche: c.niche || "Content Creator",
            rating: c.rating || 5.0,
            location: c.location || "India",
            starting_rate: 15000,
            bio: c.bio || "Verified influencer on Flenzr.",
            verified: c.is_verified,
          }))
        );
      }
    }).catch(() => {});
  }, []);


  // Campaigns state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: "camp-1",
      title: "Noise-Canceling Wireless Earbuds Festival Launch",
      target_niche: "Technology & Gear",
      budget_dollars: 250000,
      status: "active",
      deliverables: "1x Dedicated 8-10 min YouTube review with unboxing & audio test",
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
    <div className="min-h-screen bg-[#09090b] text-neutral-100 selection:bg-[#c1121f] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-[#09090b]/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={30} variant="duotone-dark" withWordmark={true} />
            </Link>
            <span className="h-6 px-3 rounded-full bg-neutral-900 text-neutral-200 font-semibold border border-neutral-800 text-xs inline-flex items-center justify-center leading-none">
              Brand Portal • Lumina Audio
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <button
              onClick={() => setShowNewCampaign(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#c1121f]/25 leading-none"
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
          <div className="bg-[#121215] border border-neutral-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Active Campaigns</span>
              <Briefcase className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-white">{campaigns.length}</div>
          </div>

          <div className="bg-[#121215] border border-neutral-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Allocated Budget</span>
              <DollarSign className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-white">
              ₹{campaigns.reduce((a, c) => a + c.budget_dollars, 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-[#121215] border border-neutral-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-medium">
              <span>Total Creator Applicants</span>
              <Users className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-[#c1121f]">
              {campaigns.reduce((a, c) => a + c.applicants_count, 0)}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-neutral-800 gap-2">
          <button
            onClick={() => setActiveTab("discovery")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "discovery"
                ? "border-[#c1121f] text-white font-bold"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Search className="w-4 h-4 text-[#c1121f]" />
            <span>Creator Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "campaigns"
                ? "border-[#c1121f] text-white font-bold"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4 text-[#c1121f]" />
            <span>Campaigns ({campaigns.length})</span>
          </button>
        </div>

        {/* TAB 1: CREATOR DISCOVERY */}
        {activeTab === "discovery" && (
          <section className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="bg-[#121215] border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search creators by name, handle, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#c1121f]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#c1121f]" />
                {["All", "Technology", "Software", "Health", "Travel"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedNiche(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedNiche === n
                        ? "bg-[#c1121f] text-white font-bold"
                        : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800"
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
                  className="bg-[#121215] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-[#c1121f]/50 hover:shadow-xl transition-all shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#c1121f] to-neutral-700 p-0.5">
                          <div className="w-full h-full rounded-[10px] bg-neutral-950 flex items-center justify-center font-bold text-white">
                            {creator.display_name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-base">{creator.display_name}</h3>
                            {creator.verified && (
                              <CheckCircle className="w-4 h-4 fill-[#c1121f] text-white" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-400">@{creator.handle}</p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-white border border-neutral-700">
                        <Star className="w-3.5 h-3.5 fill-[#c1121f] text-[#c1121f]" />
                        {creator.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">{creator.bio}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-300">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-medium">
                        <Tag className="w-3 h-3 text-[#c1121f]" />
                        {creator.niche}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-medium">
                        <MapPin className="w-3 h-3 text-[#c1121f]" />
                        {creator.location}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-medium">Packages from</span>
                      <span className="text-base font-extrabold text-white">
                        ₹{creator.starting_rate.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${creator.handle}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors flex items-center gap-1 shadow-sm border border-neutral-700"
                      >
                        <span>Media Kit</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => alert(`Invite sent to @${creator.handle}!`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors flex items-center gap-1 cursor-pointer shadow-md shadow-[#c1121f]/25"
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
                  className="bg-[#121215] border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[#c1121f]/50 hover:shadow-xl transition-all shadow-md"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#c1121f]/20 text-[#c1121f] border border-[#c1121f]/30">
                        {camp.status}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">{camp.target_niche}</span>
                    </div>
                    <h3 className="text-base font-bold text-white">{camp.title}</h3>
                    <p className="text-xs text-neutral-400">{camp.deliverables}</p>
                  </div>

                  <div className="flex items-center gap-8 text-center sm:text-right">
                    <div>
                      <span className="text-xs text-neutral-400 block font-medium">Budget</span>
                      <span className="text-lg font-black text-white">
                        ₹{camp.budget_dollars.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-neutral-400 block font-medium">Applicants</span>
                      <span className="text-lg font-black text-[#c1121f]">
                        {camp.applicants_count}
                      </span>
                    </div>

                    <button className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors cursor-pointer shadow-sm">
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCampaign}
              className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl text-white"
            >
              <h3 className="text-lg font-bold text-white">Launch New Campaign Brief</h3>
              <p className="text-xs text-neutral-400">
                Creators in the discovery directory can browse and submit applications.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Campaign Title</label>
                  <input
                    type="text"
                    value={newCampTitle}
                    onChange={(e) => setNewCampTitle(e.target.value)}
                    placeholder="e.g. Q4 Wireless Headphone Launch"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#c1121f]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium">Target Niche</label>
                    <select
                      value={newCampNiche}
                      onChange={(e) => setNewCampNiche(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#c1121f]"
                    >
                      <option>Technology & Gear</option>
                      <option>Software & Productivity</option>
                      <option>Health & Nutrition</option>
                      <option>Travel & Lifestyle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium">Total Budget (INR ₹)</label>
                    <input
                      type="number"
                      value={newCampBudget}
                      onChange={(e) => setNewCampBudget(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#c1121f]"
                      placeholder="100000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Deliverable Requirements</label>
                  <input
                    type="text"
                    value={newCampDeliverables}
                    onChange={(e) => setNewCampDeliverables(e.target.value)}
                    placeholder="e.g. 1x Dedicated 8-10 min YouTube review + Instagram Reel"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#c1121f]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Brief Description</label>
                  <textarea
                    rows={3}
                    value={newCampBrief}
                    onChange={(e) => setNewCampBrief(e.target.value)}
                    placeholder="Describe the product, key talking points, and guidelines..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#c1121f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCampaign(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#c1121f] text-white hover:bg-[#a50e1a] cursor-pointer shadow-lg shadow-[#c1121f]/25"
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
