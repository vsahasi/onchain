"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWallet } from "@/providers/wallet-provider";
import { toast } from "sonner";
import sdk from "@crossmarkio/sdk";

const RLUSD_ISSUER = process.env.NEXT_PUBLIC_RLUSD_ISSUER ?? "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
const RLUSD_HEX = "524C555344000000000000000000000000000000";
const XRP_TO_DROPS = 1_000_000; // 1 XRP = 1,000,000 drops

type Step = "input" | "signing" | "confirming" | "done" | "error";

export function DepositForm() {
  const { address, sessionToken, connected } = useWallet();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [creditsIssued, setCreditsIssued] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? "";
  const creditAmount = parseFloat(amount || "0") * 100;

  async function handleDeposit() {
    if (!address || !sessionToken || !amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid RLUSD amount");
      return;
    }
    if (!platformAddress) {
      toast.error("Platform address not configured — check NEXT_PUBLIC_PLATFORM_ADDRESS");
      return;
    }
    setStep("signing");
    try {
      const tx = {
        TransactionType: "Payment",
        Account: address,
        Destination: platformAddress,
        // XRP amount in drops (string) — no issuer/currency fields needed
        Amount: String(Math.floor(parseFloat(amount) * XRP_TO_DROPS)),
      };

      // signAndWait signs only — we then submit via the XRPL client server-side
      // This avoids the Crossmark scroll/UI issue with signAndSubmitAndWait
      const result = await sdk.methods.signAndWait(tx as never);
      console.log("[deposit] signAndWait result:", JSON.stringify(result));
      const resultData = (result as never as { response: { data: { tx_blob?: string; txBlob?: string; tx?: { tx_blob?: string } } } })?.response?.data;
      const txBlob = resultData?.tx_blob ?? resultData?.txBlob ?? resultData?.tx?.tx_blob;
      if (!txBlob) throw new Error("Wallet did not return a signed transaction");

      // Submit via our backend which returns the tx hash
      const submitRes = await fetch("/api/xrpl/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_blob: txBlob }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || submitData.result !== "tesSUCCESS") {
        throw new Error(submitData.error ?? "Transaction failed on ledger");
      }

      const hash = submitData.hash;
      setTxHash(hash);
      setStep("confirming");

      const res = await fetch("/api/credits/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ tx_hash: hash }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error ?? "Deposit failed");

      setCreditsIssued(resData.credits_issued?.toString() ?? creditAmount.toString());
      setStep("done");
      toast.success("Credits issued!");
    } catch (e: unknown) {
      setErrorMsg((e as Error).message ?? "Deposit failed");
      setStep("error");
    }
  }

  function reset() {
    setAmount("");
    setTxHash(null);
    setCreditsIssued(null);
    setErrorMsg(null);
    setStep("input");
  }

  if (!connected) return null;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Deposit XRP for Credits</CardTitle>
        <CardDescription>
          Send XRP to the platform via Crossmark and receive IFX inference
          credits at a 1:100 ratio (1 XRP = 100 IFX).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "input" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">XRP Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="1.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
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
            <Button className="w-full" onClick={handleDeposit} disabled={!amount || parseFloat(amount) <= 0}>
              Deposit via Crossmark
            </Button>
          </div>
        )}

        {step === "signing" && (
          <div className="text-center py-6 space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Waiting for Crossmark approval...</p>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-6 space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Confirming on-chain and issuing credits...</p>
            {txHash && (
              <p className="text-xs font-mono text-muted-foreground break-all">{txHash}</p>
            )}
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
                {parseFloat(creditsIssued ?? "0").toLocaleString()} IFX credits have been added to your balance.
              </p>
              {txHash && (
                <a
                  href={`https://testnet.xrpl.org/transactions/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
                >
                  View on XRPL Explorer →
                </a>
              )}
            </div>
            <Button variant="outline" onClick={reset}>Make Another Deposit</Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={reset}>Try Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
