import { useMemo, useState } from "react";
import type { Address } from "viem";
import { CONTRACT_ADDRESS, waitAccepted, waitFinalized } from "../lib/contract";
import type { ActivityItem, EvidenceType, ProofTask } from "../types/task";
import { asNumber } from "../lib/format";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ActionPanel({
  selectedTask,
  writeClient,
  onRefresh,
  pushActivity,
}: {
  selectedTask: ProofTask | null;
  writeClient: any;
  onRefresh: () => Promise<void>;
  pushActivity: (item: ActivityItem) => void;
}) {
  const [title, setTitle] = useState("Patch the README oath");
  const [description, setDescription] = useState("Submit concise proof that the requested work is complete.");
  const [criteria, setCriteria] = useState("The proof must clearly satisfy the requested task.");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("TEXT_SUBMISSION");
  const [reward, setReward] = useState("1");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("done");
  const [isBusy, setIsBusy] = useState(false);

  const selectedId = useMemo(() => selectedTask ? asNumber(selectedTask.task_id) : 0, [selectedTask]);

  async function run(label: string, fn: () => Promise<`0x${string}`>, waitMode: "accepted" | "finalized" = "accepted") {
    if (!writeClient) throw new Error("Connect wallet first.");
    setIsBusy(true);
    try {
      const hash = await fn();
      pushActivity({ id: newId(), label, detail: `submitted; waiting for ${waitMode}`, hash, tone: "warn" });
      if (waitMode === "finalized") {
        await waitFinalized(hash);
      } else {
        await waitAccepted(hash);
      }
      pushActivity({ id: newId(), label, detail: `${waitMode.toUpperCase()} by Studionet`, hash, tone: "good" });
      await onRefresh();
    } catch (err) {
      pushActivity({ id: newId(), label, detail: err instanceof Error ? err.message : String(err), tone: "bad" });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="action-panel">
      <div className="action-tabs">
        <span>file work</span>
        <span>prove work</span>
        <span>settle work</span>
      </div>

      <div className="form-slab create-slab">
        <h2>Create escrow case</h2>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label>Acceptance criteria<textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} /></label>
        <div className="form-row">
          <label>Evidence<select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}>
            <option value="TEXT_SUBMISSION">TEXT_SUBMISSION</option>
            <option value="GITHUB_PR">GITHUB_PR</option>
            <option value="URL_DOCUMENT">URL_DOCUMENT</option>
          </select></label>
          <label>Reward, tiny test unit<input value={reward} onChange={(e) => setReward(e.target.value)} inputMode="numeric" /></label>
        </div>
        <button disabled={isBusy || !writeClient} onClick={() => run("create_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "create_task",
          args: [title, description, criteria, evidenceType, 0, ""],
          value: BigInt(reward || "0"),
        }))}>Seal new case</button>
      </div>

      <div className="form-slab">
        <h2>Submit proof</h2>
        <p className="selected-note">Selected case: {selectedId ? `#${selectedId}` : "none"}</p>
        <label>Proof URL<input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://github.com/org/repo/pull/1" /></label>
        <label>Proof text<textarea value={proofText} onChange={(e) => setProofText(e.target.value)} /></label>
        <button disabled={isBusy || !writeClient || !selectedId} onClick={() => run("submit_proof", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "submit_proof",
          args: [selectedId, proofUrl, proofText],
          value: 0n,
        }))}>Submit evidence</button>
      </div>

      <div className="settlement-row">
        <button disabled={isBusy || !writeClient || !selectedId} onClick={() => run("evaluate_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "evaluate_task",
          args: [selectedId],
          value: 0n,
        }))}>Run AI jury</button>
        <button disabled={isBusy || !writeClient || !selectedId} onClick={() => run("finalize_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "finalize_task",
          args: [selectedId],
          value: 0n,
        }), "finalized")}>Finalize payout</button>
        <button disabled={isBusy || !writeClient || !selectedId} onClick={() => run("cancel_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "cancel_task",
          args: [selectedId],
          value: 0n,
        }), "finalized")}>Cancel + refund</button>
      </div>
    </section>
  );
}
