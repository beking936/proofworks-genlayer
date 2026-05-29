# ProofWorks Spec

> **Status:** Planning/specification only. No implementation code should be written until the MVP scope, architecture, and contract model are approved.

## 0. Project Summary

**ProofWorks** is a GenLayer-native proof-of-fulfillment escrow protocol for human and AI-agent work.

The initial wedge is a **GitHub bounty escrow dApp**:

1. A task creator posts a bounty with clear acceptance criteria.
2. The creator deposits GEN into escrow.
3. A worker claims or submits proof of completion, usually a GitHub issue/PR URL.
4. A GenLayer Intelligent Contract fetches the public evidence and asks validators to determine whether the work satisfies the task requirements.
5. The contract releases, refunds, splits, or requests revision based on the consensus result.

Long-term, ProofWorks becomes a **Proof-of-Fulfillment layer for the agentic economy**, usable by:

- open-source maintainers
- Web3 projects
- hackathon teams
- DAOs
- freelancers
- AI agents
- bounty platforms
- grant programs
- community campaign managers

---

## 1. Core Vision

### 1.1 One-line pitch

**ProofWorks lets anyone create paid tasks whose completion is judged by GenLayer AI-validator consensus, enabling trustless payouts for bounties, freelance work, and AI-agent services.**

### 1.2 Problem

Current bounty/freelance/task platforms have major trust problems:

- Buyers may refuse to pay after receiving work.
- Workers may submit low-quality or incomplete deliverables.
- Centralized platforms hold escrow funds and can delay, censor, or fail payouts.
- Disputes require manual moderation.
- AI agents will need fast, low-cost, programmable arbitration when they transact with one another.

Traditional smart contracts cannot judge subjective completion criteria such as:

- “Does this PR actually fix the issue?”
- “Is this tutorial clear and accurate?”
- “Did the agent produce a useful research report?”
- “Does the deliverable satisfy the agreed requirements?”

GenLayer can evaluate those criteria because Intelligent Contracts can fetch public evidence, call LLMs, and reach consensus over non-deterministic judgments.

### 1.3 Solution

ProofWorks provides:

- on-chain escrow
- task creation
- proof submission
- GenLayer AI adjudication
- structured decision output
- automatic payout/refund/split logic
- public audit trail
- reputation primitives
- later API/SDK access for AI agents

### 1.4 Why GenLayer is essential

ProofWorks should not be a normal smart contract app with AI added off-chain. GenLayer must make the core decision:

> **Does the submitted proof satisfy the task’s acceptance criteria?**

This decision directly controls escrowed funds. Therefore it belongs in an Intelligent Contract, not in a centralized backend.

---

## 2. Product Principles

1. **GenLayer handles only consensus-critical judgment.**
   - Frontend/backend can help with UX, indexing, caching, and notifications.
   - The Intelligent Contract owns task state, escrow state, submitted proofs, adjudication results, and payout decisions.

2. **Every task must have explicit acceptance criteria.**
   - No vague tasks like “do something cool.”
   - The adjudication quality depends on clear rubrics.

3. **Evidence must be public and independently verifiable.**
   - MVP focuses on GitHub URLs because they are public and stable.
   - Later phases can add websites, X posts, documents, IPFS/CID, images, etc.

4. **LLM outputs must be structured.**
   - Final adjudication result should be JSON-like:
     - `decision`
     - `score`
     - `payout_percent`
     - `reason`
     - `confidence`
     - `required_revision`

5. **All side effects happen after consensus.**
   - The nondeterministic block fetches/evaluates evidence.
   - Storage updates and payout messages occur only after a consensus-approved result is returned.

6. **MVP must be narrow, useful, and demonstrable.**
   - The first version should not try to solve all freelance work.
   - It should prove one powerful use case: GitHub bounty escrow.

7. **Every phase should generate public milestone evidence.**
   - Explorer links.
   - GitHub commits.
   - Demo videos.
   - Live deployment.
   - Real tasks.
   - User metrics.

---

## 3. User Personas

### 3.1 Task Creator

A person, DAO, maintainer, or project team that wants work done.

Needs:

- Create a task with clear requirements.
- Deposit bounty funds.
- See submitted proofs.
- Trust that payout only occurs if work satisfies requirements.
- Avoid manually moderating disputes.

### 3.2 Worker

A developer, writer, designer, researcher, or AI agent that completes tasks.

Needs:

- Discover available bounties.
- Understand requirements.
- Submit proof.
- Receive payment if requirements are satisfied.
- Appeal or revise if rejected unfairly.

### 3.3 AI Agent

An autonomous or semi-autonomous agent that performs tasks and expects payment.

Needs:

- Programmatic API/CLI.
- Machine-readable task specs.
- Machine-readable adjudication results.
- Trustless payout.
- Reputation and history.

### 3.4 Steward / Observer

Community members, GenLayer reviewers, or grant evaluators.

Needs:

- Inspect public tasks.
- Verify transaction links.
- See clear evidence of progress.
- Understand how GenLayer is used.

---

## 4. High-Level Architecture

### 4.1 Components

1. **GenLayer Intelligent Contract**
   - Stores task data.
   - Stores proof submissions.
   - Holds or controls escrowed GEN.
   - Runs adjudication against evidence.
   - Stores decision.
   - Emits or triggers payout/refund/split flows.

2. **Frontend dApp**
   - Task marketplace UI.
   - Wallet connection.
   - Create task form.
   - Browse tasks.
   - Submit proof.
   - Trigger evaluation.
   - Show transaction status and adjudication details.

3. **Optional indexing/backend service**
   - Not required for MVP if reads are simple.
   - Later useful for search, filtering, leaderboards, notifications, analytics, and API access.

4. **CLI/API layer for agents**
   - Later phase.
   - Programmatic task creation/submission.
   - Agent-friendly JSON task specs.

5. **Documentation and public milestone hub**
   - README.
   - Architecture docs.
   - Demo videos.
   - Milestone reports.
   - Deployed addresses.

### 4.2 Initial technical stack assumption

- Contracts: GenLayer Python Intelligent Contracts.
- Frontend: TypeScript + React/Next.js or Vite.
- SDK: `genlayer-js`.
- Tests: `genlayer-test`, direct mode tests, integration tests, frontend tests.
- Local runtime: GLSim and/or GenLayer Studio localnet.
- Testnet: Studionet first, Bradbury for public milestone.

Final stack can be adjusted after implementation research.

---

## 5. Target Repository Structure

This is the aspirational file structure. It may be adjusted once implementation begins.

```txt
proofworks/
├── README.md
├── spec.md
├── package.json
├── pnpm-lock.yaml / package-lock.json
├── .gitignore
├── .env.example
├── gltest.config.yaml
│
├── contracts/
│   ├── proofworks_escrow.py
│   ├── proofworks_escrow_v2.py              # later upgrade experiments only
│   └── examples/
│       ├── simple_task.py
│       └── github_bounty_task.py
│
├── tests/
│   ├── direct/
│   │   ├── test_task_creation.py
│   │   ├── test_proof_submission.py
│   │   ├── test_adjudication_mocked.py
│   │   ├── test_payout_logic.py
│   │   ├── test_access_control.py
│   │   └── test_edge_cases.py
│   │
│   ├── integration/
│   │   ├── test_deploy.py
│   │   ├── test_create_submit_evaluate.py
│   │   ├── test_realistic_github_flow.py
│   │   └── test_transaction_lifecycle.py
│   │
│   └── fixtures/
│       ├── github_issue_open.json
│       ├── github_pr_merged.json
│       ├── github_pr_failed_ci.json
│       ├── github_pr_unrelated.json
│       └── llm_responses.json
│
├── frontend/
│   ├── package.json
│   ├── index.html / next.config.js
│   ├── src/
│   │   ├── app/ or pages/
│   │   ├── components/
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── ProofSubmissionForm.tsx
│   │   │   ├── EvaluationResult.tsx
│   │   │   ├── TransactionStatus.tsx
│   │   │   └── Leaderboard.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── genlayerClient.ts
│   │   │   ├── contract.ts
│   │   │   ├── chains.ts
│   │   │   ├── format.ts
│   │   │   └── validation.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWallet.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useTask.ts
│   │   │   └── useTransaction.ts
│   │   │
│   │   ├── types/
│   │   │   ├── task.ts
│   │   │   ├── proof.ts
│   │   │   └── contract.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   └── tests/
│       ├── unit/
│       └── e2e/
│
├── scripts/
│   ├── deploy.ts
│   ├── seedTasks.ts
│   ├── readContract.ts
│   ├── createTask.ts
│   ├── submitProof.ts
│   └── evaluateTask.ts
│
├── docs/
│   ├── architecture.md
│   ├── contract-design.md
│   ├── adjudication-rubrics.md
│   ├── testing-plan.md
│   ├── milestones.md
│   ├── demo-script.md
│   └── research/
│       ├── genlayer-notes.md
│       ├── github-api-notes.md
│       ├── agent-protocols.md
│       └── competitor-analysis.md
│
└── public/
    ├── screenshots/
    └── demo-assets/
```

---

## 6. Contract Model Draft

This is not code. This is the conceptual contract design.

### 6.1 Core enums / string states

Because GenLayer/Python storage constraints need to be validated later, exact enum implementation may be strings or small integers.

Task status:

- `OPEN`
- `CLAIMED`
- `SUBMITTED`
- `EVALUATING`
- `APPROVED`
- `REJECTED`
- `PARTIAL`
- `NEEDS_REVISION`
- `PAID`
- `REFUNDED`
- `CANCELED`
- `EXPIRED`

Decision:

- `APPROVE`
- `REJECT`
- `PARTIAL`
- `NEEDS_REVISION`

Evidence type:

- `GITHUB_PR`
- `GITHUB_ISSUE`
- `URL_DOCUMENT`
- `TEXT_SUBMISSION`
- later: `X_POST`, `IMAGE`, `IPFS_CID`, `AGENT_REPORT`

### 6.2 Task fields

Conceptual task object:

```txt
task_id: u256
creator: Address
assigned_worker: Address or zero address
title: str
description: str
acceptance_criteria: str
evidence_type: str
reward_amount: u256
created_at: u64 or str
deadline: u64
status: str
proof_url: str
proof_text: str
decision: str
score: u32
payout_percent: u32
reason: str
revision_request: str
paid: bool
```

### 6.3 Storage collections

Likely storage:

```txt
next_task_id: u256
tasks: TreeMap[u256, Task]
creator_tasks: TreeMap[Address, DynArray[u256]]       # optional, may be deferred
worker_tasks: TreeMap[Address, DynArray[u256]]        # optional, may be deferred
reputation: TreeMap[Address, Reputation]              # later phase
```

Need to research and validate nested storage support and dataclass patterns before coding.

### 6.4 Public methods draft

MVP candidate methods:

```txt
create_task(title, description, acceptance_criteria, evidence_type, deadline) payable -> task_id
claim_task(task_id) -> None
submit_proof(task_id, proof_url, proof_text) -> None
evaluate_task(task_id) -> None
get_task(task_id) -> dict-like result
get_task_count() -> u256
get_tasks_range(start, limit) -> array-like result
cancel_task(task_id) -> None
```

Later methods:

```txt
request_revision(task_id, message)
resubmit_proof(task_id, proof_url, proof_text)
appeal_decision(task_id, appeal_reason) payable
finalize_task(task_id)
get_reputation(address)
create_agent_task(machine_readable_spec)
```

### 6.5 Payment model

MVP options:

1. **Escrow within the Intelligent Contract**
   - `create_task` is payable.
   - Contract balance increases.
   - On decision, contract sends value to worker or creator.

2. **Accounting-only simulation for earliest local MVP**
   - Use fake internal balances during initial tests.
   - Later replace with real GEN value transfer.

Preferred final MVP: real payable escrow using GEN.

Need additional implementation research:

- Confirm current GenLayer value transfer behavior on Studionet/Bradbury.
- Confirm reliable syntax for sending GEN to EOA from an Intelligent Contract.
- Confirm whether external message payout on `finalized` is required.
- Confirm transaction receipt shape for payout-triggered child transactions.

---

## 7. Adjudication Design

### 7.1 MVP evidence source: GitHub PR URL

The MVP should evaluate a GitHub PR against a bounty spec.

Evidence gathered may include:

- PR title
- PR body
- PR diff or patch summary
- linked issue number
- merge status
- CI/check status if accessible
- changed files list if accessible
- comments/reviews if accessible

Potential issue: GenLayer web access may fetch GitHub HTML pages rather than API endpoints, depending on rate limits and headers. Need research.

### 7.2 Adjudication prompt objectives

The adjudication should answer:

1. Is the submitted proof relevant to the task?
2. Does the PR appear to address the stated requirements?
3. Is the work complete enough for payout?
4. Are there clear signs of mismatch, spam, or unrelated content?
5. Should payout be full, partial, zero, or require revision?

### 7.3 Structured result shape

Target result:

```json
{
  "decision": "APPROVE | REJECT | PARTIAL | NEEDS_REVISION",
  "score": 0,
  "payout_percent": 0,
  "confidence": "LOW | MEDIUM | HIGH",
  "reason": "short explanation",
  "required_revision": "only if needed"
}
```

Validation rules:

- `decision` must be one of allowed values.
- `score` must be integer 0-100.
- `payout_percent` must be:
  - 100 for `APPROVE`
  - 0 for `REJECT`
  - between 1 and 99 for `PARTIAL`
  - 0 for `NEEDS_REVISION` in MVP
- `reason` must be non-empty and length-limited.
- `required_revision` required for `NEEDS_REVISION`.

### 7.4 Equivalence strategy

Preferred MVP approach:

- Use `gl.vm.run_nondet_unsafe` with a leader function and explicit validator function.
- Leader fetches evidence and asks LLM for structured JSON.
- Validator checks leader result structure and may independently run the same evaluation or validate semantic consistency.

Potential simpler early approach:

- Use `prompt_non_comparative` for quick MVP.
- Upgrade to custom validator once core flow works.

Need further research:

- Best current GenLayer API names and syntax for `gl.nondet.web.request`, `gl.nondet.exec_prompt`, and `gl.vm.run_nondet_unsafe` in the target runtime version.
- Whether direct mode supports mocking these exact calls.
- Whether GitHub API responses are stable enough for strict evidence fetching.

### 7.5 Anti-abuse considerations

Risks:

- Creator writes vague criteria to avoid paying.
- Worker submits unrelated PR.
- PR is valid but not merged yet.
- GitHub page changes between validator fetches.
- LLM over-rewards polished but incorrect work.
- Creator and worker collude to farm reputation.

Mitigations by phase:

- MVP: force structured acceptance criteria and public proof.
- Phase 2: add task templates with required fields.
- Phase 3: add revision/appeal.
- Phase 4: add reputation weighting and public task history.
- Phase 5: add creator/worker ratings and fraud flags.

---

## 8. Phase Roadmap

# Phase 0 — Research, Final Scope, and Design Lock

## Goal

Finalize the MVP specification before coding.

## What we aim to build in this phase

No production code. This phase creates the design foundation:

- final MVP scope
- exact contract data model
- adjudication strategy
- frontend UX wireframe
- testing plan
- milestone submission plan
- risk list
- research notes

## Deliverables

- `spec.md`
- `docs/architecture.md`
- `docs/contract-design.md`
- `docs/adjudication-rubrics.md`
- `docs/testing-plan.md`
- `docs/milestones.md`
- simple wireframes or screenshots in `public/demo-assets/`

## Required research

Before coding, research and document:

1. Latest GenLayer contract syntax.
2. Latest GenLayerJS deployment/write/read APIs.
3. Value transfer syntax and limitations.
4. Direct test framework patterns.
5. GitHub API/web access reliability from GenLayer.
6. GenLayer testnet network configuration.
7. Whether `TreeMap[u256, Task]` with `@allow_storage` dataclasses works reliably.
8. Best prompt/validator pattern for structured adjudication.

## How correctness is ensured

- Spec review against GenLayer docs.
- No unresolved “unknowns” for MVP-critical features.
- Every contract method has expected inputs, outputs, and state transitions.
- Every phase has test criteria.

## Implementation approach later

Once approved, coding starts in Phase 1 only.

---

# Phase 1 — Contract Skeleton and Deterministic Task Lifecycle

## Goal

Build the deterministic core of the Intelligent Contract without AI/web adjudication.

## What we aim to build

A GenLayer contract that supports:

- task creation
- task storage
- claiming task
- proof submission
- view task
- cancel task
- basic status transitions
- access control checks

No LLM evaluation yet.

## Contract functionality

### `create_task`

Inputs:

- title
- description
- acceptance criteria
- evidence type
- deadline
- optional assigned worker
- payable reward amount

Expected behavior:

- Reject empty title.
- Reject empty acceptance criteria.
- Reject unsupported evidence type.
- Reject zero reward if payable escrow is enabled.
- Create unique task ID.
- Store task.
- Mark status `OPEN` or `CLAIMED` if assigned worker exists.

### `claim_task`

Expected behavior:

- Only open tasks can be claimed.
- Creator cannot claim own task unless explicitly allowed later.
- Sets `assigned_worker`.
- Sets status `CLAIMED`.

### `submit_proof`

Expected behavior:

- Only assigned worker can submit if task is claimed.
- If task is open, MVP may allow first submitter to become worker.
- Proof URL required for GitHub tasks.
- Sets status `SUBMITTED`.

### `cancel_task`

Expected behavior:

- Only creator can cancel.
- Can cancel only before proof submission.
- Refund logic may be simulated in Phase 1 if value transfer is not implemented yet.

### `get_task`

Expected behavior:

- Returns full task detail.
- Must be JSON-safe enough for frontend consumption.

## How we will code it

Files:

```txt
contracts/proofworks_escrow.py
tests/direct/test_task_creation.py
tests/direct/test_proof_submission.py
tests/direct/test_access_control.py
tests/direct/test_edge_cases.py
```

Contract structure:

- top magic dependency comment
- imports
- `@allow_storage @dataclass Task`
- optional `@allow_storage @dataclass EvaluationResult`
- `class ProofWorksEscrow(gl.Contract)`
- typed persistent fields
- private helper methods for validation
- public view/write methods

## Correctness checks

Direct tests must prove:

- task ID increments correctly
- task fields are stored correctly
- invalid tasks fail
- only creator can cancel
- only assigned worker can submit proof
- status transitions are valid
- invalid transitions fail
- `get_task` returns expected values

## Test cases

1. Create a valid task.
2. Reject task with empty title.
3. Reject task with empty criteria.
4. Reject task with unsupported evidence type.
5. Claim open task.
6. Prevent second worker from claiming claimed task.
7. Submit proof as assigned worker.
8. Reject proof from non-worker.
9. Cancel open task as creator.
10. Reject cancel from non-creator.
11. Reject cancel after proof submission.
12. Read task after every transition.

## Final implementation criteria

Phase 1 is complete when:

- contract lints successfully
- all direct tests pass
- contract deploys locally
- basic methods can be called through integration test or Studio
- README has deterministic lifecycle explanation

---

# Phase 2 — Mocked Adjudication Engine

## Goal

Add evaluation flow without relying on live GitHub or live LLM calls yet.

## What we aim to build

- `evaluate_task(task_id)` method
- mocked nondeterministic adjudication in direct tests
- structured decision parsing
- status update based on decision
- payout calculation stored but not necessarily transferred yet

## Contract functionality

### `evaluate_task`

Expected behavior:

- Can only evaluate `SUBMITTED` tasks.
- Copies needed task fields into local variables before nondet block.
- Runs adjudication function.
- Validates result structure.
- Stores decision, score, payout percent, reason.
- Updates task status:
  - `APPROVED`
  - `REJECTED`
  - `PARTIAL`
  - `NEEDS_REVISION`

## Adjudication result handling

Validation rules:

- Reject unknown decision.
- Reject score outside 0-100.
- Reject payout outside 0-100.
- Enforce decision/payout consistency.
- Truncate or reject overly long reason.

## How we will code it

Files:

```txt
contracts/proofworks_escrow.py
tests/direct/test_adjudication_mocked.py
tests/fixtures/llm_responses.json
docs/adjudication-rubrics.md
```

Implementation details:

- Start with a helper like `_validate_evaluation_result`.
- Nondet block returns dict-like structured result.
- Direct tests use `direct_vm.mock_llm` or equivalent.
- If GenLayer direct mode requires a different mock API, research and adjust.

## Correctness checks

Tests must prove:

1. Approved result updates status to `APPROVED`.
2. Rejected result updates status to `REJECTED`.
3. Partial result stores payout percent.
4. Needs revision stores revision message.
5. Invalid JSON fails safely.
6. Unknown decision fails safely.
7. Out-of-range score fails safely.
8. Evaluation cannot run before proof submission.
9. Evaluation cannot run twice unless explicitly designed.

## Research needed before implementation

- Exact current way to mock `gl.nondet.exec_prompt` in direct tests.
- Whether `response_format="json"` returns Python dict reliably in direct mode.
- Whether exceptions inside nondet blocks propagate as `gl.vm.UserError` or other result types.

## Final implementation criteria

Phase 2 is complete when:

- adjudication flow works with mocked LLM outputs
- all invalid LLM result tests pass
- task status reflects adjudication result
- no real web dependency is required for tests

---

# Phase 3 — Real GitHub Evidence Fetching

## Goal

Make the contract inspect real GitHub evidence.

## What we aim to build

- GitHub PR URL parsing
- GitHub page/API fetching inside GenLayer nondet block
- evidence normalization
- prompt construction from task + GitHub evidence
- real evaluation on local/Studionet environment

## Evidence strategy

Possible sources:

1. GitHub API endpoint:
   - `https://api.github.com/repos/{owner}/{repo}/pulls/{number}`
   - `https://api.github.com/repos/{owner}/{repo}/issues/{number}`
   - `https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files`

2. GitHub HTML page:
   - `https://github.com/{owner}/{repo}/pull/{number}`

Preferred: GitHub API if accessible from GenLayer web module.

## What to fetch for MVP

Minimum evidence:

- PR title
- PR body
- PR state
- merged status if available
- changed files names
- additions/deletions summary if available
- linked issue references if available

Avoid fetching huge diffs in MVP.

## How we will code it

Files:

```txt
contracts/proofworks_escrow.py
tests/direct/test_github_url_parsing.py
tests/direct/test_adjudication_mocked.py
tests/integration/test_realistic_github_flow.py
tests/fixtures/github_pr_merged.json
tests/fixtures/github_pr_unrelated.json
docs/research/github-api-notes.md
```

Contract helper concepts:

```txt
_parse_github_pr_url(url) -> owner, repo, pr_number
_fetch_github_pr_evidence(owner, repo, pr_number) -> normalized evidence str/dict
_build_adjudication_prompt(task_fields, evidence) -> str
_validate_evaluation_result(result) -> EvaluationResult
```

Exact implementation must respect GenLayer restrictions:

- no storage reads inside nondet blocks unless copied first
- no storage writes inside nondet blocks
- all web calls inside nondet block

## Correctness checks

Direct tests:

- parse valid PR URL
- reject invalid GitHub URL
- reject unsupported GitHub paths
- mocked GitHub evidence leads to approve/reject/partial decisions

Integration tests:

- deploy contract
- create GitHub bounty task
- submit a real or controlled GitHub URL
- run evaluation
- inspect stored result

## Research needed

- GitHub rate limits for unauthenticated API calls.
- Whether GenLayer web module allows custom headers.
- Whether GitHub blocks or varies responses by validator.
- Whether GitHub HTML is stable enough for validators.
- Whether to use a small proxy/API later for stable evidence snapshots. If using a proxy, ensure it does not centralize the decision; it should only mirror public evidence.

## Final implementation criteria

Phase 3 is complete when:

- at least one realistic GitHub PR flow evaluates successfully on localnet or Studionet
- evidence fetching is documented
- tests cover invalid and unrelated PRs
- prompt output is structured and validated

---

# Phase 4 — Escrow Value Transfers

## Goal

Implement real GEN escrow and payout/refund/split behavior.

## What we aim to build

- payable `create_task`
- contract balance accounting
- payout to worker
- refund to creator
- split payment for partial decision
- safe finalization flow

## Payment behavior

Decision mapping:

- `APPROVE`: 100% to worker
- `REJECT`: 100% refund to creator
- `PARTIAL`: payout percent to worker, remainder to creator
- `NEEDS_REVISION`: no payment yet, task returns to revision state

## Design questions to answer before coding

1. Should payout happen automatically inside `evaluate_task`?
2. Or should `finalize_task` be called after decision is stored?
3. How do external EOA transfers work on the current GenLayer testnet?
4. Do child transactions need to be tracked?
5. How to prevent double payout?

Preferred design:

- `evaluate_task` stores decision only.
- `finalize_task` executes payment once decision is accepted/finalized.
- This separates adjudication from transfer and makes debugging easier.

## How we will code it

Files:

```txt
contracts/proofworks_escrow.py
tests/direct/test_payout_logic.py
tests/integration/test_value_transfers.py
docs/contract-design.md
```

Contract fields to add:

```txt
reward_amount
paid
payout_percent
```

Methods:

```txt
finalize_task(task_id)
get_contract_balance()
```

## Correctness checks

Tests must prove:

1. Creating task with zero value fails.
2. Reward amount stored equals `gl.message.value`.
3. Approved task computes full worker payout.
4. Rejected task computes full creator refund.
5. Partial task computes split correctly.
6. Finalize cannot be called twice.
7. Non-creator/non-worker cannot steal funds.
8. Needs-revision task cannot be finalized.
9. Canceled task refunds creator.

## Research needed

- Current GenLayer support for sending GEN to EOA.
- Test framework ability to assert balances.
- Whether Studio simulates EOA transfers accurately.
- Whether `emit_transfer` to EOA is finalized-only.

## Final implementation criteria

Phase 4 is complete when:

- testnet demo can show deposit and payout/refund behavior
- double payout is impossible
- task lifecycle and payment lifecycle are documented
- transaction receipts are included in milestone evidence

---

# Phase 5 — Frontend MVP

## Goal

Build a usable dApp frontend around the contract.

## What we aim to build

Pages:

1. Landing page
2. Browse tasks
3. Create task
4. Task detail
5. Submit proof
6. Evaluation result
7. My tasks
8. Basic leaderboard or activity feed

## Frontend requirements

- Connect wallet.
- Switch network.
- Read tasks from contract.
- Create task with GEN value.
- Claim task.
- Submit proof.
- Trigger evaluation.
- Wait for transaction receipt.
- Check execution result, not only tx hash.
- Display contract errors clearly.
- Show explorer links.

## How we will code it

Files:

```txt
frontend/src/lib/genlayerClient.ts
frontend/src/lib/contract.ts
frontend/src/lib/validation.ts
frontend/src/types/task.ts
frontend/src/components/TaskForm.tsx
frontend/src/components/TaskCard.tsx
frontend/src/components/ProofSubmissionForm.tsx
frontend/src/components/EvaluationResult.tsx
frontend/src/components/TransactionStatus.tsx
frontend/src/hooks/useTasks.ts
frontend/src/hooks/useTask.ts
frontend/src/hooks/useTransaction.ts
```

## UI flow details

### Create task form

Fields:

- title
- description
- acceptance criteria
- evidence type
- GitHub issue URL optional
- reward amount
- deadline
- assigned worker optional

Client validation:

- title length
- criteria length
- valid URL if GitHub type
- reward > 0

### Task detail

Show:

- task status
- creator address
- worker address
- reward
- criteria
- proof
- decision
- score
- reason
- transaction links

### Evaluation UX

Because GenLayer evaluation can take time:

- show tx submitted
- show waiting for accepted/finalized
- show status polling
- show final execution result
- show stored decision after re-read

## Correctness checks

Frontend tests:

- form validation
- task card rendering
- transaction status states
- error display
- mocked client calls

E2E tests if feasible:

- create task using localnet/GLSim
- submit proof
- evaluate task
- display result

## Final implementation criteria

Phase 5 is complete when:

- a non-technical user can create and complete a bounty from the UI
- demo video can be recorded
- frontend works against deployed contract address
- README includes setup instructions

---

# Phase 6 — Public MVP Launch and First Real Tasks

## Goal

Turn the prototype into a public proof-of-traction milestone.

## What we aim to build

- public deployment
- public GitHub repo
- demo video
- first real bounties
- public dashboard of completed tasks

## Launch plan

Initial tasks should be about ProofWorks and GenLayer itself, for example:

1. Write a beginner guide to GenLayer nondeterminism.
2. Create a README improvement PR.
3. Build a simple example bounty.
4. Create a logo/banner.
5. Write tests for the contract.
6. Summarize GenLayer docs.
7. Create a tutorial video.

## Metrics to track

- tasks created
- tasks submitted
- tasks approved
- tasks rejected
- total GEN escrowed
- total GEN paid
- unique creators
- unique workers
- average evaluation time
- failed evaluations
- disputed/revision tasks

## Evidence for milestone submission

- live URL
- GitHub repo
- contract address
- explorer links
- screenshots
- demo video
- list of completed tasks
- write-up of what GenLayer adjudicated

## Correctness checks

- Every public task must have a readable task page.
- Every completed task must show proof URL and decision.
- At least 3 completed real tasks before calling it a growth milestone.

## Final implementation criteria

Phase 6 is complete when:

- public MVP is usable
- at least 5 tasks are created
- at least 3 tasks are completed/evaluated
- at least one external user tries it
- project is ready for GenLayer Projects & Milestones submission

---

# Phase 7 — Revision, Appeal, and Dispute Depth

## Goal

Move beyond simple approve/reject into real adjudication workflows.

## What we aim to build

- revision requests
- resubmission
- appeal bond
- second-round evaluation
- stricter appeal prompt
- audit trail of all decisions

## New states

- `REVISION_REQUESTED`
- `RESUBMITTED`
- `APPEALED`
- `FINALIZED`

## New methods

```txt
request_revision(task_id, message)
resubmit_proof(task_id, proof_url, proof_text)
appeal_decision(task_id, appeal_reason) payable
resolve_appeal(task_id)
```

## Appeal design

Possible approach:

- Worker can appeal rejection by posting small bond.
- Creator can appeal approval if evidence is fraudulent.
- Appeal triggers stricter evaluation.
- Appeal result is final for MVP.

Need research:

- How GenLayer native appeal mechanisms interact with application-level appeals.
- Whether we should rely on protocol appeals only or implement app-level appeal workflow.

## Correctness checks

Tests:

- rejected task can be appealed
- approved task can be disputed before finalization if designed
- appeal cannot be spammed indefinitely
- final result prevents further changes
- bond/refund/slashing behavior works if implemented

## Final implementation criteria

Phase 7 is complete when:

- real dispute flow can be demoed
- audit trail clearly shows original result and appeal result
- no infinite appeal loop exists

---

# Phase 8 — Reputation System

## Goal

Add reputation primitives for creators, workers, and agents.

## What we aim to build

- completed task counts
- approval rates
- creator fairness metrics
- worker reliability metrics
- optional badges
- public profiles

## Reputation fields

For each address:

```txt
tasks_created
tasks_completed
tasks_approved
tasks_rejected
tasks_partially_paid
total_earned
total_paid_out
average_score
dispute_count
appeal_success_count
```

## Design considerations

Reputation should not be naive.

Potential abuse:

- Sybil accounts farm fake tasks.
- Creator and worker collude.
- Low-value tasks inflate reputation.

Mitigations:

- Weight by escrow amount.
- Show raw metrics separately.
- Add “verified external project” later.
- Add age/history filters.

## Correctness checks

Tests:

- reputation updates only after finalization
- rejected tasks affect stats correctly
- partial tasks affect stats correctly
- canceled tasks do not count as completed
- double finalization does not double count

## Final implementation criteria

Phase 8 is complete when:

- user profile pages work
- contract stores basic reputation
- frontend displays reputation transparently

---

# Phase 9 — Agent API and CLI

## Goal

Make ProofWorks usable by AI agents and automated workflows.

## What we aim to build

- CLI to create/list/submit/evaluate tasks
- machine-readable task schema
- API docs
- sample agent workflow
- optional MCP/x402/ERC-8004 research integration plan

## CLI commands

Potential commands:

```bash
proofworks create-task --title "..." --criteria "..." --reward 10gen
proofworks list-tasks
proofworks get-task 1
proofworks claim-task 1
proofworks submit-proof 1 --url https://github.com/owner/repo/pull/1
proofworks evaluate 1
proofworks finalize 1
```

## API design

Agent-readable JSON task spec:

```json
{
  "task_id": "1",
  "title": "Fix README typo",
  "description": "...",
  "acceptance_criteria": ["...", "..."],
  "evidence_type": "GITHUB_PR",
  "reward": "10 GEN",
  "deadline": "...",
  "submission_schema": {
    "proof_url": "required"
  }
}
```

## Research needed

- x402 payment flow relevance.
- ERC-8004 agent identity/reputation compatibility.
- A2A/MCP conventions for agent task negotiation.
- Whether ProofWorks should expose an MCP server.

## Correctness checks

Tests:

- CLI command validation
- CLI reads contract correctly
- CLI submits transactions correctly
- sample agent can complete a local mocked task

## Final implementation criteria

Phase 9 is complete when:

- a scripted agent can create or complete a ProofWorks task
- CLI is documented
- public demo shows agent-to-agent style task flow

---

# Phase 10 — Multi-Evidence Templates

## Goal

Expand beyond GitHub bounties into general proof-of-work templates.

## Evidence templates

1. GitHub PR
2. GitHub issue resolution
3. Blog/article URL
4. Documentation/tutorial submission
5. Research report
6. X/Twitter post or thread
7. Website delivery
8. Design/image proof
9. Data collection proof
10. AI-agent report

## Template structure

Each template defines:

- required fields
- evidence fetcher
- prompt template
- result validation rules
- payout policy

## How we will code it

Potential file additions:

```txt
contracts/templates/github.py       # if multi-file contract packaging is supported; otherwise copy patterns
contracts/proofworks_escrow.py      # may include all template logic if single-file required
frontend/src/lib/templates.ts
frontend/src/components/templates/
```

Need research:

- GenLayer contract dependency/import limitations.
- Whether all template logic must live in one contract file.
- Whether contract size becomes an issue.

## Correctness checks

For each template:

- valid evidence accepted
- invalid evidence rejected
- malformed URL rejected
- prompt result validated
- frontend form enforces required fields

## Final implementation criteria

Phase 10 is complete when:

- at least 3 templates work end-to-end
- docs explain how to add a new template
- public demo shows more than GitHub bounties

---

# Phase 11 — Growth Dashboard and Analytics

## Goal

Make ProofWorks look and feel like a real ecosystem project.

## What we aim to build

- public analytics dashboard
- task activity feed
- completed tasks page
- leaderboard
- total escrowed/paid metrics
- success/failure breakdown

## Possible backend/indexer

If contract reads become inefficient, add a lightweight backend/indexer.

Responsibilities:

- poll contract state
- cache task metadata
- provide search/filter API
- never make adjudication decisions
- never control funds

## Correctness checks

- Backend data must match contract state.
- Dashboard must link back to source contract reads/transactions.
- If backend is down, core contract still works.

## Final implementation criteria

Phase 11 is complete when:

- metrics are public
- traction can be screenshotted for milestone submissions
- external users can browse proof of activity

---

# Phase 12 — Security, Robustness, and Mainnet Readiness

## Goal

Prepare the protocol for serious usage.

## Areas to harden

1. Access control
2. Payment safety
3. Double payout prevention
4. Malformed evidence handling
5. LLM prompt injection
6. GitHub/API failures
7. Ambiguous task criteria
8. Storage layout compatibility
9. Upgradeability decisions
10. Economic abuse

## Security checklist

- No payout without final decision.
- No double finalization.
- No creator cancellation after valid submission unless expired/rejected.
- No worker proof overwrite after evaluation except revision flow.
- No arbitrary recipient payout.
- All URLs validated.
- LLM output schema enforced.
- Reasons length-limited.
- Deadline behavior deterministic.
- Appeal loops bounded.

## Testing

- fuzz-ish tests for invalid inputs where possible
- edge case tests
- integration tests on testnet
- manual adversarial testing
- bug bounty issue template

## Final implementation criteria

Phase 12 is complete when:

- security review checklist is complete
- known limitations are documented
- contract is stable on Bradbury
- project can be pitched for grants/mainnet support

---

## 9. Testing Strategy

### 9.1 Test layers

1. **Contract direct tests**
   - Fastest feedback.
   - Test deterministic logic and mocked nondet flows.

2. **Contract integration tests**
   - Deploy to localnet/Studionet.
   - Exercise real transaction lifecycle.

3. **Consensus behavior tests**
   - Validate equivalence logic.
   - Ensure ambiguous/invalid outputs fail safely.

4. **Frontend unit tests**
   - Form validation.
   - Component rendering.
   - Client wrappers.

5. **Frontend E2E tests**
   - Browser workflow if feasible.

6. **Manual testnet scripts**
   - Deploy.
   - Seed tasks.
   - Complete flows.
   - Generate milestone evidence.

### 9.2 Contract test categories

- Task creation
- Proof submission
- Adjudication parsing
- Payment logic
- Access control
- Invalid transitions
- Deadline behavior
- Revision/appeal later
- Reputation later
- Web failure handling
- LLM malformed output handling

### 9.3 Frontend test categories

- Wallet not connected
- Wrong network
- Create task validation
- Submit proof validation
- Transaction pending
- Transaction accepted
- Transaction finalized
- Execution failed
- Read refresh after write
- Empty states
- Error states

---

## 10. Research Backlog

This project requires continuous research before and during implementation.

### 10.1 GenLayer-specific research

- Current best contract dependency header.
- Current SDK method names.
- `gl.nondet.web.request` vs older `gl.get_webpage` usage.
- `gl.eq_principle` namespace details.
- `gl.vm.run_nondet_unsafe` exact API.
- Direct mode test APIs.
- Value transfer to EOA.
- Contract balance behavior.
- Transaction receipt structure in `genlayer-js`.
- Explorer URL formats.
- Studionet vs Bradbury differences.

### 10.2 GitHub evidence research

- API rate limits.
- Stable fields.
- HTML rendering stability.
- PR file list endpoint.
- CI/check endpoint accessibility.
- Linked issue detection.
- Whether authentication headers are possible or undesirable.

### 10.3 AI adjudication research

- Prompt injection attacks from PR text.
- JSON reliability.
- How to compare semantic decisions safely.
- Whether to use comparative or non-comparative principles.
- Best confidence thresholds.
- How to handle ambiguous work.

### 10.4 Agent economy research

- x402 payment flows.
- ERC-8004 identity/reputation.
- A2A protocol.
- MCP server design.
- Existing agent marketplaces.
- Agent escrow competitors.

### 10.5 Legal/compliance research

- Avoid positioning as legal arbitration.
- Use “proof-of-fulfillment” and “agreed settlement workflow.”
- Avoid claims that decisions are legally binding.
- Avoid regulated employment/payment claims.

---

## 11. Milestone Submission Strategy

ProofWorks should be designed to produce multiple legitimate submissions.

### 11.1 Builder points-friendly artifacts

- Deployed contract
- Public GitHub repository
- Technical article
- Tutorial/documentation
- Developer tool/CLI later
- Demo video
- Public dApp
- Real usage metrics

### 11.2 Suggested milestone submissions

1. Project proposal/spec published.
2. Contract skeleton deployed.
3. Deterministic task lifecycle complete.
4. AI adjudication working with mocks.
5. GitHub evidence evaluation working.
6. Escrow payout working.
7. Frontend MVP live.
8. First real bounty completed.
9. Revision/appeal flow shipped.
10. Agent CLI/API shipped.
11. Multi-template proof system shipped.
12. Growth dashboard with metrics shipped.

### 11.3 Evidence to keep for every milestone

- Date
- Short description
- GitHub commit/PR link
- Contract address if relevant
- Transaction hash if relevant
- Screenshots
- Demo video if possible
- What changed
- What was tested
- Known limitations
- Next milestone

---

## 12. MVP Definition

The MVP is complete when the following is true:

1. A user can connect wallet.
2. A user can create a GitHub bounty task with GEN escrow.
3. Another user can claim or submit proof.
4. The contract can evaluate the GitHub proof using GenLayer.
5. The result is stored in contract state.
6. Funds can be released/refunded/split according to decision.
7. The frontend shows the full lifecycle.
8. At least one public demo task is completed.
9. Contract and frontend have tests.
10. The repository has clear documentation.

---

## 13. Non-Goals for MVP

Do not build these in the MVP:

- Full freelance marketplace.
- Multi-chain settlement.
- ERC-20 payments.
- Full AI-agent protocol.
- Private evidence.
- Legal arbitration system.
- Complex DAO governance.
- Sophisticated reputation.
- Mobile app.
- Advanced search/indexing.
- Token launch.

These can come later.

---

## 14. Major Risks and Mitigations

### Risk 1: GitHub data is unstable across validators

Mitigation:

- Fetch stable API fields only.
- Normalize fields.
- Avoid volatile counts/timestamps.
- Use derived summaries.
- Consider evidence snapshots later.

### Risk 2: LLM decisions are inconsistent

Mitigation:

- Use structured JSON.
- Use strict allowed decisions.
- Validate outputs.
- Use clear rubrics.
- Start with constrained GitHub tasks.

### Risk 3: Payment transfer complexity

Mitigation:

- Separate decision from finalization.
- Test value transfer thoroughly.
- Start with simulated accounting if necessary, then upgrade.

### Risk 4: Scope creep

Mitigation:

- MVP only supports GitHub bounty tasks.
- Other templates are later phases.

### Risk 5: Abuse/fake tasks

Mitigation:

- Public task history.
- Reputation weighted by escrow amount later.
- Clear disclaimers.

### Risk 6: Frontend depends too much on backend

Mitigation:

- Keep contract as source of truth.
- Backend/indexer optional only.

---

## 15. Success Metrics

### MVP success

- 1 deployed contract
- 1 working frontend
- 3 completed demo tasks
- 1 public demo video
- 1 technical write-up

### Early growth success

- 25 tasks created
- 10 tasks completed
- 5 unique workers
- 3 unique creators
- at least 1 AI-agent demo
- at least 1 external project tries it

### Strong ecosystem success

- 100+ tasks
- 25+ users
- reusable CLI/API
- multiple evidence templates
- GenLayer community recognition
- eligible for grant/milestone amplification

---

## 16. Final Aspirational Product

The final version of ProofWorks should become:

> **A trustless work-settlement network where humans and AI agents can safely transact around tasks, deliverables, and proofs without relying on centralized moderators.**

It should support:

- bounty escrow
- freelance milestones
- AI-agent subcontracting
- DAO grant milestones
- creator campaign payouts
- open-source issue rewards
- public reputation
- programmable task APIs
- GenLayer-powered dispute resolution

ProofWorks should be to work fulfillment what escrow is to payments and what courts are to disputes — except internet-native, programmable, and powered by GenLayer’s decentralized AI-validator consensus.
