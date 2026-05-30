# ProofWorks Phase 6 Spec — Evidence Room, Issue→PR Escrow, Revision Flow

Status: **planning only**. No code changes in this file. This spec describes how to evolve the current MVP into a more grant-worthy, realistic GenLayer product.

Current live Studionet contract before Phase 6:

```txt
0x5E992bBc2De02C3878d2623A7C3bEc9603aB651A
```

Current public frontend:

```txt
https://tommycet.github.io/proofworks-genlayer/
```

Current dev Codespace frontend:

```txt
https://proofworks-live-v6w7rx57965whwj4-5173.app.github.dev/
```

---

## 1. Why Phase 6 Exists

The current MVP proves the core technical loop:

```txt
create task → submit proof → GenLayer evaluates → finalize payout
```

But as product UX, it still feels too simple. The current “Bounty Architect” imports a GitHub URL and drafts a task, but if the user imports a PR URL and later submits that same PR URL as proof, the flow feels circular.

The product needs a clearer real-world use case:

```txt
GitHub Issue / Work Spec → funded escrow task
GitHub PR / Deliverable → submitted proof
GenLayer AI validators → adjudicate whether proof satisfies source task
Escrow → releases/refunds/splits payment
```

This turns ProofWorks from “task form + AI verdict” into a real **evidence-based work settlement product**.

---

## 2. Research Summary

### 2.1 GenLayer grant fit

GenLayer grants prioritize AI-powered applications that use Intelligent Contracts for real-world logic such as performance-based payments, prediction markets, dispute resolution, and governance systems. Evaluation criteria emphasize technical feasibility and ecosystem impact most heavily.

Implication for ProofWorks:

- We should not position this as a generic bounty board.
- We should position it as **performance-based payment and dispute resolution for work**, where GenLayer is essential because validators evaluate ambiguous evidence.

### 2.2 Bounty marketplace research

Modern bounty products emphasize:

- GitHub issue import
- GitHub PR submission
- clear scoped requirements
- dedicated bounty management UI
- transparent tracking
- claim/in-progress/complete states
- dispute handling
- reputation
- crowdfunding or escrowed bounty pools

Key product lesson:

> The source of work and the proof of work must be separate objects.

For open source:

```txt
source = GitHub issue
proof = GitHub pull request
```

For general work:

```txt
source = manual agreement / URL spec
proof = URL / document / image / text / PR
```

### 2.3 GitHub API research

GitHub does not provide one perfect REST endpoint for “all linked issues for a PR.” Practical options:

1. Use issue/PR body keywords such as `Fixes #123`, `Closes #123`, `Resolves #123`.
2. Use issue timeline events, especially `cross-referenced`.
3. Parse PR body and commit messages.
4. Use a required PR template field.

GitHub official docs state that closing keywords can link PRs to issues, and PRs targeting the default branch can close linked issues when merged.

Implication for ProofWorks:

- We should not rely solely on GitHub’s linked issue metadata.
- The task creator should explicitly store `source_url` when creating the bounty.
- During evaluation, validators compare the submitted PR against the explicit source issue/spec.

### 2.4 Escrow/dispute research

Escrow systems like Kleros and Upwork-style fixed-price contracts share common patterns:

- funds are locked before work begins
- workers submit deliverables
- payer approves, requests changes, or disputes
- evidence can be submitted by both parties
- appeals/revisions may happen before final release
- partial outcomes may split funds
- timeouts prevent funds from being stuck forever

Implication for ProofWorks:

- `NEEDS_REVISION` must support actual resubmission.
- Partial payout should include reason codes/missing requirements.
- There should be a clear Evidence Room and Settlement Preview.

---

## 3. Phase 6 Product Goal

Phase 6 turns ProofWorks into:

> **An evidence-based escrow court for open-source and agent work.**

The core user story:

```txt
A maintainer imports a GitHub issue and funds escrow.
A worker submits a GitHub PR.
GenLayer validators inspect the issue, PR metadata, changed files, and criteria.
The contract decides whether to approve, reject, partially pay, or request revision.
The escrow settles only after finalization.
```

---

## 4. Phase 6 Scope

Phase 6 is split into subphases.

## Phase 6A — Contract: Source URL + Issue→PR Evaluation

### Goal

Separate task source from proof submission.

Current contract only has:

```python
proof_url: str
proof_text: str
```

Phase 6 adds:

```python
source_type: str
source_url: str
source_snapshot: str  # optional compact snapshot or blank for MVP
revision_count: u32
max_revisions: u32
```

### New source types

```python
SOURCE_MANUAL = "MANUAL"
SOURCE_GITHUB_ISSUE = "GITHUB_ISSUE"
SOURCE_GITHUB_PR = "GITHUB_PR"  # retroactive review mode only
SOURCE_URL_SPEC = "URL_SPEC"
```

### Evidence types remain

```python
EVIDENCE_TEXT_SUBMISSION
EVIDENCE_GITHUB_PR
EVIDENCE_URL_DOCUMENT
```

### Correct flows

#### 1. Manual task

```txt
source_type = MANUAL
source_url = ""
evidence_type = TEXT_SUBMISSION / URL_DOCUMENT / GITHUB_PR
```

#### 2. GitHub issue bounty

```txt
source_type = GITHUB_ISSUE
source_url = https://github.com/org/repo/issues/123
evidence_type = GITHUB_PR
proof_url = https://github.com/org/repo/pull/456
```

#### 3. Retroactive PR review

```txt
source_type = GITHUB_PR
source_url = https://github.com/org/repo/pull/456
evidence_type = GITHUB_PR
proof_url = https://github.com/org/repo/pull/456
```

The frontend must clearly label this as “retroactive review,” not a bounty.

### Contract API changes

Existing `create_task` currently:

```python
create_task(title, description, acceptance_criteria, evidence_type, deadline, assigned_worker)
```

Phase 6 version:

```python
create_task(
    title: str,
    description: str,
    acceptance_criteria: str,
    source_type: str,
    source_url: str,
    evidence_type: str,
    deadline: int,
    assigned_worker: str,
    max_revisions: int,
) payable -> u256
```

### Backward compatibility

Since this is still testnet and contract is redeployed frequently, we can break ABI and deploy a new Studionet contract.

Frontend must update to the new contract address after deployment.

### New helper functions

Add:

```python
_parse_github_issue_url(url: str) -> dict
_parse_github_pr_url(url: str) -> dict  # already exists, extend if needed
_fetch_github_issue_evidence(...)
_fetch_github_pr_evidence(...)
_compact_github_issue_evidence(...)
_compact_github_pr_evidence(...)
_build_issue_pr_adjudication_prompt(...)
```

### Evaluation behavior

If:

```python
source_type == GITHUB_ISSUE and evidence_type == GITHUB_PR
```

Then leader function fetches:

- GitHub issue metadata
- GitHub PR metadata
- GitHub PR changed files

Optional later:

- issue comments
- PR reviews
- PR checks
- timeline events

MVP Phase 6 fetches only issue + PR + files to minimize instability.

### Prompt objective

The LLM must answer:

```txt
Does the submitted PR materially satisfy the source GitHub issue and acceptance criteria?
```

Prompt should include:

- task title
- task description
- acceptance criteria
- source issue compact evidence
- submitted PR compact evidence
- changed files summary

### Result shape

Phase 6 expands result schema:

```json
{
  "decision": "APPROVE | REJECT | PARTIAL | NEEDS_REVISION",
  "score": 0,
  "payout_percent": 0,
  "confidence": "LOW | MEDIUM | HIGH",
  "reason": "short explanation",
  "reason_code": "SOLVES_ISSUE | UNRELATED_PR | INCOMPLETE_SCOPE | NEEDS_TESTS | NEEDS_REVIEW | AMBIGUOUS | OTHER",
  "missing_requirements": ["..."],
  "required_revision": "..."
}
```

### Storage additions

Task dataclass additions:

```python
source_type: str
source_url: str
revision_count: u32
max_revisions: u32
reason_code: str
missing_requirements: str  # JSON string to avoid complex storage list for now
```

### Status changes

Existing:

```txt
OPEN, CLAIMED, SUBMITTED, APPROVED, REJECTED, PARTIAL, NEEDS_REVISION, PAID, REFUNDED, PARTIALLY_PAID, CANCELED
```

Add:

```txt
RESUBMITTED
REVISION_EXHAUSTED
```

Maybe `RESUBMITTED` can simply be `SUBMITTED` with `revision_count > 0` to avoid state bloat.

### Contract tests

Add tests:

1. Create manual task with no source URL.
2. Create GitHub issue bounty with valid issue URL.
3. Reject invalid issue URL for `GITHUB_ISSUE`.
4. Submit GitHub PR proof for GitHub issue bounty.
5. Reject non-PR proof for GitHub issue bounty.
6. Mock issue + PR + files fetch and approve.
7. Mock issue + unrelated PR and reject.
8. Mock partial decision with missing requirements.
9. Mock needs revision with missing tests.
10. Validate reason_code and missing_requirements storage.

### Direct test fixtures

Add:

```txt
tests/fixtures/github_issue_43.json
tests/fixtures/github_pr_43.json
tests/fixtures/github_pr_files_43.json
```

Or inline fixtures in tests if small.

### Studionet deployment test

After local tests:

1. Deploy new contract to Studionet.
2. Create GitHub issue bounty using a public issue.
3. Submit PR proof.
4. Run `evaluate_task`.
5. Confirm result is not `INVALID_GITHUB_PR_URL`.
6. Confirm result stores issue and PR evidence-based decision.
7. Finalize if not `NEEDS_REVISION`.

Record:

- new contract address
- deploy tx
- create tx
- submit tx
- evaluate tx
- finalization tx if applicable

---

## Phase 6B — Contract: Revision / Resubmission Flow

### Goal

Make `NEEDS_REVISION` actionable.

Current behavior:

- `NEEDS_REVISION` blocks finalization.
- There is no way to fix proof.

Add:

```python
resubmit_proof(task_id: int, proof_url: str, proof_text: str) -> None
```

### Rules

- Only assigned worker can resubmit.
- Task must be `NEEDS_REVISION`.
- `revision_count < max_revisions`.
- New proof must satisfy proof validation rules.
- Clear evaluation fields:
  - `evaluated = False`
  - `decision = ""`
  - `score = 0`
  - `payout_percent = 0`
  - `confidence = ""`
  - `reason = ""`
  - `reason_code = ""`
  - `required_revision = ""`
  - `missing_requirements = ""`
- Set status back to `SUBMITTED`.
- Increment `revision_count`.

### Tests

1. `NEEDS_REVISION` task can be resubmitted.
2. Non-worker cannot resubmit.
3. Cannot resubmit after approval/rejection/partial.
4. Cannot resubmit after max revisions.
5. Resubmission clears old decision fields.
6. Resubmitted task can be evaluated again.
7. Finalize works after resubmitted approval.

### Studionet test

Use a task with criteria that likely triggers revision, or temporarily use a text task with ambiguous proof.

Run:

```txt
create → submit bad proof → evaluate NEEDS_REVISION → resubmit better proof → evaluate APPROVE → finalize
```

If live LLM does not reliably return `NEEDS_REVISION`, use direct tests as primary proof and do a manual Studionet flow where possible.

---

## Phase 6C — Frontend: Case Builder Modes

### Goal

Replace/reframe “Bounty Architect” into **Case Builder** with three explicit modes.

### Modes

#### 1. GitHub Issue Bounty

Input:

```txt
GitHub issue URL
```

Output:

- title from issue
- description from issue
- source_type = GITHUB_ISSUE
- source_url = issue URL
- evidence_type = GITHUB_PR
- criteria generated from issue
- proof URL left empty

UI copy:

```txt
Fund an issue. Worker submits a PR later.
```

#### 2. Retroactive PR Review

Input:

```txt
GitHub PR URL
```

Output:

- source_type = GITHUB_PR
- source_url = PR URL
- evidence_type = GITHUB_PR
- proof_url = PR URL

UI warning:

```txt
This reviews already-submitted work. It is not a bounty for future work.
```

#### 3. Manual Escrow

Input:

- no GitHub import required
- user writes description/criteria manually

Output:

- source_type = MANUAL
- source_url = ""

### Frontend form changes

Add fields:

```txt
source_type
source_url
max_revisions
```

Task creation payload updates to match new contract ABI.

### Task detail changes

Add “Evidence Room” panel.

---

## Phase 6D — Frontend: Evidence Room

### Goal

Make each task feel like a real GenLayer court case.

### UI sections

Task detail should show:

```txt
Case File
├── Agreement
│   ├── title
│   ├── description
│   ├── acceptance criteria
│   └── source URL
├── Submitted Proof
│   ├── proof URL
│   └── proof text
├── Evidence Packet
│   ├── source type
│   ├── evidence type
│   ├── GitHub issue/PR preview if available from frontend import
│   └── normalized fetch status
├── AI Jury Verdict
│   ├── decision
│   ├── score
│   ├── confidence
│   ├── reason code
│   ├── missing requirements
│   └── required revision
├── Settlement Preview
│   ├── worker payout
│   ├── creator refund
│   └── finalization requirement
└── Audit Trail
    ├── created
    ├── submitted
    ├── evaluated
    ├── resubmitted count
    └── finalized
```

### Settlement Preview

If evaluated and not finalized:

```txt
If finalized now:
Worker receives: X
Creator refund: Y
Final status: PAID / REFUNDED / PARTIALLY_PAID
```

If decision is `NEEDS_REVISION`:

```txt
Cannot finalize. Worker must resubmit proof.
```

### Button gating

Disable/hide buttons when invalid:

- Submit proof disabled if task finalized/canceled.
- Evaluate disabled unless status is `SUBMITTED`.
- Finalize disabled unless evaluated and decision != `NEEDS_REVISION`.
- Resubmit disabled unless status is `NEEDS_REVISION`.
- Cancel disabled after submission/evaluation/finalization.

This reduces confusing failed transactions.

---

## Phase 6E — Frontend: Resubmission UX

### Add Resubmit Proof panel

If selected task status is `NEEDS_REVISION`:

Show:

- required revision message
- missing requirements
- proof URL input
- proof text input
- resubmit button

After resubmission:

- refresh task
- show transaction wire
- task returns to `SUBMITTED`
- user can run AI jury again

---

## Phase 6F — Public Testing and Deployment

### Local validation

Run:

```bash
make validate-all
```

Expected:

- all direct tests pass
- GenVM lint/validation pass
- frontend build passes

### Deploy new Studionet contract

Use scripted deployment:

```bash
PRIVATE_KEY=<burner> NETWORK=studionet npm run deploy:studionet
```

Or generate burner in script.

Record new contract address.

### Update frontend contract address

Files:

```txt
frontend/src/lib/contract.ts
frontend/.env.example
README.md
docs/*.md where relevant
```

### Deploy frontend

Use:

```bash
./scripts/deploy-gh-pages.sh
```

Also update Codespace dev server:

```bash
ssh into codespace
cd /workspaces/proofworks-genlayer
git fetch origin main
git reset --hard origin/main
npm --prefix frontend install
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

### Public URLs

Stable:

```txt
https://tommycet.github.io/proofworks-genlayer/
```

Dev:

```txt
https://proofworks-live-v6w7rx57965whwj4-5173.app.github.dev/
```

---

## 5. Expected GitHub PR User Flow After Phase 6

### Creator

1. Opens ProofWorks.
2. Clicks Case Builder.
3. Selects `GitHub Issue Bounty`.
4. Pastes GitHub issue URL.
5. App imports issue and drafts task.
6. Creator reviews criteria and funds escrow.

### Worker

1. Selects task.
2. Reads Evidence Room.
3. Submits GitHub PR URL.
4. Runs AI jury or creator/worker runs AI jury.
5. If approved, finalize payout.
6. If revision requested, worker resubmits.

### GenLayer

Validators evaluate:

```txt
source issue + acceptance criteria + submitted PR + changed files
```

Then decide:

```txt
APPROVE / REJECT / PARTIAL / NEEDS_REVISION
```

---

## 6. What We Will Not Build in Phase 6

Do not build yet:

- full reputation system
- crowdfunding bounty pools
- ERC-8004 identity
- x402 payment integration
- multi-token payments
- full appeal bond system
- backend database/indexer
- GitHub OAuth/App installation
- private repository support

Reason: Phase 6 should stay realistic and testable on Studionet.

---

## 7. Risks and Mitigations

### Risk: GitHub API rate limits

Mitigation:

- Fetch only issue, PR, and files endpoints.
- Avoid comments/timeline in contract for now.
- Frontend can import richer preview client-side, but contract should use minimal stable evidence.

### Risk: LLM returns malformed JSON

Mitigation:

- Keep strict validation.
- Expand direct tests for invalid `reason_code` and `missing_requirements`.

### Risk: Issue→PR relation is ambiguous

Mitigation:

- Require explicit `source_url` and `proof_url`.
- Prompt validators to compare them directly.
- Do not depend on GitHub’s linked issue API.

### Risk: Contract ABI break requires redeployment

Mitigation:

- Testnet project; redeployment acceptable.
- Record new deployment in docs.
- Update frontend default address.

### Risk: Frontend import and contract evidence disagree

Mitigation:

- Frontend import is convenience only.
- Contract fetches evidence independently during evaluation.
- UI must say “contract re-fetches evidence during AI jury.”

---

## 8. Grant Narrative After Phase 6

After Phase 6, ProofWorks can be pitched as:

> ProofWorks is a GenLayer-powered escrow protocol for open-source and agent work. Maintainers fund GitHub issues, workers submit PRs, and GenLayer validators adjudicate whether the PR satisfies the issue and acceptance criteria. The contract supports partial payouts, revision requests, transparent evidence rooms, and finality-aware settlement. This demonstrates performance-based payments, dispute resolution, and AI-native coordination with real public web evidence.

This maps directly to GenLayer’s grant categories:

- performance-based payments
- dispute resolution
- real-world web data
- AI-powered applications
- testnet integrations
- long-term agent economy infrastructure

---

## 9. Implementation Order

1. Contract storage/API update for `source_type`, `source_url`, revisions, reason codes.
2. Direct tests for create/submit/evaluate new source/proof flow.
3. Direct tests for resubmission.
4. GenVM lint/validation.
5. Deploy new Studionet contract.
6. Smoke test issue→PR flow on Studionet.
7. Update frontend forms/API calls.
8. Add Evidence Room and Settlement Preview.
9. Deploy GitHub Pages.
10. Restart Codespace dev server.
11. Update docs and push to GitHub.

---

## 10. Success Criteria

Phase 6 is complete when:

- `make validate-all` passes.
- New contract is deployed to Studionet.
- GitHub issue bounty can be created.
- GitHub PR proof can be submitted.
- AI jury evaluates issue vs PR, not just PR alone.
- `NEEDS_REVISION` can be resubmitted.
- Frontend shows Evidence Room and Settlement Preview.
- Public GitHub Pages URL is updated.
- Codespace dev URL is running.
- Repo is pushed to GitHub.
