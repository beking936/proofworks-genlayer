import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Address } from "viem";
import type { EscrowSummary, ProofTask } from "../types/task";
import type { Milestone } from "../types/milestone";

export const DEFAULT_CONTRACT_ADDRESS = "0x541031b4574cDE16c93c2b580Bc1Da763a3efbc7" as Address;
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


export async function readMilestone(taskId: number, milestoneIndex: number): Promise<Milestone> {
  return (await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_milestone",
    args: [taskId, milestoneIndex],
  })) as unknown as Milestone;
}

export async function readTaskMilestones(task: ProofTask): Promise<Milestone[]> {
  const count = Number((task as any).milestone_count ?? 0);
  if (!task || !(task as any).is_milestone_task || count <= 0) return [];
  const indexes = Array.from({ length: count }, (_, i) => i + 1);
  const milestones = await Promise.all(indexes.map((i) => readMilestone(Number(task.task_id), i).catch(() => null)));
  return milestones.filter(Boolean) as Milestone[];
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
