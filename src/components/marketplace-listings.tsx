"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import sdk from "@crossmarkio/sdk";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export function MarketplaceListings() {
  const { sessionToken, address } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [purchasedKey, setPurchasedKey] = useState<{ key: string; listing: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/listings")
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(listing: Listing) {
    if (!sessionToken || !address) return;
    setBuying(listing.id);
    try {
      const tx = {
        TransactionType: "Payment",
        Account: address,
        Destination: PLATFORM_ADDRESS,
        Amount: { currency: RLUSD_HEX, issuer: RLUSD_ISSUER, value: listing.price_rlusd },
      };

      toast.info("Waiting for wallet signature...");
      const result = await sdk.methods.signAndSubmitAndWait(tx as never);
      const meta = (result as never as { response: { data: { meta: { TransactionResult: string }; hash: string } } })?.response?.data;

      if (meta?.meta?.TransactionResult !== "tesSUCCESS") {
        throw new Error("XRPL payment failed");
      }

      const txHash = meta.hash;
      toast.info("Payment confirmed, issuing API key...");

      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ listing_id: listing.id, tx_hash: txHash }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");

      setPurchasedKey({ key: data.key, listing: listing.title });
      toast.success("API key issued! Save it now.");
      setListings((prev) =>
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

  if (loading) return <p className="text-muted-foreground text-sm">Loading listings...</p>;

  return (
    <div className="space-y-4">
      {purchasedKey && (
        <div className="bg-green-950 border border-green-800 rounded-lg p-4 space-y-2">
          <p className="text-green-400 font-semibold">Purchase successful — save your API key now!</p>
          <p className="text-green-300 text-xs">Listing: {purchasedKey.listing}</p>
          <div className="flex items-center gap-2">
            <code className="text-green-300 text-xs break-all flex-1 bg-green-900/40 px-2 py-1 rounded">
              {purchasedKey.key}
            </code>
            <Button size="sm" variant="outline" onClick={copyKey} className="shrink-0 border-green-700 text-green-300 hover:bg-green-900">
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-green-600 text-xs">This key will not be shown again.</p>
        </div>
      )}

      {listings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          No listings yet. Be the first to sell API access!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const soldOut = listing.max_purchases > 0 && listing.purchase_count >= listing.max_purchases;
            const isOwnListing = listing.seller?.wallet_address === address;
            return (
              <Card key={listing.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{listing.title}</CardTitle>
                    {soldOut && <Badge variant="secondary">Sold Out</Badge>}
                  </div>
                  {listing.description && (
                    <CardDescription className="text-xs mt-1">{listing.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold">{listing.price_rlusd} RLUSD</span>
                    </div>
                    {parseFloat(listing.credit_limit) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit limit</span>
                        <span>{parseFloat(listing.credit_limit).toLocaleString()} INFX</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sold</span>
                      <span>
                        {listing.purchase_count}
                        {listing.max_purchases > 0 ? ` / ${listing.max_purchases}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seller</span>
                      <span className="font-mono text-xs">
                        {listing.seller?.wallet_address
                          ? `${listing.seller.wallet_address.slice(0, 6)}...${listing.seller.wallet_address.slice(-4)}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={soldOut || isOwnListing || buying === listing.id || !sessionToken}
                    onClick={() => handleBuy(listing)}
                  >
                    {buying === listing.id
                      ? "Processing..."
                      : isOwnListing
                      ? "Your Listing"
                      : soldOut
                      ? "Sold Out"
                      : `Buy for ${listing.price_rlusd} RLUSD`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
