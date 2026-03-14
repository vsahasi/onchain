"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Client } from "xrpl";

interface XRPLContextValue {
  client: Client | null;
  connected: boolean;
}

const XRPLContext = createContext<XRPLContextValue>({ client: null, connected: false });

export function XRPLProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client(
      process.env.NEXT_PUBLIC_XRPL_NETWORK ?? "wss://s.altnet.rippletest.net:51233"
    );
    clientRef.current = client;
    client.connect().then(() => setConnected(true)).catch(console.error);

    return () => {
      client.disconnect().catch(() => {});
    };
  }, []);

  return (
    <XRPLContext.Provider value={{ client: clientRef.current, connected }}>
      {children}
    </XRPLContext.Provider>
  );
}

export function useXRPL() {
  return useContext(XRPLContext);
}
