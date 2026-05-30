import { useState } from "react";
import { draftFromGitHub, importGitHubUrl } from "../lib/githubImport";
import type { BountyDraft, GitHubImportResult } from "../types/github";

export function BountyArchitect({ onApply }: { onApply: (draft: BountyDraft) => void }) {
  const [url, setUrl] = useState("https://github.com/zarazhangrui/follow-builders/pull/43");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GitHubImportResult | null>(null);
  const [draft, setDraft] = useState<BountyDraft | null>(null);

  async function analyze() {
    setIsLoading(true);
    setError("");
    try {
      const imported = await importGitHubUrl(url);
      const nextDraft = draftFromGitHub(imported);
      setResult(imported);
      setDraft(nextDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
      setDraft(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="architect-panel">
      <div className="architect-copy">
        <span className="eyebrow">bounty architect</span>
        <h2>Paste GitHub. Get a settlement-ready case.</h2>
        <p>
          ProofWorks imports public issue/PR context, drafts criteria, scores ambiguity,
          and turns messy GitHub work into a GenLayer adjudication brief.
        </p>
      </div>
      <div className="architect-input">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/org/repo/pull/43" />
        <button onClick={analyze} disabled={isLoading}>{isLoading ? "reading GitHub…" : "Analyze"}</button>
      </div>
      {error ? <div className="architect-error">{error}</div> : null}
      {draft && result ? (
        <div className="architect-result">
          <div className="score-orb" style={{ ["--score" as string]: `${draft.score}%` }}>
            <strong>{draft.score}</strong>
            <span>clarity</span>
          </div>
          <div className="draft-lines">
            <strong>{draft.sellingPoint}</strong>
            <span>{result.owner}/{result.repo} · #{result.number} · {result.kind}</span>
            <p>{draft.title}</p>
            {draft.warnings.length ? <ul>{draft.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : <em>No major scope warnings detected.</em>}
          </div>
          <button className="apply-draft" onClick={() => onApply(draft)}>Load into task form</button>
        </div>
      ) : null}
    </section>
  );
}
