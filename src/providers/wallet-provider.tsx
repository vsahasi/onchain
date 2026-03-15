"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WalletState {
  address: string | null;
  connected: boolean;
  sessionToken: string | null;
  apiKey: string | null;
  userId: string | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

const STORAGE_KEY = "onchain_wallet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    sessionToken: null,
    apiKey: null,
    userId: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch {}
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      let walletAddress: string;
      let signature = "crossmark-signed";

      try {
        const crossmark = (window as unknown as Record<string, unknown>).xrpl;
        const crossmarkSdk = (window as unknown as Record<string, { signIn: () => Promise<{ response: { data: { address: string; signature: string } } }> }>).crossmark;

        if (crossmarkSdk) {
          const resp = await crossmarkSdk.signIn();
          walletAddress = resp.response.data.address;
          signature = resp.response.data.signature;
        } else {
          throw new Error("Crossmark not available");
        }
      } catch {
        const addr = prompt(
          "Enter your XRPL wallet address\n(Install Crossmark browser extension for one-click connect)"
        );
        if (!addr) {
          setIsConnecting(false);
          return;
        }
        walletAddress = addr;
        signature = "manual-entry";
      }

      const challengeRes = await fetch("/api/auth");
      const { challenge } = await challengeRes.json();

      const authRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: walletAddress,
          signature,
          challenge,
        }),
      });

      if (!authRes.ok) {
        throw new Error("Authentication failed");
      }

      const authData = await authRes.json();

      const newState: WalletState = {
        address: authData.wallet_address,
        connected: true,
        sessionToken: authData.session_token,
        apiKey: authData.api_key,
        userId: authData.user_id,
      };

      setState(newState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      connected: false,
      sessionToken: null,
      apiKey: null,
      userId: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, isConnecting }}
    >
      {children}
    </WalletContext.Provider>
  );
}
