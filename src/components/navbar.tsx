"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/deposit", label: "Deposit" },
];

export function Navbar() {
  const { address, connected, connect, disconnect, isConnecting } = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_24px_rgba(99,102,241,0.7)] transition-shadow duration-300">
                <Logo size={28} />
              </div>
              <span className="font-semibold text-white text-sm">onchain</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                      active
                        ? "text-white bg-white/[0.08]"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {connected && address ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="font-mono text-xs text-white/60">
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                  className="border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-white/60 hover:text-white/80 text-xs h-8"
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={connect}
                disabled={isConnecting}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 text-xs h-8 px-4 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_28px_rgba(99,102,241,0.6)] transition-shadow duration-300"
              >
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
