import type { BountyDraft, GitHubImportResult } from "../types/github";

function stripUrlNoise(input: string): string {
  let clean = input.trim();
  const markdown = clean.match(/\]\((https?:\/\/github\.com\/[^)]+)\)/i);
  if (markdown?.[1]) clean = markdown[1];
  const match = clean.match(/(?:https?:\/\/)?github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+(?:[^\s)]*)?/i);
  return (match?.[0] ?? clean).replace(/[<>`"']/g, "").replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function parseGitHubUrl(input: string) {
  const clean = stripUrlNoise(input);
  const match = clean.match(/^(?:https?:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)/i);
  if (!match) throw new Error("Paste a GitHub issue or pull request URL.");
  return {
    owner: match[1],
    repo: match[2],
    kind: match[3] === "pull" ? "pull" as const : "issue" as const,
    number: Number(match[4]),
    htmlUrl: `https://github.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`,
  };
}

export async function importGitHubUrl(input: string): Promise<GitHubImportResult> {
  const parsed = parseGitHubUrl(input);
  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const issueUrl = `${base}/issues/${parsed.number}`;
  const mainUrl = parsed.kind === "pull" ? `${base}/pulls/${parsed.number}` : issueUrl;

  const [issueRes, mainRes] = await Promise.all([
    fetch(issueUrl, { headers: { Accept: "application/vnd.github+json" } }),
    fetch(mainUrl, { headers: { Accept: "application/vnd.github+json" } }),
  ]);

  if (!issueRes.ok || !mainRes.ok) {
    throw new Error(`GitHub returned ${issueRes.status}/${mainRes.status}. Is the repository public?`);
  }

  const issue = await issueRes.json();
  const main = await mainRes.json();
  let files: GitHubImportResult["files"] = undefined;

  if (parsed.kind === "pull") {
    const filesRes = await fetch(`${base}/pulls/${parsed.number}/files`, { headers: { Accept: "application/vnd.github+json" } });
    if (filesRes.ok) {
      const raw = await filesRes.json();
      files = raw.slice(0, 20).map((file: any) => ({
        filename: String(file.filename ?? ""),
        status: String(file.status ?? ""),
        additions: Number(file.additions ?? 0),
        deletions: Number(file.deletions ?? 0),
        changes: Number(file.changes ?? 0),
      }));
    }
  }

  return {
    kind: parsed.kind,
    owner: parsed.owner,
    repo: parsed.repo,
    number: parsed.number,
    htmlUrl: parsed.htmlUrl,
    title: String(main.title ?? issue.title ?? ""),
    body: String(main.body ?? issue.body ?? ""),
    state: String(main.state ?? issue.state ?? ""),
    labels: Array.isArray(issue.labels) ? issue.labels.map((l: any) => String(l.name ?? l)) : [],
    comments: Number(issue.comments ?? 0),
    createdAt: String(issue.created_at ?? main.created_at ?? ""),
    updatedAt: String(issue.updated_at ?? main.updated_at ?? ""),
    author: String((issue.user ?? main.user ?? {}).login ?? "unknown"),
    files,
  };
}

export function draftFromGitHub(result: GitHubImportResult): BountyDraft {
  const isPull = result.kind === "pull";
  const fileList = result.files?.map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`).join("\n") ?? "";
  const hasManyComments = result.comments > 20;
  const vagueSignals = ["help wanted", "good first issue", "question", "discussion"].filter((label) =>
    result.labels.some((l) => l.toLowerCase().includes(label))
  );
  const warnings: string[] = [];
  if (hasManyComments) warnings.push("High comment count: clarify scope before funding.");
  if (vagueSignals.length) warnings.push(`Labels suggest ambiguity: ${vagueSignals.join(", ")}.`);
  if (!result.body || result.body.length < 80) warnings.push("Description is short; acceptance criteria should be explicit.");

  const score = Math.max(42, Math.min(96,
    88 - (hasManyComments ? 14 : 0) - (warnings.length * 5) + (isPull && result.files?.length ? 8 : 0)
  ));

  return {
    title: isPull ? `Retro review PR #${result.number}: ${result.title}` : `Solve issue #${result.number}: ${result.title}`,
    description: [
      `Repository: ${result.owner}/${result.repo}`,
      `Source: ${result.htmlUrl}`,
      `Author: ${result.author}`,
      "",
      result.body?.slice(0, 1400) || "No GitHub body was provided.",
      fileList ? `\nChanged files:\n${fileList}` : "",
    ].filter(Boolean).join("\n"),
    criteria: isPull
      ? `Retroactively evaluate whether PR #${result.number} is relevant, non-trivial, and aligned with its stated goal. This is not a future-work bounty; it is a completed-work adjudication.`
      : `A valid submission must include a GitHub pull request that addresses issue #${result.number} in ${result.owner}/${result.repo}. The PR should be relevant to the issue, include meaningful code/docs changes, and clearly satisfy the issue requirements.`,
    sourceType: isPull ? "GITHUB_PR" : "GITHUB_ISSUE",
    sourceUrl: result.htmlUrl,
    evidenceType: "GITHUB_PR",
    reward: score >= 80 ? "5" : "2",
    proofUrl: isPull ? result.htmlUrl : "",
    maxRevisions: "2",
    mode: isPull ? "retro_pr_review" : "issue_bounty",
    score,
    warnings: isPull ? ["Retroactive PR review: proof URL is prefilled because the work already exists.", ...warnings] : warnings,
    sellingPoint: score >= 80 ? (isPull ? "Ready for retroactive review" : "Clean issue bounty candidate") : "Needs tighter scope before funding",
  };
}
