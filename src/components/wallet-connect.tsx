"use client";

import { useWallet } from "@/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const FEATURES = [
  { icon: "⚡", label: "Inference Credits", desc: "IFX tokens on XRPL" },
  { icon: "⇄", label: "API Marketplace", desc: "Buy & sell AI access" },
  { icon: "🔗", label: "On-chain Payments", desc: "RLUSD & XRP settlement" },
];

export function WalletConnect() {
  const { connect, isConnecting } = useWallet();

  return (
    <div className="mesh-bg flex items-center justify-center min-h-[80vh] -mt-8 pt-8">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="relative shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            <Logo size={80} />
            <div className="absolute -inset-2 opacity-30 blur-md animate-glow-pulse bg-indigo-500/40 rounded-lg" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Welcome to onchain</h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
            Tokenized AI inference credits on the XRP Ledger. Deploy, trade, and monetize LLM access on-chain.
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {FEATURES.map((f) => (
            <div key={f.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <div className="text-xl mb-1.5">{f.icon}</div>
              <p className="text-xs font-medium text-white/70">{f.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white border-0 text-sm font-semibold shadow-[0_0_30px_rgba(99,102,241,0.45)] hover:shadow-[0_0_40px_rgba(99,102,241,0.65)] transition-all duration-300"
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting…
              </span>
            ) : (
              "Connect XRPL Wallet"
            )}
          </Button>
          <p className="text-center text-[11px] text-white/20">
            Supports Crossmark · Manual address entry available for testing
          </p>
        </div>
      </div>
    </div>
  );
}
