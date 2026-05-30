import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Address } from "viem";
import type { EscrowSummary, ProofTask } from "../types/task";

export const DEFAULT_CONTRACT_ADDRESS = "0x5E992bBc2De02C3878d2623A7C3bEc9603aB651A" as Address;
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS) as Address;

export const readClient = createClient({ chain: studionet });

export function makeWriteClient(account: Address, provider: unknown) {
  return createClient({
    chain: studionet,
    account,
    provider: provider as any,
  });
}

export async function readTaskCount(): Promise<number> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_task_count",
    args: [],
  });
  return Number(result);
}

export async function readTask(taskId: number): Promise<ProofTask> {
  return (await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_task",
    args: [taskId],
  })) as unknown as ProofTask;
}

export async function readSummary(): Promise<EscrowSummary> {
  return (await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_escrow_summary",
    args: [],
  })) as unknown as EscrowSummary;
}

export async function readAllTasks(): Promise<ProofTask[]> {
  const count = await readTaskCount();
  if (count <= 0) return [];
  const ids = Array.from({ length: count }, (_, index) => index + 1);
  const tasks = await Promise.all(ids.map((id) => readTask(id).catch(() => null)));
  return tasks.filter(Boolean) as ProofTask[];
}

export async function waitAccepted(hash: `0x${string}`) {
  return readClient.waitForTransactionReceipt({
    hash: hash as any,
    status: TransactionStatus.ACCEPTED,
    retries: 80,
    interval: 3000,
  });
}

export async function waitFinalized(hash: `0x${string}`) {
  return readClient.waitForTransactionReceipt({
    hash: hash as any,
    status: TransactionStatus.FINALIZED,
    retries: 120,
    interval: 3000,
  });
}
