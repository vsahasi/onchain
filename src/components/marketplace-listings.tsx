"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import sdk from "@crossmarkio/sdk";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const RLUSD_ISSUER = process.env.NEXT_PUBLIC_RLUSD_ISSUER ?? "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
const RLUSD_HEX = "524C555344000000000000000000000000000000";
const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? "";

interface Listing {
  id: string;
  title: string;
  description: string;
  price_rlusd: string;
  credit_limit: string;
  max_purchases: number;
  purchase_count: number;
  created_at: string;
  seller: { wallet_address: string } | null;
  _demo?: boolean;
}

// Hardcoded demo listings — always shown for demo purposes
const DEMO_LISTINGS: Listing[] = [
  {
    id: "demo-1",
    title: "GPT-4o Pro Access",
    description: "Full access to GPT-4o via the onchain gateway. Backed by 5,000 IFX credits.",
    price_rlusd: "15.00",
    credit_limit: "5000",
    max_purchases: 0,
    purchase_count: 47,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    seller: { wallet_address: "rfeJJNGBQnEpjCSBjPEP6jNH7YvDChgHkW" },
    _demo: true,
  },
  {
    id: "demo-2",
    title: "GPT-4o-mini Bulk Bundle",
    description: "High-throughput access optimised for batch workloads. 1,000 IFX per key.",
    price_rlusd: "3.00",
    credit_limit: "1000",
    max_purchases: 500,
    purchase_count: 183,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    seller: { wallet_address: "rBTkCKSe5TQAsNHioFKNXiLv8XBrW87xkW" },
    _demo: true,
  },
  {
    id: "demo-3",
    title: "Unlimited gpt-4.1-nano",
    description: "Cheapest model, no credit cap. Perfect for high-volume agents and evals.",
    price_rlusd: "1.00",
    credit_limit: "0",
    max_purchases: 0,
    purchase_count: 302,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    seller: { wallet_address: "rPKEoGWGDDCzHWJgVmGxSuFSQRB2dJmJVQ" },
    _demo: true,
  },
];

const MODEL_TAGS: Record<string, string[]> = {
  "demo-1": ["gpt-4o", "gpt-4o-mini"],
  "demo-2": ["gpt-4o-mini"],
  "demo-3": ["gpt-4.1-nano", "gpt-4.1-mini"],
};

function SellerBadge({ address }: { address: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
      <span className="font-mono text-xs text-white/30">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    </span>
  );
}

function SalesTicker({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="text-xs text-amber-400/70 font-medium">
      {count.toLocaleString()} sold
    </span>
  );
}

export function MarketplaceListings() {
  const { sessionToken, address } = useWallet();
  const [apiListings, setApiListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [purchasedKey, setPurchasedKey] = useState<{ key: string; listing: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/listings")
      .then((r) => r.json())
      .then((d) => setApiListings(d.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Merge demo + real listings (deduplicate real ones by title)
  const allListings = [
    ...DEMO_LISTINGS,
    ...apiListings.filter((l) => !DEMO_LISTINGS.some((d) => d.id === l.id)),
  ];

  async function handleBuy(listing: Listing) {
    if (!sessionToken || !address) return;
    if (listing._demo) {
      toast.info("This is a demo listing — connect a funded wallet to purchase real access.");
      return;
    }
    setBuying(listing.id);
    try {
      const tx = {
        TransactionType: "Payment",
        Account: address,
        Destination: PLATFORM_ADDRESS,
        Amount: { currency: RLUSD_HEX, issuer: RLUSD_ISSUER, value: listing.price_rlusd },
      };
      toast.info("Waiting for wallet signature…");
      const result = await sdk.methods.signAndSubmitAndWait(tx as never);
      const meta = (result as never as { response: { data: { meta: { TransactionResult: string }; hash: string } } })?.response?.data;
      if (meta?.meta?.TransactionResult !== "tesSUCCESS") throw new Error("XRPL payment failed");

      const txHash = meta.hash;
      toast.info("Payment confirmed, issuing API key…");

      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ listing_id: listing.id, tx_hash: txHash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");

      setPurchasedKey({ key: data.key, listing: listing.title });
      toast.success("API key issued! Save it now.");
      setApiListings((prev) =>
        prev.map((l) => l.id === listing.id ? { ...l, purchase_count: l.purchase_count + 1 } : l)
      );
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Purchase failed");
    } finally {
      setBuying(null);
    }
  }

  function copyKey() {
    if (!purchasedKey) return;
    navigator.clipboard.writeText(purchasedKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-2xl border border-white/[0.04] bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Purchased key banner */}
      {purchasedKey && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <p className="text-sm font-semibold text-emerald-300">Purchase confirmed — save your API key</p>
          </div>
          <p className="text-xs text-white/40">{purchasedKey.listing}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/30 border border-white/[0.06] px-3 py-2 rounded-xl text-xs font-mono text-emerald-300/80 break-all">
              {purchasedKey.key}
            </code>
            <Button
              size="sm"
              onClick={copyKey}
              className="shrink-0 border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs"
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-white/20">This key will not be shown again.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allListings.map((listing) => {
          const soldOut = listing.max_purchases > 0 && listing.purchase_count >= listing.max_purchases;
          const isOwn = listing.seller?.wallet_address === address;
          const isDemo = listing._demo ?? false;
          const tags = MODEL_TAGS[listing.id];
          const creditLabel = parseFloat(listing.credit_limit) > 0
            ? `${parseFloat(listing.credit_limit).toLocaleString()} IFX`
            : "Unlimited";

          return (
            <div
              key={listing.id}
              className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
            >
              {/* Top accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="flex flex-col flex-1 p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-white/90 leading-snug">{listing.title}</h3>
                  {soldOut ? (
                    <Badge className="shrink-0 bg-white/[0.05] text-white/30 border-white/[0.06] text-[10px]">Sold out</Badge>
                  ) : isDemo ? (
                    <Badge className="shrink-0 bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[10px]">Featured</Badge>
                  ) : null}
                </div>

                <p className="text-xs text-white/35 leading-relaxed mb-4">{listing.description}</p>

                {/* Model tags */}
                {tags && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.map((m) => (
                      <span key={m} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40">
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: "Price", value: `${listing.price_rlusd} RLUSD` },
                    { label: "Credits", value: creditLabel },
                    { label: "Sold", value: listing.purchase_count.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/[0.03] rounded-lg px-2.5 py-2 border border-white/[0.04]">
                      <p className="text-[10px] text-white/25 mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-white/80 truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-between">
                    {listing.seller && <SellerBadge address={listing.seller.wallet_address} />}
                    <SalesTicker count={listing.purchase_count} />
                  </div>

                  <Button
                    className={`w-full h-9 text-xs font-semibold transition-all duration-200 ${
                      isOwn || soldOut
                        ? "bg-white/[0.04] border border-white/[0.06] text-white/30 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_28px_rgba(99,102,241,0.5)]"
                    }`}
                    disabled={soldOut || isOwn || buying === listing.id}
                    onClick={() => handleBuy(listing)}
                  >
                    {buying === listing.id
                      ? <span className="flex items-center gap-2"><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Processing…</span>
                      : isOwn ? "Your listing"
                      : soldOut ? "Sold out"
                      : `Buy for ${listing.price_rlusd} RLUSD`}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
