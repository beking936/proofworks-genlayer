import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
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

type BurnerRole = "creator" | "worker" | "juror1" | "juror2" | "juror3";

type BurnerState = {
  creatorKey: `0x${string}`;
  workerKey: `0x${string}`;
  role: BurnerRole;
};

const STORAGE_KEY = "proofworks.burners.v1";

function loadBurners(): BurnerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BurnerState;
    if (!parsed.creatorKey || !parsed.workerKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveBurners(state: BurnerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useWallet() {
  const [injectedAddress, setInjectedAddress] = useState<Address | null>(null);
  const [burners, setBurners] = useState<BurnerState | null>(() => (typeof window === "undefined" ? null : loadBurners()));
  const [mode, setMode] = useState<"none" | "injected" | "burner">(() => (typeof window !== "undefined" && loadBurners() ? "burner" : "none"));
  const [error, setError] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  const provider = typeof window !== "undefined" ? window.ethereum : undefined;

  const burnerAccount = useMemo(() => {
    if (!burners) return null;
    let key = burners.role === "creator" ? burners.creatorKey : burners.role === "worker" ? burners.workerKey : "";
    if (burners.role === "juror1") key = "0x9ad5e99107f67bc00c2b2459a9cb269dc2a4d831d3e61f262a7f6d0ec829db50";
    else if (burners.role === "juror2") key = "0xadcf89da46bfd377f2177157380b2245fc6d1988b4002aeffb290af38eb9e805";
    else if (burners.role === "juror3") key = "0x95318e4e48ceadbcb753ddad3b0679f221fcc2bfe78382ba3a6d13cf06b60d88";
    return createAccount(key as `0x${string}`);
  }, [burners]);

  const address = useMemo<Address | null>(() => {
    if (mode === "burner") return (burnerAccount?.address ?? null) as Address | null;
    if (mode === "injected") return injectedAddress;
    return null;
  }, [mode, burnerAccount, injectedAddress]);

  const writeClient = useMemo(() => {
    if (mode === "burner" && burnerAccount) {
      return createClient({ chain: studionet, account: burnerAccount });
    }
    if (mode === "injected" && injectedAddress && provider) {
      return makeWriteClient(injectedAddress, provider);
    }
    return null;
  }, [mode, burnerAccount, injectedAddress, provider]);

  const connect = useCallback(async () => {
    setError("");
    setIsConnecting(true);
    try {
      if (!provider) throw new Error("No injected wallet found. Use free burner mode instead.");
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
      if (!accounts?.[0]) throw new Error("Wallet did not return an account.");
      setInjectedAddress(accounts[0]);
      setMode("injected");
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

  const useBurners = useCallback(() => {
    const existing = loadBurners();
    const next = existing ?? {
      creatorKey: generatePrivateKey(),
      workerKey: generatePrivateKey(),
      role: "creator" as BurnerRole,
    };
    saveBurners(next);
    setBurners(next);
    setMode("burner");
    setError("");
  }, []);

  const resetBurners = useCallback(() => {
    const next = {
      creatorKey: generatePrivateKey(),
      workerKey: generatePrivateKey(),
      role: "creator" as BurnerRole,
    };
    saveBurners(next);
    setBurners(next);
    setMode("burner");
  }, []);

  const setBurnerRole = useCallback((role: BurnerRole) => {
    setBurners((current) => {
      const base = current ?? {
        creatorKey: generatePrivateKey(),
        workerKey: generatePrivateKey(),
        role,
      };
      const next = { ...base, role };
      saveBurners(next);
      return next;
    });
    setMode("burner");
  }, []);

  const creatorAddress = burners ? createAccount(burners.creatorKey).address : null;
  const workerAddress = burners ? createAccount(burners.workerKey).address : null;

  return {
    address,
    error,
    isConnecting,
    isConnected: Boolean(address),
    writeClient,
    connect,
    mode,
    burners,
    burnerRole: burners?.role ?? "creator",
    creatorAddress,
    workerAddress,
    useBurners,
    resetBurners,
    setBurnerRole,
  };
}
