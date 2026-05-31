import { useState } from "react";
import type { ProofTask } from "../types/task";
import { asNumber, formatTinyGen, shortAddress, statusTone } from "../lib/format";
import { CONTRACT_ADDRESS, waitAccepted } from "../lib/contract";
import type { Address } from "viem";

function parseMissing(raw: string | undefined) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function TaskDetail({
  task,
  connectedAddress,
  writeClient,
  onRefresh,
  pushActivity,
}: {
  task: ProofTask | null;
  connectedAddress: string | null;
  writeClient: any;
  onRefresh: () => Promise<void>;
  pushActivity: (item: any) => void;
}) {
  const [busyJury, setBusyJury] = useState(false);

  if (!task) {
    return (
      <section className="detail-panel empty-detail">
        <span className="large-glyph">§</span>
        <h2>Select a case file</h2>
        <p>The ledger will open on the right once you choose a task from the docket.</p>
      </section>
    );
  }

  const tone = statusTone(String(task.status));
  const payoutPercent = asNumber(task.payout_percent);
  const reward = asNumber(task.reward_amount);
  const workerPreview = Math.floor((reward * payoutPercent) / 100);
  const creatorPreview = reward - workerPreview;
  const missing = parseMissing(task.missing_requirements);

  const isJuror1 = connectedAddress && task?.juror1 && connectedAddress.toLowerCase() === task?.juror1.toLowerCase();
  const isJuror2 = connectedAddress && task?.juror2 && connectedAddress.toLowerCase() === task?.juror2.toLowerCase();
  const isJuror3 = connectedAddress && task?.juror3 && connectedAddress.toLowerCase() === task?.juror3.toLowerCase();
  const isAnyJuror = isJuror1 || isJuror2 || isJuror3;

  const jurorHasVoted = (isJuror1 && task?.vote1 !== "") || (isJuror2 && task?.vote2 !== "") || (isJuror3 && task?.vote3 !== "");
  const showVotingDesk = isAnyJuror && !jurorHasVoted && task?.status === "APPEALED";

  async function vote(decision: "APPROVE" | "REJECT") {
    if (!writeClient || !task) return;
    setBusyJury(true);
    try {
      const hash = await writeClient.writeContract({
        address: CONTRACT_ADDRESS as Address,
        functionName: "cast_jury_vote",
        args: [asNumber(task.task_id), decision],
        value: 0n,
      });
      pushActivity({ id: `${Date.now()}-vote`, label: "cast_jury_vote", detail: `submitted vote: ${decision}`, hash, tone: "warn" });
      await waitAccepted(hash);
      pushActivity({ id: `${Date.now()}-vote-done`, label: "cast_jury_vote", detail: "vote accepted", hash, tone: "good" });
      await onRefresh();
    } catch (err) {
      pushActivity({ id: `${Date.now()}-vote-err`, label: "cast_jury_vote", detail: err instanceof Error ? err.message : String(err), tone: "bad" });
    } finally {
      setBusyJury(false);
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="eyebrow">Case #{asNumber(task.task_id)}</span>
          <h2>{task.title}</h2>
        </div>
        <span className={`status-pill status-pill--${tone}`}>{String(task.status).replaceAll("_", " ")}</span>
      </div>

      <div className="criteria-block evidence-room">
        <span>Agreement Specification</span>
        <p>{task.acceptance_criteria}</p>
        <div className="room-row"><b>Source Registry</b><strong>{String(task.source_type || "MANUAL")}</strong></div>
        {task.source_url ? <a href={task.source_url} target="_blank" rel="noreferrer">{task.source_url}</a> : <em>Manual task — no external source URL.</em>}
      </div>

      <div className="detail-grid">
        <div><span>Reward Escrow</span><strong>{formatTinyGen(task.reward_amount)}</strong></div>
        <div><span>Creator Address</span><strong>{shortAddress(task.creator)}</strong></div>
        <div><span>Worker Address</span><strong>{shortAddress(task.assigned_worker)}</strong></div>
        <div><span>Evidence Type</span><strong>{String(task.evidence_type)}</strong></div>
      </div>

      {asNumber(task.required_stake_percent) > 0 ? (
        <div className="criteria-block evidence-room" style={{ borderColor: "var(--vermilion)" }}>
          <span>Worker Staking Telemetry</span>
          <div className="room-row"><b>Required Stake</b><strong>{asNumber(task.required_stake_percent)}%</strong></div>
          <div className="room-row"><b>Worker Stake Locked</b><strong>{formatTinyGen(task.worker_stake)}</strong></div>
        </div>
      ) : null}

      {task.has_team ? (
        <div className="criteria-block evidence-room" style={{ borderColor: "var(--acid)" }}>
          <span>Registered Team Shares</span>
          {task.team_member1 && task.team_member1 !== "0x0000000000000000000000000000000000000000" ? (
            <div className="room-row"><b>Member 1</b><strong>{shortAddress(task.team_member1)} ({asNumber(task.team_split1)}%)</strong></div>
          ) : null}
          {task.team_member2 && task.team_member2 !== "0x0000000000000000000000000000000000000000" ? (
            <div className="room-row"><b>Member 2</b><strong>{shortAddress(task.team_member2)} ({asNumber(task.team_split2)}%)</strong></div>
          ) : null}
          {task.team_member3 && task.team_member3 !== "0x0000000000000000000000000000000000000000" ? (
            <div className="room-row"><b>Member 3</b><strong>{shortAddress(task.team_member3)} ({asNumber(task.team_split3)}%)</strong></div>
          ) : null}
        </div>
      ) : null}

      {task.proof_url || task.proof_text ? (
        <div className="proof-block evidence-room">
          <span>Submitted proof</span>
          {task.proof_url ? <a href={task.proof_url} target="_blank" rel="noreferrer">{task.proof_url}</a> : null}
          {task.proof_text ? <p>{task.proof_text}</p> : null}
        </div>
      ) : null}

      {task.is_appealed || task.status === "APPEALED" ? (
        <div className="appeal-block">
          <div className="verdict-score" style={{ color: "var(--vermilion)" }}>
            <span>Jury Appeal Active</span>
            <strong>{task.appeal_votes_count ? asNumber(task.appeal_votes_count) : 0}/3 Votes</strong>
          </div>
          <p>This case was appealed. A community juror panel is casting votes to determine approval.</p>
          <div className="detail-grid compact">
            <div><span>Appellant</span><strong>{shortAddress(task.appellant)}</strong></div>
            <div><span>Appeal Bond</span><strong>{formatTinyGen(task.appeal_bond)}</strong></div>
          </div>
          
          <div className="criteria-block evidence-room" style={{ borderStyle: "dashed", borderColor: "var(--vermilion)" }}>
            <span>Juror Docket Votes</span>
            <div className="room-row"><b>Juror 1 ({shortAddress(task.juror1)})</b><strong>{task.vote1 || "PENDING"}</strong></div>
            <div className="room-row"><b>Juror 2 ({shortAddress(task.juror2)})</b><strong>{task.vote2 || "PENDING"}</strong></div>
            <div className="room-row"><b>Juror 3 ({shortAddress(task.juror3)})</b><strong>{task.vote3 || "PENDING"}</strong></div>
          </div>

          {showVotingDesk ? (
            <div className="criteria-block evidence-room" style={{ borderColor: "var(--acid)", background: "rgba(38,244,50,0.06)" }}>
              <span>Juror Voting Desk</span>
              <p>YOU ARE AN ASSIGNED JUROR FOR THIS DISPUTE. Cast your consensus vote below:</p>
              <div className="milestone-actions" style={{ marginTop: "12px" }}>
                <button disabled={busyJury} style={{ background: "var(--acid)", color: "#000", border: "1px solid var(--acid)" }} onClick={() => vote("APPROVE")}>Vote Approve</button>
                <button disabled={busyJury} style={{ background: "var(--vermilion)", color: "#fff", border: "1px solid var(--vermilion)" }} onClick={() => vote("REJECT")}>Vote Reject</button>
              </div>
            </div>
          ) : isAnyJuror ? (
            <p style={{ color: "var(--acid)", fontSize: "11px", marginTop: "10px" }}>* YOU HAVE ALREADY CAST YOUR JUROR VOTE FOR THIS DISPUTE.</p>
          ) : null}
        </div>
      ) : null}

      {task.evaluated && !task.is_appealed && task.status !== "APPEALED" ? (
        <div className="verdict-block">
          <div className="verdict-score">
            <span>AI verdict</span>
            <strong>{task.decision}</strong>
          </div>
          <div className="verdict-meter" style={{ ["--score" as string]: `${asNumber(task.score)}%` }}>
            <i />
          </div>
          <p>{task.reason}</p>
          {task.reason_code ? <div className="reason-code">{task.reason_code}</div> : null}
          {missing.length ? <ul className="missing-list">{missing.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {task.required_revision ? <em>{task.required_revision}</em> : null}
          <div className="detail-grid compact">
            <div><span>Score</span><strong>{asNumber(task.score)}</strong></div>
            <div><span>Payout</span><strong>{asNumber(task.payout_percent)}%</strong></div>
            <div><span>Confidence</span><strong>{task.confidence}</strong></div>
            <div><span>Revision</span><strong>{asNumber(task.revision_count)}/{asNumber(task.max_revisions)}</strong></div>
          </div>
          <div className="settlement-preview">
            <span>Settlement preview</span>
            {task.decision === "NEEDS_REVISION" ? <strong>Revision required before settlement</strong> : <strong>Worker {formatTinyGen(workerPreview)} · Creator refund {formatTinyGen(creatorPreview)}</strong>}
            <small>{task.finalized ? "Finalized" : "Transfers execute after FINALIZED status"}</small>
          </div>
        </div>
      ) : null}
    </section>
  );
}
