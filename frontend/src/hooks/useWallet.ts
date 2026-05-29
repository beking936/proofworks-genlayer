import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import { makeWriteClient } from "../lib/contract";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  const provider = typeof window !== "undefined" ? window.ethereum : undefined;

  const writeClient = useMemo(() => {
    if (!address || !provider) return null;
    return makeWriteClient(address, provider);
  }, [address, provider]);

  const connect = useCallback(async () => {
    setError("");
    setIsConnecting(true);
    try {
      if (!provider) throw new Error("No injected wallet found. Open in a browser with MetaMask or use GenLayer Studio wallet.");
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
      if (!accounts?.[0]) throw new Error("Wallet did not return an account.");
      setAddress(accounts[0]);
      try {
        const client = makeWriteClient(accounts[0], provider);
        await client.connect("studionet");
      } catch (networkError) {
        console.warn("Network switch warning", networkError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  return {
    address,
    error,
    isConnecting,
    isConnected: Boolean(address),
    writeClient,
    connect,
  };
}
