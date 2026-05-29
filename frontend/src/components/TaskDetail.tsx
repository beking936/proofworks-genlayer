import type { ProofTask } from "../types/task";
import { asNumber, formatTinyGen, shortAddress, statusTone } from "../lib/format";

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

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="eyebrow">Case #{asNumber(task.task_id)}</span>
          <h2>{task.title}</h2>
        </div>
        <span className={`status-pill status-pill--${tone}`}>{String(task.status).replaceAll("_", " ")}</span>
      </div>

      <div className="criteria-block">
        <span>Acceptance criteria</span>
        <p>{task.acceptance_criteria}</p>
      </div>

      <div className="detail-grid">
        <div><span>Reward</span><strong>{formatTinyGen(task.reward_amount)}</strong></div>
        <div><span>Creator</span><strong>{shortAddress(task.creator)}</strong></div>
        <div><span>Worker</span><strong>{shortAddress(task.assigned_worker)}</strong></div>
        <div><span>Evidence</span><strong>{String(task.evidence_type)}</strong></div>
      </div>

      {task.proof_url || task.proof_text ? (
        <div className="proof-block">
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
          {task.required_revision ? <em>{task.required_revision}</em> : null}
          <div className="detail-grid compact">
            <div><span>Score</span><strong>{asNumber(task.score)}</strong></div>
            <div><span>Payout</span><strong>{asNumber(task.payout_percent)}%</strong></div>
            <div><span>Confidence</span><strong>{task.confidence}</strong></div>
            <div><span>Finalized</span><strong>{task.finalized ? "yes" : "no"}</strong></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
