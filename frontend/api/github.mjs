// Vercel serverless function: GET /api/github?url=<github url>
// Fetches a GitHub issue or pull request and returns a compact JSON payload
// suitable for the ProofWorks bounty architect UI.
//
// This is the read-only path ported from server/github-proxy.mjs. The webhook
// and on-chain auto-create paths are intentionally excluded from the serverless
// build because they need long-lived private keys we do not want stored as
// edge env vars. Run those locally with `node server/github-proxy.mjs` if needed.

const TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || "";

function stripUrlNoise(input) {
  let clean = String(input || "").trim();
  const markdown = clean.match(/\]\((https?:\/\/github\.com\/[^)]+)\)/i);
  if (markdown?.[1]) clean = markdown[1];
  const match = clean.match(
    /(?:https?:\/\/)?github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+(?:[^\s)]*)?/i
  );
  return (match?.[0] ?? clean)
    .replace(/[<>`"']/g, "")
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
}

function parseGitHubUrl(input) {
  const clean = stripUrlNoise(input);
  const match = clean.match(
    /^(?:https?:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)/i
  );
  if (!match) throw new Error("Paste a GitHub issue or pull request URL.");
  return {
    owner: match[1],
    repo: match[2],
    kind: match[3] === "pull" ? "pull" : "issue",
    number: Number(match[4]),
    htmlUrl: `https://github.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`,
  };
}

async function gh(path) {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "ProofWorks-GitHub-Proxy",
    "x-github-api-version": "2022-11-28",
  };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.message || response.statusText;
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new Error(
      `GitHub ${response.status}: ${message}${
        remaining !== null ? ` (remaining ${remaining})` : ""
      }`
    );
  }
  return data;
}

async function importGitHubUrl(input) {
  const parsed = parseGitHubUrl(input);
  const base = `/repos/${parsed.owner}/${parsed.repo}`;
  const issue = await gh(`${base}/issues/${parsed.number}`);
  const main =
    parsed.kind === "pull" ? await gh(`${base}/pulls/${parsed.number}`) : issue;
  let files;
  if (parsed.kind === "pull") {
    try {
      const raw = await gh(`${base}/pulls/${parsed.number}/files`);
      files = raw.slice(0, 20).map((file) => ({
        filename: String(file.filename ?? ""),
        status: String(file.status ?? ""),
        additions: Number(file.additions ?? 0),
        deletions: Number(file.deletions ?? 0),
        changes: Number(file.changes ?? 0),
      }));
    } catch {
      files = undefined;
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
    labels: Array.isArray(issue.labels)
      ? issue.labels.map((l) => String(l.name ?? l))
      : [],
    comments: Number(issue.comments ?? 0),
    createdAt: String(issue.created_at ?? main.created_at ?? ""),
    updatedAt: String(issue.updated_at ?? main.updated_at ?? ""),
    author: String((issue.user ?? main.user ?? {}).login ?? "unknown"),
    files,
    source: TOKEN ? "github-api-authenticated-proxy" : "github-api-proxy",
  };
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  try {
    const target =
      (req.query && (req.query.url || (Array.isArray(req.query.url) ? req.query.url[0] : ""))) ||
      "";
    if (!target) {
      res.status(400).json({ error: "missing_url" });
      return;
    }
    const data = await importGitHubUrl(target);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
