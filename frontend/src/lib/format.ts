export function asNumber(value: number | bigint | string | undefined | null): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(value);
}

export function shortAddress(address?: string): string {
  if (!address) return "—";
  if (address === "0x0000000000000000000000000000000000000000") return "unassigned";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash?: string): string {
  if (!hash) return "";
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function formatTinyGen(value: number | bigint | string | undefined | null): string {
  const n = asNumber(value);
  return `${n.toLocaleString()} wei`;
}

export function statusTone(status: string): "good" | "warn" | "bad" | "neutral" {
  if (["APPROVED", "PAID", "PARTIALLY_PAID"].includes(status)) return "good";
  if (["SUBMITTED", "CLAIMED", "PARTIAL", "NEEDS_REVISION"].includes(status)) return "warn";
  if (["REJECTED", "REFUNDED", "CANCELED"].includes(status)) return "bad";
  return "neutral";
}

export function blockExplorer(hashOrAddress: string, kind: "tx" | "address" = "tx") {
  // Studionet explorer paths may change; this keeps links centralized.
  const base = "https://explorer-studio.genlayer.com";
  return kind === "tx" ? `${base}/transactions/${hashOrAddress}` : `${base}/address/${hashOrAddress}`;
}
