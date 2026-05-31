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
  const [title, setTitle] = useState("Patch the README typo");
  const [description, setDescription] = useState("Submit concise proof that the requested work is complete.");
  const [criteria, setCriteria] = useState("The proof must clearly satisfy the requested task.");
  const [sourceType, setSourceType] = useState<"MANUAL" | "GITHUB_ISSUE" | "GITHUB_PR" | "URL_SPEC">("MANUAL");
  const [sourceUrl, setSourceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("TEXT_SUBMISSION");
  const [reward, setReward] = useState("1000");
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("done");
  const [maxRevisions, setMaxRevisions] = useState("2");
  const [requiredStakePercent, setRequiredStakePercent] = useState("0");
  const [isBusy, setIsBusy] = useState(false);
  const [milestoneMode, setMilestoneMode] = useState(false);
  
  // Milestones states
  const [m1Title, setM1Title] = useState("Design");
  const [m1Criteria, setM1Criteria] = useState("Submit design proof");
  const [m1Percent, setM1Percent] = useState("20");
  const [m2Title, setM2Title] = useState("Implementation");
  const [m2Criteria, setM2Criteria] = useState("Submit implementation proof");
  const [m2Percent, setM2Percent] = useState("50");
  const [m3Title, setM3Title] = useState("Tests");
  const [m3Criteria, setM3Criteria] = useState("Submit tests proof");
  const [m3Percent, setM3Percent] = useState("30");

  // Team Split state
  const [teamMode, setTeamMode] = useState(false);
  const [tMem1, setTMem1] = useState("");
  const [tSplit1, setTSplit1] = useState("50");
  const [tMem2, setTMem2] = useState("");
  const [tSplit2, setTSplit2] = useState("30");
  const [tMem3, setTMem3] = useState("");
  const [tSplit3, setTSplit3] = useState("20");

  // Flag and Tip states
  const [flagReason, setFlagReason] = useState("Adjudication is flawed");
  const [tipAmount, setTipAmount] = useState("100");

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

  // Calculate required stake for the selected case
  const claimStakeRequired = useMemo(() => {
    if (!selectedTask) return 0n;
    const reqPct = asNumber(selectedTask.required_stake_percent);
    if (reqPct <= 0) return 0n;
    const rAmt = asNumber(selectedTask.reward_amount);
    return BigInt(Math.floor((rAmt * reqPct) / 100));
  }, [selectedTask]);

  // Calculate required appeal bond (20% of reward)
  const appealBondRequired = useMemo(() => {
    if (!selectedTask) return 0n;
    const rAmt = asNumber(selectedTask.reward_amount);
    return BigInt(Math.floor(rAmt / 5));
  }, [selectedTask]);

  return (
    <section className="action-panel">
      <div className="action-tabs">
        <span>[ operational deck ]</span>
      </div>

      <div className="form-slab create-slab">
        <h2>[+] Create escrow case</h2>
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
          <label>Reward (wei)<input value={reward} onChange={(e) => setReward(e.target.value)} inputMode="numeric" /></label>
          <label>Max revisions<input value={maxRevisions} onChange={(e) => setMaxRevisions(e.target.value)} inputMode="numeric" /></label>
        </div>
        <div className="form-row">
          <label>Required Stake (%)<input value={requiredStakePercent} onChange={(e) => setRequiredStakePercent(e.target.value)} inputMode="numeric" placeholder="0" /></label>
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
          args: milestoneMode ? [title, description, criteria, sourceType, sourceUrl, evidenceType, 0, "", Number(maxRevisions || "2"), m1Title, m1Criteria, Number(m1Percent || "0"), m2Title, m2Criteria, Number(m2Percent || "0"), m3Title, m3Criteria, Number(m3Percent || "0"), Number(requiredStakePercent || "0")] : [title, description, criteria, sourceType, sourceUrl, evidenceType, 0, "", Number(maxRevisions || "2"), Number(requiredStakePercent || "0")],
          value: BigInt(reward || "0"),
        }))}>{milestoneMode ? "Seal milestone case" : "Seal new case"}</button>
      </div>

      {selectedTask && selectedTask.status === "OPEN" ? (
        <div className="form-slab">
          <h2>[+] Claim case deliverables</h2>
          <p className="selected-note">Selected case: #{selectedId}</p>
          {claimStakeRequired > 0n ? (
            <p className="architect-error" style={{ fontSize: "11px", marginBottom: "10px" }}>
              WARNING: This case requires a worker stake of {asNumber(selectedTask.required_stake_percent)}% ({claimStakeRequired.toString()} wei). Stake is forfeited on abandonment.
            </p>
          ) : <p>No worker stake required for this case.</p>}
          <button disabled={isBusy || !writeClient} onClick={() => run("claim_task", () => writeClient.writeContract({
            address: CONTRACT_ADDRESS as Address,
            functionName: "claim_task",
            args: [selectedId],
            value: claimStakeRequired,
          }))}>Claim task registry</button>
        </div>
      ) : null}

      {selectedTask && (selectedTask.status === "OPEN" || selectedTask.status === "CLAIMED") && !selectedTask.has_team ? (
        <div className="form-slab">
          <h2>[+] Configure team splits</h2>
          <label className="checkline"><input type="checkbox" checked={teamMode} onChange={(e) => setTeamMode(e.target.checked)} /> Enable Team Splits (Max 3 Members)</label>
          {teamMode ? (
            <div className="milestone-form" style={{ background: "rgba(38, 244, 50, 0.05)" }}>
              <label>Member 1 Address<input value={tMem1} onChange={(e) => setTMem1(e.target.value)} placeholder="0x..." /></label>
              <label>Split 1 %<input value={tSplit1} onChange={(e) => setTSplit1(e.target.value)} /></label>
              
              <label>Member 2 Address<input value={tMem2} onChange={(e) => setTMem2(e.target.value)} placeholder="0x..." /></label>
              <label>Split 2 %<input value={tSplit2} onChange={(e) => setTSplit2(e.target.value)} /></label>
              
              <label>Member 3 Address<input value={tMem3} onChange={(e) => setTMem3(e.target.value)} placeholder="0x..." /></label>
              <label>Split 3 %<input value={tSplit3} onChange={(e) => setTSplit3(e.target.value)} /></label>
              
              <button style={{ gridColumn: "1 / -1" }} disabled={isBusy || !tMem1} onClick={() => {
                const members = [tMem1];
                const splits = [Number(tSplit1)];
                if (tMem2) { members.push(tMem2); splits.push(Number(tSplit2)); }
                if (tMem3) { members.push(tMem3); splits.push(Number(tSplit3)); }
                return run("register_team", () => writeClient.writeContract({
                  address: CONTRACT_ADDRESS as Address,
                  functionName: "register_team",
                  args: [selectedId, members, splits],
                  value: 0n,
                }));
              }}>Register Split Shares</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="form-slab">
        <h2>[+] Submit proof / Evidence</h2>
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

      {selectedTask && selectedTask.evaluated && !selectedTask.finalized && !selectedTask.is_appealed ? (
        <div className="form-slab">
          <h2>[+] Dispute / Arbitration</h2>
          <p className="selected-note">Case: #{selectedId}</p>
          <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
            <button disabled={isBusy} className="wallet-button secondary" onClick={() => run("appeal_verdict", () => writeClient.writeContract({
              address: CONTRACT_ADDRESS as Address,
              functionName: "appeal_verdict",
              args: [selectedId],
              value: appealBondRequired,
            }))}>
              Appeal Verdict (Bond: {appealBondRequired.toString()} wei)
            </button>
            
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", marginTop: "5px" }}>
              <label>Flagging Reason<input value={flagReason} onChange={(e) => setFlagReason(e.target.value)} /></label>
              <button disabled={isBusy} style={{ width: "100%" }} onClick={() => run("flag_evaluation", () => writeClient.writeContract({
                address: CONTRACT_ADDRESS as Address,
                functionName: "flag_evaluation",
                args: [selectedId, flagReason],
                value: 100n, // 100 wei flagging stake
              }))}>
                Flag Evaluation (Stake: 100 wei)
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTask && selectedTask.finalized ? (
        <div className="form-slab">
          <h2>[+] Send Creator tip</h2>
          <p className="selected-note">Case: #{selectedId}</p>
          <div className="form-row" style={{ gridTemplateColumns: "1fr auto", alignItems: "end" }}>
            <label>Tip Amount (wei)<input value={tipAmount} onChange={(e) => setTipAmount(e.target.value)} inputMode="numeric" /></label>
            <button disabled={isBusy} onClick={() => run("tip_worker", () => writeClient.writeContract({
              address: CONTRACT_ADDRESS as Address,
              functionName: "tip_worker",
              args: [selectedId],
              value: BigInt(tipAmount || "0"),
            }))}>Send Tip</button>
          </div>
        </div>
      ) : null}

      <div className="settlement-row">
        <button disabled={isBusy || !writeClient || !selectedId || selectedTask?.status !== "SUBMITTED"} onClick={() => run("evaluate_task", () => writeClient.writeContract({
          address: CONTRACT_ADDRESS as Address,
          functionName: "evaluate_task",
          args: [selectedId],
          value: 0n,
        }))}>Run AI jury</button>
        <button disabled={isBusy || !writeClient || !selectedId || !selectedTask?.evaluated || selectedTask?.decision === "NEEDS_REVISION" || Boolean(selectedTask?.finalized) || Boolean(selectedTask?.is_appealed)} onClick={() => run("finalize_task", () => writeClient.writeContract({
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
