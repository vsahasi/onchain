"use client";

import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { OrderBook } from "@/components/order-book";

export default function MarketplacePage() {
  const { connected } = useWallet();

  if (!connected) {
    return <WalletConnect />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Buy and sell IFX inference credits on the XRPL native DEX.
          All trades settle atomically on-chain.
        </p>
      </div>
      <OrderBook />
    </div>
  );
}
