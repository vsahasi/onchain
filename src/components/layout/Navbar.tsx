"use client";

import Link from "next/link";
import { useWallet } from "@/providers/wallet-provider";

export default function Navbar() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-white font-semibold text-lg tracking-tight">
          INFX
        </Link>
        <Link href="/marketplace" className="text-zinc-400 hover:text-white text-sm transition-colors">
          Marketplace
        </Link>
        <Link href="/deposit" className="text-zinc-400 hover:text-white text-sm transition-colors">
          Deposit
        </Link>
        <Link href="/usage" className="text-zinc-400 hover:text-white text-sm transition-colors">
          Usage
        </Link>
      </div>

      <div>
        {address ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-xs font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <button
              onClick={disconnect}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-md transition-colors"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}
