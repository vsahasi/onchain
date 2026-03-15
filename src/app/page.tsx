"use client";

import { useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import { WalletConnect } from "@/components/wallet-connect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO = {
  ifxBalance: 24750,
  rlusdBalance: 847.32,
  xrpBalance: 18.54,
  totalRequests: 1247,
  creditsUsed: 3820,
  activeKeys: 3,
  activeListings: 2,
  recentActivity: [
    { model: "gpt-4o",      prompt: 1024, completion: 512, credits: 18, ago: "2m ago" },
    { model: "gpt-4.1-mini",prompt: 512,  completion: 256, credits: 6,  ago: "7m ago" },
    { model: "gpt-4o-mini", prompt: 2048, completion: 800, credits: 12, ago: "23m ago" },
    { model: "gpt-4.1",     prompt: 768,  completion: 400, credits: 22, ago: "1h ago" },
    { model: "gpt-4o-mini", prompt: 300,  completion: 180, credits: 4,  ago: "2h ago" },
  ],
};

const MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"];

function StatCard({
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  delay?: number;
}) {
  return (
    <div
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 overflow-hidden group hover:border-white/[0.12] transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${accent}`} />
      <div className="animate-shimmer absolute inset-0" />
      <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { connected, address, apiKey } = useWallet();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!connected) return <WalletConnect />;

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mesh-bg min-h-screen -mt-8 pt-10 pb-16 px-1">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-glow-pulse shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
          <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Live · XRPL Testnet</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-white/40 mt-1 text-sm">
          {address ? (
            <span className="font-mono">{address.slice(0, 8)}…{address.slice(-6)}</span>
          ) : "Wallet connected"}
        </p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="IFX Credits"
          value={DEMO.ifxBalance.toLocaleString()}
          sub={`≈ $${(DEMO.ifxBalance / 100).toFixed(2)} USD`}
          accent="bg-gradient-to-br from-indigo-500/10 to-transparent"
          delay={0}
        />
        <StatCard
          label="RLUSD Balance"
          value={`$${DEMO.rlusdBalance.toFixed(2)}`}
          sub="Ripple USD stablecoin"
          accent="bg-gradient-to-br from-violet-500/10 to-transparent"
          delay={60}
        />
        <StatCard
          label="Total Requests"
          value={DEMO.totalRequests.toLocaleString()}
          sub={`${DEMO.creditsUsed.toLocaleString()} credits used`}
          accent="bg-gradient-to-br from-sky-500/10 to-transparent"
          delay={120}
        />
        <StatCard
          label="Active Keys"
          value={String(DEMO.activeKeys)}
          sub={`${DEMO.activeListings} marketplace listings`}
          accent="bg-gradient-to-br from-emerald-500/10 to-transparent"
          delay={180}
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* API Config — spans 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">API Configuration</h2>
              <p className="text-xs text-white/40 mt-0.5">Drop-in replacement for OpenAI SDK</p>
            </div>
            <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/20 text-xs">OpenAI Compatible</Badge>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">Base URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 border border-white/[0.06] px-3 py-2.5 rounded-xl text-xs font-mono text-white/70 truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "https://onchain-seven.vercel.app/api/v1"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "", "url")}
                  className="shrink-0 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/60 text-xs"
                >
                  {copied === "url" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-1.5 font-medium uppercase tracking-wider">API Key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 border border-white/[0.06] px-3 py-2.5 rounded-xl text-xs font-mono text-white/70 truncate">
                  {showKey ? (apiKey ?? "infx_demo_••••••••••••••••") : `${(apiKey ?? "infx_demo_key").slice(0, 12)}${"•".repeat(24)}`}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                  className="shrink-0 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/60 text-xs"
                >
                  {showKey ? "Hide" : "Show"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(apiKey ?? "", "key")}
                  className="shrink-0 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/60 text-xs"
                >
                  {copied === "key" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>

          {/* Code snippet */}
          <div className="mt-4 bg-black/40 border border-white/[0.05] rounded-xl p-4 overflow-x-auto">
            <pre className="text-xs font-mono leading-relaxed">
              <span className="text-white/30">from </span><span className="text-indigo-300">openai</span><span className="text-white/30"> import </span><span className="text-white/70">OpenAI{"\n\n"}</span>
              <span className="text-white/50">client</span><span className="text-white/30"> = </span><span className="text-indigo-300">OpenAI</span><span className="text-white/70">({"\n"}</span>
              <span className="text-white/70">{"    "}</span><span className="text-emerald-300/70">base_url</span><span className="text-white/30">=</span><span className="text-amber-300/70">&quot;https://onchain-seven.vercel.app/api/v1&quot;</span><span className="text-white/70">,{"\n"}</span>
              <span className="text-white/70">{"    "}</span><span className="text-emerald-300/70">api_key</span><span className="text-white/30">=</span><span className="text-amber-300/70">&quot;your-infx-key&quot;{"\n"}</span>
              <span className="text-white/70">){"\n\n"}</span>
              <span className="text-white/50">resp</span><span className="text-white/30"> = </span><span className="text-white/50">client.chat.completions.</span><span className="text-indigo-300">create</span><span className="text-white/70">({"\n"}</span>
              <span className="text-white/70">{"    "}</span><span className="text-emerald-300/70">model</span><span className="text-white/30">=</span><span className="text-amber-300/70">&quot;gpt-4o-mini&quot;</span><span className="text-white/70">,{"\n"}</span>
              <span className="text-white/70">{"    "}</span><span className="text-emerald-300/70">messages</span><span className="text-white/30">=[</span><span className="text-white/50">{`{`}&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Hello!&quot;{`}`}</span><span className="text-white/30">]{"\n"}</span>
              <span className="text-white/70">)</span>
            </pre>
          </div>
        </div>

        {/* Right column — Actions + Models */}
        <div className="flex flex-col gap-4">
          {/* Quick actions */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            <h2 className="text-base font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: "/deposit", icon: "↑", label: "Deposit XRP", sub: "Earn IFX credits", color: "text-indigo-400 bg-indigo-500/10" },
                { href: "/marketplace", icon: "⇄", label: "Marketplace", sub: "Buy or sell API access", color: "text-violet-400 bg-violet-500/10" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.04] transition-all duration-200 group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${a.color}`}>{a.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{a.label}</p>
                    <p className="text-xs text-white/30">{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Models */}
          <div className="flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 animate-fade-in-up" style={{ animationDelay: "360ms" }}>
            <h2 className="text-base font-semibold text-white mb-1">Available Models</h2>
            <p className="text-xs text-white/30 mb-4">OpenAI-compatible endpoints</p>
            <div className="space-y-2">
              {MODELS.map((m, i) => (
                <div key={m} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                    <span className="text-sm font-mono text-white/70">{m}</span>
                  </div>
                  <span className="text-xs text-white/25">{[18, 6, 22, 8, 3][i]}cr/req</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity — full width */}
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 animate-fade-in-up" style={{ animationDelay: "420ms" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Recent Activity</h2>
              <p className="text-xs text-white/40 mt-0.5">Last 5 API calls across all keys</p>
            </div>
            <Link href="/usage">
              <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white/70">
                View all →
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {["Model", "Prompt", "Completion", "Credits", "Time"].map((h) => (
                    <th key={h} className="text-left pb-3 text-xs font-medium text-white/25 uppercase tracking-wider pr-6 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO.recentActivity.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-6">
                      <span className="font-mono text-sm text-white/80">{row.model}</span>
                    </td>
                    <td className="py-3 pr-6 text-sm text-white/40 tabular-nums">{row.prompt.toLocaleString()}</td>
                    <td className="py-3 pr-6 text-sm text-white/40 tabular-nums">{row.completion.toLocaleString()}</td>
                    <td className="py-3 pr-6">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-300">
                        <span className="text-indigo-400/60 text-xs">−</span>{row.credits}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-white/25">{row.ago}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
