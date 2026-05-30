import type { ProofTask } from "../types/task";
import { asNumber, formatTinyGen, shortAddress, statusTone } from "../lib/format";

function parseMissing(raw: string | undefined) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function TaskDetail({ task }: { task: ProofTask | null }) {
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
        <span>Agreement</span>
        <p>{task.acceptance_criteria}</p>
        <div className="room-row"><b>Source</b><strong>{String(task.source_type || "MANUAL")}</strong></div>
        {task.source_url ? <a href={task.source_url} target="_blank" rel="noreferrer">{task.source_url}</a> : <em>Manual task — no external source URL.</em>}
      </div>

      <div className="detail-grid">
        <div><span>Reward</span><strong>{formatTinyGen(task.reward_amount)}</strong></div>
        <div><span>Creator</span><strong>{shortAddress(task.creator)}</strong></div>
        <div><span>Worker</span><strong>{shortAddress(task.assigned_worker)}</strong></div>
        <div><span>Evidence</span><strong>{String(task.evidence_type)}</strong></div>
      </div>

      {task.proof_url || task.proof_text ? (
        <div className="proof-block evidence-room">
          <span>Submitted proof</span>
          {task.proof_url ? <a href={task.proof_url} target="_blank" rel="noreferrer">{task.proof_url}</a> : null}
          {task.proof_text ? <p>{task.proof_text}</p> : null}
        </div>
      ) : null}

      {task.evaluated ? (
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
