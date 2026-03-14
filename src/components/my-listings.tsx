"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Listing {
  id: string;
  title: string;
  price_rlusd: string;
  credit_limit: string;
  max_purchases: number;
  purchase_count: number;
  is_active: boolean;
  created_at: string;
}

export function MyListings() {
  const { sessionToken } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) return;
    fetch("/api/marketplace/listings?mine=true", { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionToken]);

  async function toggleListing(id: string, is_active: boolean) {
    if (!sessionToken) return;
    const res = await fetch("/api/marketplace/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ id, is_active }),
    });
    if (res.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, is_active } : l));
      toast.success(is_active ? "Listing activated" : "Listing deactivated");
    } else {
      toast.error("Failed to update listing");
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading your listings...</p>;
  if (listings.length === 0) return (
    <p className="text-muted-foreground text-sm text-center py-12">
      You have no listings yet. Create one in the &quot;Sell Access&quot; tab.
    </p>
  );

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <Card key={listing.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{listing.title}</CardTitle>
              <Badge variant={listing.is_active ? "default" : "secondary"}>
                {listing.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1 text-muted-foreground">
                <p>Price: <span className="text-foreground">{listing.price_rlusd} RLUSD</span></p>
                <p>
                  Sales:{" "}
                  <span className="text-foreground">
                    {listing.purchase_count}
                    {listing.max_purchases > 0 ? ` / ${listing.max_purchases}` : ""}
                  </span>
                </p>
                {parseFloat(listing.credit_limit) > 0 && (
                  <p>Credit limit: <span className="text-foreground">{parseFloat(listing.credit_limit).toLocaleString()} INFX</span></p>
                )}
              </div>
              <Button
                size="sm"
                variant={listing.is_active ? "destructive" : "outline"}
                onClick={() => toggleListing(listing.id, !listing.is_active)}
              >
                {listing.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
