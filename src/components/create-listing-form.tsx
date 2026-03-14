"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onCreated?: () => void;
}

export function CreateListingForm({ onCreated }: Props) {
  const { sessionToken } = useWallet();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRlusd, setPriceRlusd] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [maxPurchases, setMaxPurchases] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          title,
          description,
          price_rlusd: priceRlusd,
          credit_limit: creditLimit || "0",
          max_purchases: maxPurchases ? parseInt(maxPurchases) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create listing");

      toast.success("Listing created!");
      setTitle("");
      setDescription("");
      setPriceRlusd("");
      setCreditLimit("");
      setMaxPurchases("");
      onCreated?.();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sell API Access</CardTitle>
        <CardDescription>
          Buyers pay RLUSD to get an API key backed by your INFX credit balance.
          Their usage is billed against your credits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. GPT-4o Mini Access Pass"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="What does this access include?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Price (RLUSD)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="5.00"
              value={priceRlusd}
              onChange={(e) => setPriceRlusd(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Buyer pays this amount in RLUSD to receive a key.</p>
          </div>
          <div className="space-y-2">
            <Label>Credit limit per key <span className="text-muted-foreground">(0 = unlimited)</span></Label>
            <Input
              type="number"
              min="0"
              placeholder="1000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Max INFX credits a buyer can consume via this key.</p>
          </div>
          <div className="space-y-2">
            <Label>Max purchases <span className="text-muted-foreground">(0 = unlimited)</span></Label>
            <Input
              type="number"
              min="0"
              placeholder="10"
              value={maxPurchases}
              onChange={(e) => setMaxPurchases(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !sessionToken}>
            {submitting ? "Creating..." : "Create Listing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
