export interface Milestone {
  milestone_id: number | bigint;
  task_id: number | bigint;
  index: number | bigint;
  title: string;
  acceptance_criteria: string;
  payout_percent_of_task: number | bigint;
  status: string;
  proof_url: string;
  proof_text: string;
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
  finalized: boolean;
  worker_payout: number | bigint;
  creator_refund: number | bigint;
}
