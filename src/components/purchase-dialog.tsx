"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Listing {
  id: string;
  title: string;
  description: string;
  price_rlusd: string;
  seller: { wallet_address: string };
}

interface Props {
  listing: Listing;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "confirm" | "pay" | "done";

export function PurchaseDialog({ listing, onClose, onSuccess }: Props) {
  const { address, sessionToken } = useWallet();
  const [step, setStep] = useState<Step>("confirm");
  const [txHash, setTxHash] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS;

  async function handleSubmit() {
    if (!txHash.trim()) {
      toast.error("Enter the XRPL transaction hash");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          listing_id: listing.id,
          xrpl_tx_hash: txHash.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Purchase failed");
        return;
      }

      setApiKey(data.api_key);
      setStep("done");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied!");
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Purchase API Access</DialogTitle>
              <DialogDescription>
                You are buying access to: <strong>{listing.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              {listing.description && <p>{listing.description}</p>}
              <div className="flex justify-between border rounded-md p-3 bg-muted/40">
                <span className="text-muted-foreground">Price</span>
                <span className="font-semibold">{listing.price_rlusd} RLUSD</span>
              </div>
              <div className="flex justify-between border rounded-md p-3 bg-muted/40">
                <span className="text-muted-foreground">You receive</span>
                <span className="font-semibold">1 API key</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("pay")}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {step === "pay" && (
          <>
            <DialogHeader>
              <DialogTitle>Send Payment on XRPL</DialogTitle>
              <DialogDescription>
                Send exactly{" "}
                <strong>{listing.price_rlusd} RLUSD</strong> to the platform
                wallet, then paste the transaction hash below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Platform Wallet (recipient)</Label>
                <Input
                  readOnly
                  value={platformAddress ?? ""}
                  className="font-mono text-xs"
                  onClick={(e) =>
                    (e.target as HTMLInputElement).select()
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input readOnly value={`${listing.price_rlusd} RLUSD`} />
              </div>
              <p className="text-xs text-muted-foreground">
                Use Crossmark or any XRPL wallet. After sending, paste the
                transaction hash below to verify your payment.
              </p>
              <div className="space-y-1">
                <Label>Transaction Hash</Label>
                <Input
                  placeholder="Paste XRPL tx hash…"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("confirm")}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !txHash.trim()}>
                {loading ? "Verifying…" : "Confirm Purchase"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Purchase Successful!</DialogTitle>
              <DialogDescription>
                Your API key is ready. Save it now — it won&apos;t be shown
                again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
                {apiKey}
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key as a Bearer token on{" "}
                <code>/api/v1/chat/completions</code>. Credits are drawn from
                the seller&apos;s balance.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copyKey}>
                Copy Key
              </Button>
              <Button
                onClick={() => {
                  onSuccess();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
