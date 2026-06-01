import http from 'node:http';
import { URL } from 'node:url';
import { createAccount, createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

const PORT = Number(process.env.PORT || process.env.GITHUB_PROXY_PORT || 8787);
const TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || process.env.VITE_CONTRACT_ADDRESS || '0x541031b4574cDE16c93c2b580Bc1Da763a3efbc7';
const CREATOR_PRIVATE_KEY = process.env.WEBHOOK_CREATOR_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
const WORKER_PRIVATE_KEY = process.env.WEBHOOK_WORKER_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
const WEBHOOK_REWARD_WEI = BigInt(process.env.WEBHOOK_REWARD_WEI || '1');

function send(res, status, data) {
  const body = JSON.stringify(data, (_key, value) => typeof value === 'bigint' ? value.toString() : value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  });
  res.end(body);
}

function stripUrlNoise(input) {
  let clean = String(input || '').trim();
  const markdown = clean.match(/\]\((https?:\/\/github\.com\/[^)]+)\)/i);
  if (markdown?.[1]) clean = markdown[1];
  const match = clean.match(/(?:https?:\/\/)?github\.com\/[\w.-]+\/[\w.-]+\/(?:issues|pull)\/\d+(?:[^\s)]*)?/i);
  return (match?.[0] ?? clean).replace(/[<>`"']/g, '').replace(/[?#].*$/, '').replace(/\/$/, '');
}

function parseGitHubUrl(input) {
  const clean = stripUrlNoise(input);
  const match = clean.match(/^(?:https?:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+)\/(issues|pull)\/(\d+)/i);
  if (!match) throw new Error('Paste a GitHub issue or pull request URL.');
  return {
    owner: match[1],
    repo: match[2],
    kind: match[3] === 'pull' ? 'pull' : 'issue',
    number: Number(match[4]),
    htmlUrl: `https://github.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`,
  };
}

async function gh(path) {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'ProofWorks-GitHub-Proxy',
    'x-github-api-version': '2022-11-28',
  };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data?.message || response.statusText;
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new Error(`GitHub ${response.status}: ${message}${remaining !== null ? ` (remaining ${remaining})` : ''}`);
  }
  return data;
}

async function importGitHubUrl(input) {
  const parsed = parseGitHubUrl(input);
  const base = `/repos/${parsed.owner}/${parsed.repo}`;
  const issue = await gh(`${base}/issues/${parsed.number}`);
  const main = parsed.kind === 'pull' ? await gh(`${base}/pulls/${parsed.number}`) : issue;
  let files;
  if (parsed.kind === 'pull') {
    try {
      const raw = await gh(`${base}/pulls/${parsed.number}/files`);
      files = raw.slice(0, 20).map((file) => ({
        filename: String(file.filename ?? ''),
        status: String(file.status ?? ''),
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
    title: String(main.title ?? issue.title ?? ''),
    body: String(main.body ?? issue.body ?? ''),
    state: String(main.state ?? issue.state ?? ''),
    labels: Array.isArray(issue.labels) ? issue.labels.map((l) => String(l.name ?? l)) : [],
    comments: Number(issue.comments ?? 0),
    createdAt: String(issue.created_at ?? main.created_at ?? ''),
    updatedAt: String(issue.updated_at ?? main.updated_at ?? ''),
    author: String((issue.user ?? main.user ?? {}).login ?? 'unknown'),
    files,
    source: TOKEN ? 'github-api-authenticated-proxy' : 'github-api-proxy',
  };
}


async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function issueHasBountyLabel(issue) {
  return Array.isArray(issue?.labels) && issue.labels.some((l) => String(l.name ?? l).toLowerCase().includes('bounty'));
}

function issueUrl(issue) {
  return issue?.html_url || '';
}

function findClosingIssueNumber(text) {
  const match = String(text || '').match(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/i);
  return match ? Number(match[1]) : 0;
}

async function createCaseFromIssue(issue) {
  if (!CREATOR_PRIVATE_KEY) throw new Error('WEBHOOK_CREATOR_PRIVATE_KEY/PRIVATE_KEY not configured');
  const account = createAccount(CREATOR_PRIVATE_KEY);
  const client = createClient({ chain: studionet, account });
  const title = `Webhook bounty: ${issue.title || `Issue #${issue.number}`}`;
  const description = `${issue.body || 'No issue body provided.'}\n\nCreated automatically by ProofWorks GitHub webhook.`.slice(0, 6500);
  const criteria = `A submitted pull request must materially solve GitHub issue #${issue.number}, be from the same repository, and satisfy the issue requirements.`;
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'create_case',
    args: [title, description, criteria, 'GITHUB_ISSUE', issueUrl(issue), 'GITHUB_PR', 0, '', 2],
    value: WEBHOOK_REWARD_WEI,
  });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 100, interval: 3000 });
  return { hash, receipt };
}

async function findTaskForIssue(sourceUrl) {
  const client = createClient({ chain: studionet });
  const count = Number(await client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_task_count', args: [] }));
  for (let id = 1; id <= count; id++) {
    try {
      const task = await client.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_task', args: [id] });
      if (String(task.source_url).toLowerCase() === String(sourceUrl).toLowerCase() && !task.finalized) return task;
    } catch {}
  }
  return null;
}

async function submitAndEvaluateFromPullRequest(pr) {
  if (!WORKER_PRIVATE_KEY) throw new Error('WEBHOOK_WORKER_PRIVATE_KEY/PRIVATE_KEY not configured');
  const issueNo = findClosingIssueNumber(pr.body);
  if (!issueNo) throw new Error('Pull request body does not reference a closing issue keyword like Closes #123');
  const repoUrl = pr.base?.repo?.html_url || pr.head?.repo?.html_url || '';
  const sourceUrl = `${repoUrl}/issues/${issueNo}`;
  const task = await findTaskForIssue(sourceUrl);
  if (!task) throw new Error(`No open ProofWorks task found for ${sourceUrl}`);
  const account = createAccount(WORKER_PRIVATE_KEY);
  const client = createClient({ chain: studionet, account });
  const submitHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName: 'submit_proof', args: [Number(task.task_id), pr.html_url, `Webhook submitted PR: ${pr.title}`], value: 0n });
  await client.waitForTransactionReceipt({ hash: submitHash, status: TransactionStatus.ACCEPTED, retries: 100, interval: 3000 });
  const evalHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName: 'evaluate_task', args: [Number(task.task_id)], value: 0n });
  const evalReceipt = await client.waitForTransactionReceipt({ hash: evalHash, status: TransactionStatus.ACCEPTED, retries: 120, interval: 3000 });
  return { task_id: Number(task.task_id), submitHash, evalHash, evalReceipt };
}

async function handleWebhook(payload) {
  if (payload.issue && ['labeled', 'opened', 'edited'].includes(payload.action) && issueHasBountyLabel(payload.issue)) {
    return { kind: 'issue_bounty_created', ...(await createCaseFromIssue(payload.issue)) };
  }
  if (payload.pull_request && ['opened', 'synchronize', 'ready_for_review'].includes(payload.action)) {
    return { kind: 'pr_submitted_and_evaluated', ...(await submitAndEvaluateFromPullRequest(payload.pull_request)) };
  }
  return { kind: 'ignored', action: payload.action };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    });
    res.end();
    return;
  }
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    send(res, 200, { ok: true, token: Boolean(TOKEN), contract: CONTRACT_ADDRESS });
    return;
  }
  if (url.pathname === '/api/webhook/github' && req.method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      const result = await handleWebhook(payload);
      send(res, 200, result);
    } catch (error) {
      send(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (url.pathname !== '/api/github') {
    send(res, 404, { error: 'not_found' });
    return;
  }
  try {
    const target = url.searchParams.get('url') || '';
    const data = await importGitHubUrl(target);
    send(res, 200, data);
  } catch (error) {
    send(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ProofWorks GitHub proxy listening on http://0.0.0.0:${PORT} (token=${TOKEN ? 'yes' : 'no'})`);
});
