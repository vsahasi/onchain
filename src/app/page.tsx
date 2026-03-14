"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/providers/wallet-provider";

interface DashboardData {
  balance: number;
  recentActivity: Array<{
    id: string;
    tx_type: string;
    amount: string;
    xrpl_tx_hash: string;
    created_at: string;
  }>;
  usageToday: number;
}

export default function Dashboard() {
  const { address, token } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/credits/balance", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setData({ balance: d.balance, recentActivity: [], usageToday: 0 }));
    fetch("/api/keys", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []));
  }, [token]);

  async function createKey() {
    if (!token) return;
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newKeyName || "My Key" }),
    });
    const d = await res.json();
    setCreatedKey(d.key);
    setKeys((prev) => [{ key_prefix: d.prefix, name: newKeyName || "My Key", is_active: true, created_at: new Date().toISOString() }, ...prev]);
  }

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <h1 className="text-3xl font-bold">INFX Inference Credits</h1>
        <p className="text-zinc-400 max-w-md text-center">
          Tokenized AI inference credits on XRPL. Deposit RLUSD, trade on the DEX,
          and use credits via an OpenAI-compatible API.
        </p>
        <div className="flex gap-3 mt-4">
          <Link href="/marketplace" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-md text-sm transition-colors">
            View Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800">
          <p className="text-zinc-400 text-sm">INFX Balance</p>
          <p className="text-3xl font-bold mt-1">{data?.balance.toLocaleString() ?? "—"}</p>
          <p className="text-zinc-500 text-xs mt-1">credits</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800">
          <p className="text-zinc-400 text-sm">Wallet</p>
          <p className="text-sm font-mono mt-2 break-all text-zinc-300">{address}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 flex flex-col gap-2">
          <p className="text-zinc-400 text-sm">Quick Actions</p>
          <Link href="/deposit" className="text-indigo-400 hover:text-indigo-300 text-sm">+ Deposit RLUSD</Link>
          <Link href="/marketplace" className="text-indigo-400 hover:text-indigo-300 text-sm">Trade on DEX</Link>
          <Link href="/usage" className="text-indigo-400 hover:text-indigo-300 text-sm">View Usage</Link>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 space-y-4">
        <h2 className="font-semibold">API Keys</h2>

        {createdKey && (
          <div className="bg-green-950 border border-green-800 rounded p-3 text-sm">
            <p className="text-green-400 font-semibold mb-1">Key created — save it now, it won't be shown again:</p>
            <code className="text-green-300 break-all">{createdKey}</code>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Key name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm flex-1 outline-none focus:border-indigo-500"
          />
          <button
            onClick={createKey}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-sm transition-colors"
          >
            Generate
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="text-zinc-500 text-sm">No keys yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2">Prefix</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {keys.map((k, i) => (
                <tr key={i}>
                  <td className="py-2">{k.name}</td>
                  <td className="py-2 font-mono text-zinc-400">{k.key_prefix}...</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.is_active ? "bg-green-900 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {k.is_active ? "active" : "revoked"}
                    </span>
                  </td>
                  <td className="py-2 text-zinc-500 text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="pt-2 border-t border-zinc-800">
          <p className="text-zinc-500 text-xs">Base URL: <code className="text-zinc-400">/api/v1</code> — OpenAI-compatible</p>
        </div>
      </div>
    </div>
  );
}
