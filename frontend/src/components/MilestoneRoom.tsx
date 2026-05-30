import { useEffect, useState } from "react";
import type { ProofTask, ActivityItem } from "../types/task";
import type { Milestone } from "../types/milestone";
import { CONTRACT_ADDRESS, readTaskMilestones, waitAccepted, waitFinalized } from "../lib/contract";
import { asNumber, formatTinyGen, statusTone } from "../lib/format";
import type { Address } from "viem";

function id() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function parseMissing(raw: string) { try { const x = JSON.parse(raw || "[]"); return Array.isArray(x) ? x.map(String) : []; } catch { return []; } }

export function MilestoneRoom({ task, writeClient, onRefresh, pushActivity }: { task: ProofTask | null; writeClient: any; onRefresh: () => Promise<void>; pushActivity: (item: ActivityItem) => void; }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [proofByIndex, setProofByIndex] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!task || !(task as any).is_milestone_task) { setMilestones([]); return; }
    readTaskMilestones(task).then((m) => { if (alive) setMilestones(m); });
    return () => { alive = false; };
  }, [task]);

  if (!task || !(task as any).is_milestone_task) return null;

  async function run(label: string, fn: () => Promise<`0x${string}`>, finalized = false) {
    if (!writeClient) throw new Error("Connect wallet first.");
    setBusy(true);
    try {
      const hash = await fn();
      pushActivity({ id: id(), label, detail: finalized ? "submitted; waiting FINALIZED" : "submitted; waiting ACCEPTED", hash, tone: "warn" });
      await (finalized ? waitFinalized(hash) : waitAccepted(hash));
      pushActivity({ id: id(), label, detail: finalized ? "FINALIZED" : "ACCEPTED", hash, tone: "good" });
      await onRefresh();
      if (task) setMilestones(await readTaskMilestones(task));
    } catch (e) {
      pushActivity({ id: id(), label, detail: e instanceof Error ? e.message : String(e), tone: "bad" });
    } finally { setBusy(false); }
  }

  return (
    <section className="milestone-room">
      <div className="milestone-room__head">
        <span>milestone escrow</span>
        <strong>{asNumber((task as any).milestones_finalized)}/{asNumber((task as any).milestone_count)} finalized · {formatTinyGen((task as any).milestone_finalized_amount)} released/refunded</strong>
      </div>
      {milestones.map((m) => {
        const idx = asNumber(m.index);
        const missing = parseMissing(m.missing_requirements);
        const canSubmit = ["OPEN", "CLAIMED", "NEEDS_REVISION"].includes(m.status) && !m.finalized;
        const canEval = m.status === "SUBMITTED" && !m.evaluated;
        const canFinalize = m.evaluated && m.decision !== "NEEDS_REVISION" && !m.finalized;
        return (
          <div className="milestone-card" key={String(m.milestone_id)}>
            <div className="milestone-card__top">
              <b>#{idx} {m.title}</b>
              <span className={`status-pill status-pill--${statusTone(m.status)}`}>{m.status}</span>
            </div>
            <p>{m.acceptance_criteria}</p>
            <small>{asNumber(m.payout_percent_of_task)}% of task escrow · worker {formatTinyGen(m.worker_payout)} · refund {formatTinyGen(m.creator_refund)}</small>
            {m.evaluated ? <div className="milestone-verdict"><strong>{m.decision}</strong><span>{m.reason_code}</span><p>{m.reason}</p>{missing.length ? <ul>{missing.map(x => <li key={x}>{x}</li>)}</ul> : null}</div> : null}
            {canSubmit ? <textarea value={proofByIndex[idx] ?? ""} onChange={(e) => setProofByIndex(v => ({...v, [idx]: e.target.value}))} placeholder="Milestone proof text or notes" /> : null}
            <div className="milestone-actions">
              <button disabled={busy || !writeClient || !canSubmit} onClick={() => run(m.status === "NEEDS_REVISION" ? "resubmit_milestone" : "submit_milestone", () => writeClient.writeContract({ address: CONTRACT_ADDRESS as Address, functionName: m.status === "NEEDS_REVISION" ? "resubmit_milestone_proof" : "submit_milestone_proof", args: [Number(task.task_id), idx, "", proofByIndex[idx] ?? ""], value: 0n }))}>{m.status === "NEEDS_REVISION" ? "Resubmit" : "Submit"}</button>
              <button disabled={busy || !writeClient || !canEval} onClick={() => run("evaluate_milestone", () => writeClient.writeContract({ address: CONTRACT_ADDRESS as Address, functionName: "evaluate_milestone", args: [Number(task.task_id), idx], value: 0n }))}>AI judge</button>
              <button disabled={busy || !writeClient || !canFinalize} onClick={() => run("finalize_milestone", () => writeClient.writeContract({ address: CONTRACT_ADDRESS as Address, functionName: "finalize_milestone", args: [Number(task.task_id), idx], value: 0n }), true)}>Finalize</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
