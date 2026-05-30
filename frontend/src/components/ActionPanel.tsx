import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { CONTRACT_ADDRESS, waitAccepted, waitFinalized } from "../lib/contract";
import type { ActivityItem, EvidenceType, ProofTask } from "../types/task";
import type { BountyDraft } from "../types/github";
import { asNumber } from "../lib/format";

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ActionPanel({
  selectedTask,
  writeClient,
  onRefresh,
  pushActivity,
  draft,
  onDraftConsumed,
}: {
  selectedTask: ProofTask | null;
  writeClient: any;
  onRefresh: () => Promise<void>;
  pushActivity: (item: ActivityItem) => void;
  draft?: BountyDraft | null;
  onDraftConsumed?: () => void;
}) {
  const [title, setTitle] = useState("Patch the README oath");
  const [description, setDescription] = useState("Submit concise proof that the requested work is complete.");
  const [criteria, setCriteria] = useState("The proof must clearly satisfy the requested task.");
  const [sourceType, setSourceType] = useState<"MANUAL" | "GITHUB_ISSUE" | "GITHUB_PR" | "URL_SPEC">("MANUAL");
  const [sourceUrl, setSourceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("TEXT_SUBMISSION");
  const [reward, setReward] = useState("1");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("done");
  const [maxRevisions, setMaxRevisions] = useState("2");
  const [isBusy, setIsBusy] = useState(false);
  const [milestoneMode, setMilestoneMode] = useState(false);
  const [m1Title, setM1Title] = useState("Design");
  const [m1Criteria, setM1Criteria] = useState("Submit design proof");
  const [m1Percent, setM1Percent] = useState("20");
  const [m2Title, setM2Title] = useState("Implementation");
  const [m2Criteria, setM2Criteria] = useState("Submit implementation proof");
  const [m2Percent, setM2Percent] = useState("50");
  const [m3Title, setM3Title] = useState("Tests");
  const [m3Criteria, setM3Criteria] = useState("Submit tests proof");
  const [m3Percent, setM3Percent] = useState("30");

  const selectedId = useMemo(() => selectedTask ? asNumber(selectedTask.task_id) : 0, [selectedTask]);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setDescription(draft.description);
    setCriteria(draft.criteria);
    setSourceType(draft.sourceType);
    setSourceUrl(draft.sourceUrl);
    setEvidenceType(draft.evidenceType);
    setReward(draft.reward);
    setProofUrl(draft.proofUrl);
    setMaxRevisions(draft.maxRevisions);
    onDraftConsumed?.();
  }, [draft, onDraftConsumed]);

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
          <label>Source<select value={sourceType} onChange={(e) => setSourceType(e.target.value as any)}>
            <option value="MANUAL">MANUAL</option>
            <option value="GITHUB_ISSUE">GITHUB_ISSUE</option>
            <option value="GITHUB_PR">GITHUB_PR</option>
            <option value="URL_SPEC">URL_SPEC</option>
          </select></label>
          <label>Evidence<select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}>
            <option value="TEXT_SUBMISSION">TEXT_SUBMISSION</option>
            <option value="GITHUB_PR">GITHUB_PR</option>
            <option value="URL_DOCUMENT">URL_DOCUMENT</option>
          </select></label>
        </div>
        <label>Source URL<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://github.com/org/repo/issues/123" /></label>
        <div className="form-row">
          <label>Reward, tiny test unit<input value={reward} onChange={(e) => setReward(e.target.value)} inputMode="numeric" /></label>
          <label>Max revisions<input value={maxRevisions} onChange={(e) => setMaxRevisions(e.target.value)} inputMode="numeric" /></label>
        </div>
        <label className="checkline"><input type="checkbox" checked={milestoneMode} onChange={(e) => setMilestoneMode(e.target.checked)} /> Milestone escrow mode</label>
        {milestoneMode ? <div className="milestone-form">
          <label>M1 title<input value={m1Title} onChange={(e) => setM1Title(e.target.value)} /></label><label>M1 %<input value={m1Percent} onChange={(e) => setM1Percent(e.target.value)} /></label><label>M1 criteria<textarea value={m1Criteria} onChange={(e) => setM1Criteria(e.target.value)} /></label>
          <label>M2 title<input value={m2Title} onChange={(e) => setM2Title(e.target.value)} /></label><label>M2 %<input value={m2Percent} onChange={(e) => setM2Percent(e.target.value)} /></label><label>M2 criteria<textarea value={m2Criteria} onChange={(e) => setM2Criteria(e.target.value)} /></label>
          <label>M3 title<input value={m3Title} onChange={(e) => setM3Title(e.target.value)} /></label><label>M3 %<input value={m3Percent} onChange={(e) => setM3Percent(e.target.value)} /></label><label>M3 criteria<textarea value={m3Criteria} onChange={(e) => setM3Criteria(e.target.value)} /></label>
        </div> : null}
        <button disabled={isBusy || !writeClient} onClick={() => run(milestoneMode ? "create_milestone_case" : "create_case", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: milestoneMode ? "create_milestone_case" : "create_case",
          args: milestoneMode ? [title, description, criteria, sourceType, sourceUrl, evidenceType, 0, "", Number(maxRevisions || "2"), m1Title, m1Criteria, Number(m1Percent || "0"), m2Title, m2Criteria, Number(m2Percent || "0"), m3Title, m3Criteria, Number(m3Percent || "0")] : [title, description, criteria, sourceType, sourceUrl, evidenceType, 0, "", Number(maxRevisions || "2")],
          value: BigInt(reward || "0"),
        }))}>{milestoneMode ? "Seal milestone case" : "Seal new case"}</button>
      </div>

      <div className="form-slab">
        <h2>Submit proof</h2>
        <p className="selected-note">Selected case: {selectedId ? `#${selectedId}` : "none"}</p>
        <label>Proof URL<input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://github.com/org/repo/pull/1" /></label>
        <label>Proof text<textarea value={proofText} onChange={(e) => setProofText(e.target.value)} /></label>
        <button disabled={isBusy || !writeClient || !selectedId || Boolean(selectedTask?.finalized)} onClick={() => {
          const isRevision = selectedTask?.status === "NEEDS_REVISION";
          return run(isRevision ? "resubmit_proof" : "submit_proof", () => writeClient.writeContract({
            address: CONTRACT_ADDRESS as Address,
            functionName: isRevision ? "resubmit_proof" : "submit_proof",
            args: [selectedId, proofUrl, proofText],
            value: 0n,
          }));
        }}>{selectedTask?.status === "NEEDS_REVISION" ? "Resubmit revised proof" : "Submit evidence"}</button>
      </div>

      <div className="settlement-row">
        <button disabled={isBusy || !writeClient || !selectedId || selectedTask?.status !== "SUBMITTED"} onClick={() => run("evaluate_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "evaluate_task",
          args: [selectedId],
          value: 0n,
        }))}>Run AI jury</button>
        <button disabled={isBusy || !writeClient || !selectedId || !selectedTask?.evaluated || selectedTask?.decision === "NEEDS_REVISION" || Boolean(selectedTask?.finalized)} onClick={() => run("finalize_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "finalize_task",
          args: [selectedId],
          value: 0n,
        }), "finalized")}>Finalize payout</button>
        <button disabled={isBusy || !writeClient || !selectedId || !(selectedTask?.status === "OPEN" || selectedTask?.status === "CLAIMED")} onClick={() => run("cancel_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "cancel_task",
          args: [selectedId],
          value: 0n,
        }), "finalized")}>Cancel + refund</button>
      </div>
    </section>
  );
}
