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
      location: "Bengaluru, Karnataka",
      starting_rate: 25000,
      bio: "Tech reviewer, consumer audio enthusiast, and 4K workflow specialist.",
      verified: true,
    },
    {
      id: "c-2",
      handle: "rohansharma",
      display_name: "Rohan Sharma",
      niche: "Software & Productivity",
      rating: 4.9,
      location: "Hyderabad, Telangana",
      starting_rate: 35000,
      bio: "Developer educator and SaaS reviewer covering modern engineering stacks.",
      verified: true,
    },
    {
      id: "c-3",
      handle: "pooja_fit",
      display_name: "Pooja Verma",
      niche: "Health & Nutrition",
      rating: 4.8,
      location: "Mumbai, Maharashtra",
      starting_rate: 20000,
      bio: "Certified fitness coach and nutritionist creating evidence-based supplement reviews.",
      verified: true,
    },
    {
      id: "c-4",
      handle: "kabir_travels",
      display_name: "Kabir Mehta",
      niche: "Travel & Lifestyle",
      rating: 4.9,
      location: "New Delhi, NCR",
      starting_rate: 45000,
      bio: "Cinematic travel filmmaker partnering with premium hospitality and camera brands.",
      verified: false,
    },
  ]);

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
    <div className="min-h-screen bg-white text-black selection:bg-[#c1121f] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={30} variant="duotone" withWordmark={true} />
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-black font-semibold border border-neutral-200">
              Brand Portal • Lumina Audio
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <button
              onClick={() => setShowNewCampaign(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#c1121f]/20"
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
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2 font-medium">
              <span>Active Campaigns</span>
              <Briefcase className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-black">{campaigns.length}</div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2 font-medium">
              <span>Allocated Budget</span>
              <DollarSign className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-black">
              ₹{campaigns.reduce((a, c) => a + c.budget_dollars, 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2 font-medium">
              <span>Total Creator Applicants</span>
              <Users className="w-4 h-4 text-[#c1121f]" />
            </div>
            <div className="text-2xl font-black text-[#c1121f]">
              {campaigns.reduce((a, c) => a + c.applicants_count, 0)}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex border-b border-neutral-200 gap-2">
          <button
            onClick={() => setActiveTab("discovery")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "discovery"
                ? "border-[#c1121f] text-black font-bold"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            <Search className="w-4 h-4 text-[#c1121f]" />
            <span>Creator Discovery</span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === "campaigns"
                ? "border-[#c1121f] text-black font-bold"
                : "border-transparent text-neutral-500 hover:text-black"
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
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search creators by name, handle, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-[#c1121f]"
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
                        : "bg-neutral-100 text-black hover:bg-neutral-200"
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
                  className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between hover:border-[#c1121f]/50 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#c1121f] to-black p-0.5">
                          <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center font-bold text-black">
                            {creator.display_name.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-black text-base">{creator.display_name}</h3>
                            {creator.verified && (
                              <CheckCircle className="w-4 h-4 fill-[#c1121f] text-white" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">@{creator.handle}</p>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-black border border-neutral-200">
                        <Star className="w-3.5 h-3.5 fill-[#c1121f] text-[#c1121f]" />
                        {creator.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed">{creator.bio}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-medium">
                        <Tag className="w-3 h-3 text-[#c1121f]" />
                        {creator.niche}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-medium">
                        <MapPin className="w-3 h-3 text-[#c1121f]" />
                        {creator.location}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block font-medium">Packages from</span>
                      <span className="text-base font-extrabold text-black">
                        ₹{creator.starting_rate.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${creator.handle}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-black transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span>Media Kit</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => alert(`Invite sent to @${creator.handle}!`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c1121f] hover:bg-[#a50e1a] text-white transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
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
                  className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[#c1121f]/50 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#c1121f]/10 text-[#c1121f] border border-[#c1121f]/20">
                        {camp.status}
                      </span>
                      <span className="text-xs text-neutral-500 font-medium">{camp.target_niche}</span>
                    </div>
                    <h3 className="text-base font-bold text-black">{camp.title}</h3>
                    <p className="text-xs text-neutral-600">{camp.deliverables}</p>
                  </div>

                  <div className="flex items-center gap-8 text-center sm:text-right">
                    <div>
                      <span className="text-xs text-neutral-500 block font-medium">Budget</span>
                      <span className="text-lg font-black text-black">
                        ₹{camp.budget_dollars.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-neutral-500 block font-medium">Applicants</span>
                      <span className="text-lg font-black text-[#c1121f]">
                        {camp.applicants_count}
                      </span>
                    </div>

                    <button className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-200 transition-colors cursor-pointer shadow-sm">
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateCampaign}
              className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-black">Launch New Campaign Brief</h3>
              <p className="text-xs text-neutral-500">
                Creators in the discovery directory can browse and submit applications.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Campaign Title</label>
                  <input
                    type="text"
                    value={newCampTitle}
                    onChange={(e) => setNewCampTitle(e.target.value)}
                    placeholder="e.g. Q4 Wireless Headphone Launch"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-black focus:outline-none focus:border-[#c1121f]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Target Niche</label>
                    <select
                      value={newCampNiche}
                      onChange={(e) => setNewCampNiche(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-black focus:outline-none focus:border-[#c1121f]"
                    >
                      <option>Technology & Gear</option>
                      <option>Software & Productivity</option>
                      <option>Health & Nutrition</option>
                      <option>Travel & Lifestyle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-600 mb-1 font-medium">Total Budget (INR ₹)</label>
                    <input
                      type="number"
                      value={newCampBudget}
                      onChange={(e) => setNewCampBudget(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-black focus:outline-none focus:border-[#c1121f]"
                      placeholder="100000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Deliverable Requirements</label>
                  <input
                    type="text"
                    value={newCampDeliverables}
                    onChange={(e) => setNewCampDeliverables(e.target.value)}
                    placeholder="e.g. 1x Dedicated 8-10 min YouTube review + Instagram Reel"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-black focus:outline-none focus:border-[#c1121f]"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Brief Description</label>
                  <textarea
                    rows={3}
                    value={newCampBrief}
                    onChange={(e) => setNewCampBrief(e.target.value)}
                    placeholder="Describe the product, key talking points, and guidelines..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-black focus:outline-none focus:border-[#c1121f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewCampaign(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-neutral-100 text-black hover:bg-neutral-200 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#c1121f] text-white hover:bg-[#a50e1a] cursor-pointer shadow-md shadow-[#c1121f]/20"
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
