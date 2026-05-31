export type EvidenceType = "TEXT_SUBMISSION" | "GITHUB_PR" | "GITHUB_ISSUE" | "URL_DOCUMENT";
export type SourceType = "MANUAL" | "GITHUB_ISSUE" | "GITHUB_PR" | "URL_SPEC";

export type TaskStatus =
  | "OPEN"
  | "CLAIMED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PARTIAL"
  | "NEEDS_REVISION"
  | "PAID"
  | "REFUNDED"
  | "PARTIALLY_PAID"
  | "CANCELED";

export interface ProofTask {
  task_id: number | bigint;
  creator: string;
  assigned_worker: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  source_type: SourceType | string;
  source_url: string;
  evidence_type: EvidenceType | string;
  reward_amount: number | bigint;
  deadline: number | bigint;
  status: TaskStatus | string;
  proof_url: string;
  proof_text: string;
  canceled: boolean;
  evaluated: boolean;
  decision: string;
  score: number | bigint;
  payout_percent: number | bigint;
  confidence: string;
  reason: string;
  required_revision: string;
  reason_code: string;
  missing_requirements: string;
  revision_count: number | bigint;
  max_revisions: number | bigint;
  finalized: boolean;
  worker_payout: number | bigint;
  creator_refund: number | bigint;
  required_stake_percent: number | bigint;
  worker_stake: number | bigint;
  is_appealed: boolean;
  appeal_bond: number | bigint;
  appellant: string;
  juror1: string;
  juror2: string;
  juror3: string;
  vote1: string;
  vote2: string;
  vote3: string;
  appeal_votes_count: number | bigint;
  evaluated_at: number | bigint;
  has_team: boolean;
  team_member1: string;
  team_split1: number | bigint;
  team_member2: string;
  team_split2: number | bigint;
  team_member3: string;
  team_split3: number | bigint;
}

export interface EscrowSummary {
  active_escrow: number | bigint;
  contract_balance: number | bigint;
  total_escrowed: number | bigint;
  total_finalized: number | bigint;
}

export interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  hash?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}
