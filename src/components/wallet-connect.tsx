"use client";

import { useWallet } from "@/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function WalletConnect() {
  const { connected, connect, isConnecting, address } = useWallet();

  if (connected) return null;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">IX</span>
          </div>
          <CardTitle className="text-2xl">Welcome to InferX</CardTitle>
          <CardDescription>
            Tokenized inference credits on the XRP Ledger. Connect your wallet
            to deposit RLUSD, trade credits, and access AI models at a discount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            size="lg"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect XRPL Wallet"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Supports Crossmark, GEM Wallet, or manual address entry for testing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
