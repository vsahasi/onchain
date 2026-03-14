"use client";

import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { DepositForm } from "@/components/deposit-form";
import { CreditBalance } from "@/components/credit-balance";

export default function DepositPage() {
  const { connected } = useWallet();

  if (!connected) {
    return <WalletConnect />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Deposit</h1>
        <p className="text-muted-foreground mt-1">
          Convert RLUSD stablecoin into IFX inference credits
        </p>
      </div>
      <CreditBalance />
      <DepositForm />
    </div>
  );
}
