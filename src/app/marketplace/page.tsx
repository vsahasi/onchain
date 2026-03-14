"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { MarketplaceListings } from "@/components/marketplace-listings";
import { CreateListingForm } from "@/components/create-listing-form";
import { MyListings } from "@/components/my-listings";
import { MyPurchases } from "@/components/my-purchases";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketplacePage() {
  const { connected } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!connected) {
    return <WalletConnect />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Key Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Buy API access from sellers who back it with IFX credits, or list
          your own credit pool for others to use.
        </p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="sell">Sell Access</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="my-purchases">My Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-6">
          <MarketplaceListings key={refreshKey} />
        </TabsContent>

        <TabsContent value="sell" className="mt-6 max-w-lg">
          <CreateListingForm onCreated={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>

        <TabsContent value="my-listings" className="mt-6">
          <MyListings />
        </TabsContent>

        <TabsContent value="my-purchases" className="mt-6">
          <MyPurchases />
        </TabsContent>
      </Tabs>
    </div>
  );
}
