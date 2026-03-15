"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { MarketplaceListings } from "@/components/marketplace-listings";
import { CreateListingForm } from "@/components/create-listing-form";
import { MyListings } from "@/components/my-listings";
import { MyPurchases } from "@/components/my-purchases";

const TABS = [
  { id: "browse",       label: "Browse" },
  { id: "sell",         label: "Sell Access" },
  { id: "my-listings",  label: "My Listings" },
  { id: "my-purchases", label: "My Purchases" },
] as const;

type Tab = typeof TABS[number]["id"];

const STATS = [
  { label: "Active listings", value: "532" },
  { label: "Volume (RLUSD)", value: "$18,420" },
  { label: "Keys issued", value: "2,847" },
  { label: "Avg price",  value: "$6.30" },
];

export default function MarketplacePage() {
  const { connected } = useWallet();
  const [tab, setTab] = useState<Tab>("browse");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!connected) return <WalletConnect />;

  return (
    <div className="mesh-bg -mt-8 pt-10 pb-16 px-1 min-h-screen">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-glow-pulse shadow-[0_0_8px_2px_rgba(139,92,246,0.6)]" />
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">API Key Marketplace</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">Marketplace</h1>
        <p className="text-white/40 text-sm mt-1">
          Buy AI access backed by on-chain INFX credits, or monetise your own balance.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        {STATS.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-white/25 mb-1">{label}</p>
            <p className="text-lg font-bold text-white/80">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-8 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 w-fit animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === id
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="animate-fade-in-up" style={{ animationDelay: "180ms" }}>
        {tab === "browse"       && <MarketplaceListings key={refreshKey} />}
        {tab === "sell"         && <div className="max-w-lg"><CreateListingForm onCreated={() => { setRefreshKey(k => k + 1); setTab("browse"); }} /></div>}
        {tab === "my-listings"  && <MyListings />}
        {tab === "my-purchases" && <MyPurchases />}
      </div>
    </div>
  );
}
