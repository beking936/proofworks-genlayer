export interface GitHubImportResult {
  kind: "issue" | "pull";
  owner: string;
  repo: string;
  number: number;
  htmlUrl: string;
  title: string;
  body: string;
  state: string;
  labels: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  files?: Array<{ filename: string; status: string; additions: number; deletions: number; changes: number }>;
}

export interface BountyDraft {
  title: string;
  description: string;
  criteria: string;
  sourceType: "MANUAL" | "GITHUB_ISSUE" | "GITHUB_PR" | "URL_SPEC";
  sourceUrl: string;
  evidenceType: "TEXT_SUBMISSION" | "GITHUB_PR" | "URL_DOCUMENT";
  reward: string;
  proofUrl: string;
  maxRevisions: string;
  mode: "issue_bounty" | "retro_pr_review" | "manual";
  score: number;
  warnings: string[];
  sellingPoint: string;
}
