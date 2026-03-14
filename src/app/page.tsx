"use client";

import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { CreditBalance } from "@/components/credit-balance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";

interface UsageEntry {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  credits_used: number;
  created_at: string;
}

export default function DashboardPage() {
  const { connected, address, apiKey } = useWallet();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!connected) {
    return <WalletConnect />;
  }

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyBaseUrl =() => {
    navigator.clipboard.writeText(`${window.location.origin}/api/v1`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your inference credits and API access
        </p>
      </div>

      <CreditBalance />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Configuration</CardTitle>
            <CardDescription>
              Use these credentials to access AI models through the InferX
              gateway. Compatible with the OpenAI SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono truncate">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/v1`
                    : "/api/v1"}
                </code>
                <Button variant="outline" size="sm" onClick={copyBaseUrl}>
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">API Key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono truncate">
                  {showKey
                    ? apiKey
                    : apiKey
                      ? `${apiKey.slice(0, 12)}${"•".repeat(20)}`
                      : "No key available"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "Hide" : "Show"}
                </Button>
                <Button variant="outline" size="sm" onClick={copyApiKey}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Quick Start</p>
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
{`from openai import OpenAI

client = OpenAI(
    base_url="${typeof window !== "undefined" ? window.location.origin : ""}/api/v1",
    api_key="your-infx-api-key"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Get started with InferX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/deposit" className="block">
              <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
                  $
                </div>
                <div>
                  <p className="font-medium text-sm">Deposit RLUSD</p>
                  <p className="text-xs text-muted-foreground">
                    Convert RLUSD stablecoin to IFX credits
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/marketplace" className="block">
              <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
                  ↔
                </div>
                <div>
                  <p className="font-medium text-sm">Trade Credits</p>
                  <p className="text-xs text-muted-foreground">
                    Buy or sell IFX at a discount on the XRPL DEX
                  </p>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold">
                ⚡
              </div>
              <div>
                <p className="font-medium text-sm">Available Models</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"].map(
                    (model) => (
                      <Badge key={model} variant="secondary" className="text-xs">
                        {model}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold">
                ◈
              </div>
              <div>
                <p className="font-medium text-sm">XRPL Network</p>
                <p className="text-xs text-muted-foreground">
                  Connected to XRPL Testnet
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {address?.slice(0, 10)}...{address?.slice(-6)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
