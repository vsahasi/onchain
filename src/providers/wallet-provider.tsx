"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import sdk from "@crossmarkio/sdk";

interface WalletContextValue {
  address: string | null;
  token: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("infx_token");
    const savedAddress = localStorage.getItem("infx_address");
    if (savedToken && savedAddress) {
      setToken(savedToken);
      setAddress(savedAddress);
    }
  }, []);

  const connect = useCallback(async () => {
    // Check Crossmark is installed
    if (!(window as any).crossmark) {
      alert("Crossmark wallet not found. Install the Crossmark browser extension first.");
      return;
    }

    setIsConnecting(true);
    try {
      // Wrap in a timeout so we never hang forever
      const withTimeout = <T,>(promise: Promise<T>, ms = 30000): Promise<T> => {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Wallet request timed out")), ms)
        );
        return Promise.race([promise, timeout]);
      };

      const signInResult = await withTimeout(sdk.methods.signInAndWait());
      const addr = (signInResult as any)?.response?.data?.address;
      if (!addr) throw new Error("No address returned from wallet");

      // Auth against backend (signIn itself proves ownership for MVP)
      const nonceRes = await fetch(`/api/auth?address=${addr}`);
      const { nonce } = await nonceRes.json();

      const authRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, nonce, signature: "signIn:" + addr }),
      });

      const { token: jwt } = await authRes.json();
      if (!jwt) throw new Error("Auth failed");

      setAddress(addr);
      setToken(jwt);
      localStorage.setItem("infx_token", jwt);
      localStorage.setItem("infx_address", addr);
    } catch (err: any) {
      console.error("Wallet connect failed:", err);
      alert(err.message ?? "Wallet connect failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setToken(null);
    localStorage.removeItem("infx_token");
    localStorage.removeItem("infx_address");
  }, []);

  return (
    <WalletContext.Provider value={{ address, token, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
