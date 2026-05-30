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
  evidenceType: "TEXT_SUBMISSION" | "GITHUB_PR" | "URL_DOCUMENT";
  reward: string;
  proofUrl: string;
  score: number;
  warnings: string[];
  sellingPoint: string;
}
