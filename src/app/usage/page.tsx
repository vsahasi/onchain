"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";

interface UsageLog {
  id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  credits_used: number;
  upstream_provider: string;
  created_at: string;
}

export default function UsagePage() {
  const { token } = useWallet();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/usage", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const totalCredits = logs.reduce((s, l) => s + l.credits_used, 0);
  const totalTokens = logs.reduce((s, l) => s + l.prompt_tokens + l.completion_tokens, 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Usage Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <p className="text-zinc-400 text-sm">Total Requests</p>
          <p className="text-3xl font-bold mt-1">{logs.length.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <p className="text-zinc-400 text-sm">Credits Used</p>
          <p className="text-3xl font-bold mt-1">{totalCredits.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <p className="text-zinc-400 text-sm">Total Tokens</p>
          <p className="text-3xl font-bold mt-1">{totalTokens.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
        <h2 className="font-semibold mb-4">Request History</h2>
        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No usage yet. Make your first API call.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Prompt</th>
                  <th className="pb-2 pr-4">Completion</th>
                  <th className="pb-2">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {logs.map((log) => (
                  <tr key={log.id} className="text-zinc-300">
                    <td className="py-2 pr-4 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{log.model}</td>
                    <td className="py-2 pr-4">{log.prompt_tokens.toLocaleString()}</td>
                    <td className="py-2 pr-4">{log.completion_tokens.toLocaleString()}</td>
                    <td className="py-2 font-semibold text-indigo-400">{log.credits_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
