import type { ProofTask } from "../types/task";
import { asNumber, formatTinyGen, shortAddress, statusTone } from "../lib/format";

export function TaskCard({ task, onSelect, selected }: { task: ProofTask; onSelect: () => void; selected: boolean }) {
  const tone = statusTone(String(task.status));
  return (
    <button className={`task-card ${selected ? "is-selected" : ""}`} onClick={onSelect}>
      <div className="task-card__topline">
        <span className="task-id">#{asNumber(task.task_id).toString().padStart(3, "0")}</span>
        <span className={`status-pill status-pill--${tone}`}>{String(task.status).replaceAll("_", " ")}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description || "No description supplied."}</p>
      <div className="task-card__meta">
        <span>{formatTinyGen(task.reward_amount)}</span>
        <span>{String(task.evidence_type)}</span>
        <span>{shortAddress(task.assigned_worker)}</span>
      </div>
    </button>
  );
}
