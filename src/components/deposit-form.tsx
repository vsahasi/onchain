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

type Step = "input" | "trustline" | "signing" | "confirming" | "done" | "error";

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

      const result = await sdk.methods.signAndSubmitAndWait(tx as never);
      const resultAny = result as never as Record<string, unknown>;
      const respData = (resultAny?.response as Record<string, unknown>)?.data as Record<string, unknown>;
      // Crossmark returns { resp: {...}, result: { tx_json: {...}, meta: {...} } }
      const innerResult = respData?.result as Record<string, unknown>;
      const txMeta = innerResult?.meta as Record<string, unknown>;
      const txResultCode = txMeta?.TransactionResult as string;
      const hash = (innerResult?.hash ?? (innerResult?.tx_json as Record<string, unknown>)?.hash) as string;
      console.log("[deposit-form] txResultCode:", txResultCode, "hash:", hash);

      if (txResultCode && txResultCode !== "tesSUCCESS") {
        throw new Error(`Transaction failed: ${txResultCode}`);
      }
      if (!hash) throw new Error("No transaction hash returned");
      setTxHash(hash);
      setStep("confirming");

      const res = await fetch("/api/credits/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ tx_hash: hash }),
      });

      const resData = await res.json();
      console.log("[deposit-form] response:", res.status, resData);
      if (!res.ok) {
        if (resData.error === "Trust line not established") {
          setStep("trustline");
          return;
        }
        throw new Error(resData.error ?? "Deposit failed");
      }

      setCreditsIssued(resData.credits_issued?.toString() ?? creditAmount.toString());
      setStep("done");
      toast.success("Credits issued!");
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Deposit failed";
      if (msg.toLowerCase().includes("trust line")) {
        setStep("trustline");
        return;
      }
      setErrorMsg(msg);
      setStep("error");
    }
  }

  async function setupTrustLine() {
    if (!address) return;
    setStep("signing");
    try {
      const tx = {
        TransactionType: "TrustSet",
        Account: address,
        LimitAmount: {
          currency: "INFX",
          issuer: platformAddress,
          value: "1000000000",
        },
      };
      const result = await sdk.methods.signAndSubmitAndWait(tx as never);
      const resultAny = result as never as Record<string, unknown>;
      const respData = (resultAny?.response as Record<string, unknown>)?.data as Record<string, unknown>;
      const innerResult = respData?.result as Record<string, unknown>;
      const txMeta = innerResult?.meta as Record<string, unknown>;
      const txResultCode = txMeta?.TransactionResult as string;
      if (txResultCode && txResultCode !== "tesSUCCESS") {
        throw new Error(`Trust line setup failed: ${txResultCode}`);
      }
              toast.success("Trust line set up! Now deposit your XRP.");
      setStep("input");
    } catch (e: unknown) {
      setErrorMsg((e as Error).message ?? "Trust line setup failed");
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
          Send XRP to the platform via Crossmark and receive INFX inference
          credits at a 1:100 ratio (1 XRP = 100 INFX).
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
                    {creditAmount.toLocaleString()} INFX
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

        {step === "trustline" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-950 border border-yellow-800 p-4 space-y-2">
              <p className="text-sm font-medium text-yellow-400">One-time setup required</p>
              <p className="text-sm text-muted-foreground">
                  Your wallet needs a trust line to receive INFX credits. This is a one-time Crossmark transaction.
              </p>
            </div>
            <Button className="w-full" onClick={setupTrustLine}>
              Set Up Trust Line via Crossmark
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
                {parseFloat(creditsIssued ?? "0").toLocaleString()} INFX credits have been added to your balance.
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
            <div className="space-y-2">
              <Label htmlFor="manual-hash">Already sent XRP? Paste transaction hash:</Label>
              <Input
                id="manual-hash"
                placeholder="Paste XRPL transaction hash"
                className="font-mono text-xs"
                onChange={(e) => setTxHash(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={async () => {
                  if (!txHash || !sessionToken) return;
                  setStep("confirming");
                  try {
                    const res = await fetch("/api/credits/deposit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
                      body: JSON.stringify({ tx_hash: txHash }),
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
                }}
              >
                Confirm with Hash
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={reset}>Try Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
