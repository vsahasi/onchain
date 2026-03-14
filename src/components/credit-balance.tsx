"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/providers/wallet-provider";

interface BalanceData {
  infx_balance: string;
  rlusd_balance: string;
}

export function CreditBalance() {
  const { address, sessionToken, connected } = useWallet();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !address) return;

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (address) params.set("wallet", address);

        const res = await fetch(`/api/credits/balance?${params}`, {
          headers: sessionToken
            ? { Authorization: `Bearer ${sessionToken}` }
            : {},
        });

        if (res.ok) {
          const data = await res.json();
          setBalance(data);
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [address, sessionToken, connected]);

  if (!connected) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            IFX Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? (
              <span className="text-muted-foreground">...</span>
            ) : (
              parseFloat(balance?.infx_balance || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ≈ ${(parseFloat(balance?.infx_balance || "0") / 100).toFixed(4)} USD
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            RLUSD Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {loading ? (
              <span className="text-muted-foreground">...</span>
            ) : (
              `$${parseFloat(balance?.rlusd_balance || "0").toFixed(2)}`
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ripple USD stablecoin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
