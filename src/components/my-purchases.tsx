"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Purchase {
  id: string;
  price_paid_rlusd: string;
  xrpl_tx_hash: string;
  created_at: string;
  api_key: { id: string; key_prefix: string; name: string; is_active: boolean } | null;
  listing: { id: string; title: string; description: string; price_rlusd: string } | null;
}

export function MyPurchases() {
  const { sessionToken } = useWallet();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) return;
    fetch("/api/marketplace/purchase", { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionToken]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading your purchases...</p>;
  if (purchases.length === 0) return (
    <p className="text-muted-foreground text-sm text-center py-12">
      You haven&apos;t purchased any API access yet.
    </p>
  );

  return (
    <div className="space-y-3">
      {purchases.map((purchase) => (
        <Card key={purchase.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{purchase.listing?.title ?? "Unknown listing"}</CardTitle>
              <Badge variant={purchase.api_key?.is_active ? "default" : "secondary"}>
                {purchase.api_key?.is_active ? "Active" : "Revoked"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{purchase.price_paid_rlusd} RLUSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API key prefix</span>
              <span className="font-mono">{purchase.api_key?.key_prefix ?? "—"}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Purchased</span>
              <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
            </div>
            {purchase.xrpl_tx_hash && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground shrink-0">TX</span>
                <a
                  href={`https://testnet.xrpl.org/transactions/${purchase.xrpl_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-indigo-400 hover:text-indigo-300 truncate"
                >
                  {purchase.xrpl_tx_hash.slice(0, 16)}...
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Note: Your API key was shown once at purchase. If you lost it, contact the seller or generate a new one from the dashboard.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
