"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/providers/wallet-provider";
import sdk from "@crossmarkio/sdk";

interface OrderEntry {
  account: string;
  takerGets: any;
  takerPays: any;
  sequence: number;
  quality: string;
}

function formatAmount(amount: any): string {
  if (typeof amount === "string") return `${(parseInt(amount) / 1_000_000).toFixed(2)} XRP`;
  return `${parseFloat(amount.value).toLocaleString()} ${amount.currency}`;
}

export default function MarketplacePage() {
  const { address } = useWallet();
  const [orderbook, setOrderbook] = useState<{ asks: OrderEntry[]; bids: OrderEntry[] }>({ asks: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [sellINFX, setSellINFX] = useState("");
  const [sellRLUSD, setSellRLUSD] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);

  async function fetchOrderbook() {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace");
      const data = await res.json();
      setOrderbook({ asks: data.asks ?? [], bids: data.bids ?? [] });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrderbook();
    const interval = setInterval(fetchOrderbook, 15000);
    return () => clearInterval(interval);
  }, []);

  async function createOffer() {
    if (!address || !sellINFX || !sellRLUSD) return;
    setTxStatus("Building transaction...");

    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ takerGetsINFX: sellINFX, takerPaysRLUSD: sellRLUSD }),
      });
      const { tx } = await res.json();

      setTxStatus("Waiting for wallet signature...");
      const result = await sdk.methods.signAndSubmitAndWait({ ...tx, Account: address });

      if ((result?.response?.data?.meta as any)?.TransactionResult === "tesSUCCESS") {
        setTxStatus("Offer created successfully!");
        fetchOrderbook();
      } else {
        setTxStatus("Transaction failed. Check wallet.");
      }
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">INFX / RLUSD Marketplace</h1>
        <button onClick={fetchOrderbook} className="text-zinc-400 hover:text-white text-sm transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asks */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-red-400 mb-3">Asks (Selling INFX)</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : orderbook.asks.length === 0 ? (
            <p className="text-zinc-500 text-sm">No asks</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="pb-2">INFX</th>
                  <th className="pb-2">RLUSD</th>
                  <th className="pb-2">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orderbook.asks.slice(0, 10).map((ask, i) => (
                  <tr key={i} className="text-zinc-300">
                    <td className="py-1.5">{formatAmount(ask.takerGets)}</td>
                    <td className="py-1.5">{formatAmount(ask.takerPays)}</td>
                    <td className="py-1.5 text-zinc-500 text-xs">{parseFloat(ask.quality).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bids */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-green-400 mb-3">Bids (Buying INFX)</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : orderbook.bids.length === 0 ? (
            <p className="text-zinc-500 text-sm">No bids</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-left">
                  <th className="pb-2">RLUSD</th>
                  <th className="pb-2">INFX</th>
                  <th className="pb-2">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orderbook.bids.slice(0, 10).map((bid, i) => (
                  <tr key={i} className="text-zinc-300">
                    <td className="py-1.5">{formatAmount(bid.takerGets)}</td>
                    <td className="py-1.5">{formatAmount(bid.takerPays)}</td>
                    <td className="py-1.5 text-zinc-500 text-xs">{parseFloat(bid.quality).toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create offer */}
      {address && (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5 space-y-4">
          <h2 className="font-semibold">Create Offer</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">INFX to sell</label>
              <input
                type="number"
                value={sellINFX}
                onChange={(e) => setSellINFX(e.target.value)}
                placeholder="10000"
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-full outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">RLUSD asking price</label>
              <input
                type="number"
                value={sellRLUSD}
                onChange={(e) => setSellRLUSD(e.target.value)}
                placeholder="80"
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-full outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          {sellINFX && sellRLUSD && (
            <p className="text-zinc-400 text-xs">
              Discount: {(((parseFloat(sellINFX) / 100) - parseFloat(sellRLUSD)) / (parseFloat(sellINFX) / 100) * 100).toFixed(1)}% off face value
            </p>
          )}
          <button
            onClick={createOffer}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded text-sm transition-colors"
          >
            Submit Offer
          </button>
          {txStatus && <p className="text-zinc-400 text-sm">{txStatus}</p>}
        </div>
      )}
    </div>
  );
}
