"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useWallet } from "@/providers/wallet-provider";
import { toast } from "sonner";

export function DepositForm() {
  const { address, sessionToken, connected } = useWallet();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "trustline" | "payment" | "confirming" | "done">("input");
  const [txHash, setTxHash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const creditAmount = parseFloat(amount || "0") * 100;
  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS || "";

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid RLUSD amount");
      return;
    }

    setStep("payment");
  };

  const handleConfirmPayment = async () => {
    if (!txHash) {
      toast.error("Enter the XRPL transaction hash");
      return;
    }

    setIsProcessing(true);
    setStep("confirming");

    try {
      const res = await fetch("/api/credits/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          rlusd_amount: amount,
          tx_hash: txHash,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`${data.credits_issued} INFX credits issued!`);
        setStep("done");
      } else {
        if (data.action === "setup_trustline") {
          setStep("trustline");
          toast.error("You need to set up a trust line first");
        } else {
          toast.error(data.error || "Deposit failed");
          setStep("payment");
        }
      }
    } catch (err) {
      toast.error("Failed to process deposit");
      setStep("payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setAmount("");
    setTxHash("");
    setStep("input");
  };

  if (!connected) return null;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Deposit RLUSD for Credits</CardTitle>
        <CardDescription>
          Send RLUSD to the platform address and receive IFX inference credits
          at a 1:100 ratio (1 RLUSD = 100 IFX).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">RLUSD Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              {parseFloat(amount || "0") > 0 && (
                <p className="text-sm text-muted-foreground">
                  You will receive{" "}
                  <span className="font-semibold text-foreground">
                    {creditAmount.toLocaleString()} IFX
                  </span>{" "}
                  credits
                </p>
              )}
            </div>
            <Button className="w-full" onClick={handleDeposit}>
              Continue
            </Button>
          </div>
        )}

        {step === "trustline" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Step 1: Set Up Trust Line</p>
              <p className="text-xs text-muted-foreground">
                Before receiving IFX credits, you need to establish a trust
                line with the platform issuer. Use your XRPL wallet to create a
                trust line:
              </p>
              <div className="bg-background rounded p-3 text-xs font-mono break-all">
                <p>Currency: IFX</p>
                <p>Issuer: {platformAddress}</p>
                <p>Limit: 1000000000</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep("payment")}>
              I{"'"}ve set up the trust line
            </Button>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">
                Send {amount} RLUSD to the platform
              </p>
              <p className="text-xs text-muted-foreground">
                Use your XRPL wallet to send a Payment transaction:
              </p>
              <div className="bg-background rounded p-3 text-xs font-mono break-all">
                <p>To: {platformAddress || "<platform address>"}</p>
                <p>Amount: {amount} RLUSD</p>
                <p>Issuer: rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="txhash">Transaction Hash</Label>
              <Input
                id="txhash"
                placeholder="Paste your XRPL transaction hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleConfirmPayment}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm Deposit"}
            </Button>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Verifying transaction and issuing credits...
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <div>
              <p className="font-medium">Deposit Successful!</p>
              <p className="text-sm text-muted-foreground">
                {creditAmount.toLocaleString()} IFX credits have been issued
                to your wallet.
              </p>
            </div>
            <Button variant="outline" onClick={reset}>
              Make Another Deposit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
