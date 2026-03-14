"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import sdk from "@crossmarkio/sdk";

const PLATFORM_ADDRESS = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? "";
const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
const INFX_PER_RLUSD = 100;

export default function DepositPage() {
  const { address, token } = useWallet();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "signing" | "confirming" | "done" | "error">("input");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creditsReceived, setCreditsReceived] = useState<string | null>(null);

  async function deposit() {
    if (!address || !token || !amount) return;
    setStep("signing");

    try {
      // Build Payment tx: user sends RLUSD to platform
      const tx = {
        TransactionType: "Payment",
        Account: address,
        Destination: PLATFORM_ADDRESS,
        Amount: {
          currency: "RLUSD",
          issuer: RLUSD_ISSUER,
          value: amount,
        },
      };

      setStep("signing");
      const result = await sdk.methods.signAndSubmitAndWait(tx as any);

      const meta = result?.response?.data?.meta as any;
      if (meta?.TransactionResult !== "tesSUCCESS") {
        throw new Error("XRPL transaction failed");
      }

      const hash = (result?.response?.data as any)?.hash;
      setTxHash(hash);
      setStep("confirming");

      // Notify backend
      const res = await fetch("/api/credits/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txHash: hash }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deposit failed");

      setCreditsReceived(data.creditsIssued);
      setStep("done");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("error");
    }
  }

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400">Connect your wallet to deposit.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Deposit RLUSD</h1>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 space-y-4">
        <div className="text-sm text-zinc-400 space-y-1">
          <p>Rate: <span className="text-white">1 RLUSD = {INFX_PER_RLUSD} INFX credits</span></p>
          <p>Network: XRPL Testnet</p>
        </div>

        {step === "input" && (
          <>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">RLUSD amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-full outline-none focus:border-indigo-500"
              />
            </div>
            {amount && (
              <p className="text-zinc-400 text-sm">
                You will receive: <span className="text-white font-semibold">{(parseFloat(amount) * INFX_PER_RLUSD).toLocaleString()} INFX</span>
              </p>
            )}
            <button
              onClick={deposit}
              disabled={!amount || parseFloat(amount) <= 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded text-sm transition-colors w-full"
            >
              Deposit via Crossmark
            </button>
          </>
        )}

        {step === "signing" && (
          <div className="text-center py-4">
            <p className="text-zinc-400">Waiting for wallet signature...</p>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-4 space-y-2">
            <p className="text-zinc-400">Confirming on-chain...</p>
            {txHash && <p className="text-xs font-mono text-zinc-500 break-all">{txHash}</p>}
          </div>
        )}

        {step === "done" && (
          <div className="bg-green-950 border border-green-800 rounded p-4 space-y-1">
            <p className="text-green-400 font-semibold">Deposit successful!</p>
            <p className="text-green-300 text-sm">{parseFloat(creditsReceived ?? "0").toLocaleString()} INFX credited to your account.</p>
            {txHash && <p className="text-xs font-mono text-zinc-500 break-all">TX: {txHash}</p>}
            <button
              onClick={() => { setStep("input"); setAmount(""); setTxHash(null); setCreditsReceived(null); }}
              className="text-indigo-400 hover:text-indigo-300 text-sm mt-2"
            >
              Make another deposit
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="bg-red-950 border border-red-800 rounded p-4 space-y-1">
            <p className="text-red-400 font-semibold">Error</p>
            <p className="text-red-300 text-sm">{errorMsg}</p>
            <button
              onClick={() => { setStep("input"); setErrorMsg(null); }}
              className="text-indigo-400 hover:text-indigo-300 text-sm mt-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
