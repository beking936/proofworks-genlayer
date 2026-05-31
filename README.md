# ProofWorks

A GenLayer escrow contract that pays out GitHub bounties when AI validators agree the work actually got done.

A creator posts a task with acceptance criteria and locks GEN. A worker claims it, submits a pull request, and the contract asks GenLayer validators to read the issue, the PR, and the changed files, then return a structured verdict. If consensus says the work is good, the worker gets paid. If not, the creator gets refunded, or a partial split happens, or the worker gets asked for a revision.

That is the whole product in one paragraph. The rest of this README is how to run it, what is deployed, and what is still in progress.

## Live demo

- Frontend: https://tommycet.github.io/proofworks-genlayer/
- Studionet contract: `0x5E992bBc2De02C3878d2623A7C3bEc9603aB651A`
- Walkthrough video: _coming soon, will be linked here_

The Pages site connects directly to the Studionet contract. You can switch between Creator, Worker, and Juror roles in the burner wallet panel without needing a real funded account, so the whole flow is testable in a browser tab.

## Why this needs GenLayer

A normal smart contract cannot answer "does this PR actually fix the issue." That question is subjective, depends on reading code and prose, and would normally need a human reviewer or a centralized backend with an API key.

GenLayer lets the contract itself ask that question. Validators independently fetch the GitHub issue and PR, run an LLM against a structured prompt, and converge on a JSON verdict through Optimistic Democracy consensus. The contract then moves money based on the result. No off-chain server is allowed to influence the verdict, which is the only reason any of this is trustless.

That design constraint shaped the whole contract. Every field the LLM returns is bounded (enums, integer ranges, capped string lengths), validated by a deterministic function before being accepted, and wrapped in `<untrusted_user_content>` tags in the prompt to blunt jailbreak attempts.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full set of diagrams (sequence, components, state machine). The short version:

```
Creator → IC.create_task → escrow funded
Worker  → IC.claim_task  → optional stake locked
Worker  → IC.submit_proof(PR URL)
IC      → run_nondet_unsafe → validators fetch GitHub + call LLM
IC      → consensus verdict stored on-chain
IC      → finalize_task → payout / refund / split / revision
```

## What is in the repo

```
contracts/proofworks_escrow.py     Intelligent Contract (~1.7k lines, single class)
tests/direct/                      89 pytest direct-mode tests, one file per phase
frontend/                          React 19 + Vite + genlayer-js, CRT terminal styling
server/github-proxy.mjs            Authenticated GitHub fetch proxy used by the UI
scripts/                           deploy.ts, schema.ts, deploy-and-test.sh, etc.
docs/                              Per-phase implementation notes, deployments, architecture
spec.md                            The original planning spec
spec-phase6.md                     The Phase 6 evolution spec
genlayer_research_brief.md         My own notes on the GenLayer SDK while building this
```

## Feature list

Phases 1 through 9 are implemented and tested. In rough order of "core" to "advanced":

- Task lifecycle: create, claim, submit, evaluate, finalize, cancel.
- GitHub issue and PR URL parsing with aggressive normalization so validators converge on the same canonical URL.
- AI adjudication returning `{decision, score, payout_percent, confidence, reason, reason_code, missing_requirements, required_revision}`.
- Same-repository check between source issue and submitted PR.
- Escrow finalization with explicit `APPROVED`, `REJECTED`, `PARTIAL`, `NEEDS_REVISION` paths.
- Revision flow with a `max_revisions` cap.
- Claim expiry: anyone can call `release_expired_claim` to free a stale claim.
- Per-address reputation counters (created, completed, approved, rejected, partial, canceled, GEN earned/paid/refunded).
- Worker staking: creators can require X% collateral on claim; forfeited 50/50 to creator/treasury if the worker no-shows.
- Milestones: up to three sub-tasks per bounty, each adjudicated and finalized independently.
- Appeals: losing party posts a bond, three designated jurors vote, 2-of-3 majority decides.
- Flagging window: anyone can stake a small bond to flag an AI verdict before it finalizes, escalating to juror arbitration.
- Team splits and tips: creators can register a team with percentages, payouts auto-distribute, and tips can be sent after finalization.

## Running it locally

Install:

```bash
pip install -r requirements.txt
npm install
npm --prefix frontend install
```

Run the test suite:

```bash
make test
```

You should see `89 passed`. If you do not, something in the GenVM linker or the genlayer-test version mismatches what is pinned in `requirements.txt`, and the Makefile target also runs `scripts/setup_genvmroot.py` to fix that.

Lint the contract:

```bash
make lint-contract
```

Run the frontend in dev mode:

```bash
npm --prefix frontend run dev
```

The dev server defaults to the Studionet contract address. Override it with `VITE_CONTRACT_ADDRESS=0x...` if you deployed your own.

## Deploying

Studionet (current default):

```bash
PRIVATE_KEY=0x... NETWORK=studionet npm run deploy:studionet
```

Bradbury (planned, see roadmap below):

```bash
PRIVATE_KEY=0x... NETWORK=bradbury npm run deploy:bradbury
```

Never use a funded mainnet key for these scripts. Use a disposable testnet wallet.

## Test coverage

The test suite is organized by phase, so each file isolates the behavior added in that phase rather than scattering edge cases across the codebase:

| File | Covers |
|---|---|
| `test_phase1_task_lifecycle.py` | create, claim, submit, cancel, basic getters |
| `test_phase2_adjudication.py` | mocked LLM verdicts, validator function, malformed output rejection |
| `test_phase3_github_evidence.py` | URL parsing, evidence shaping, GitHub API call mocks |
| `test_phase4_escrow_finalization.py` | payout, refund, partial split, finalization safety checks |
| `test_phase6_issue_pr_revision.py` | issue-to-PR matching, same-repo enforcement, revision loop |
| `test_phase7_reputation_manifest_expiry.py` | reputation counters, agent task manifests, claim expiry |
| `test_phase8_milestones.py` | multi-milestone tasks and per-milestone finalization |
| `test_phase9_future_features.py` | staking, appeals, juror voting, flagging window, team splits, tips |

All 89 tests pass in about 3.6 seconds on a clean clone.

## Roadmap

Short list of what comes next, roughly in priority order:

1. Deploy to Bradbury testnet and run the same end-to-end flow against real LLM validators rather than the Studio simulator.
2. Add a short demo video and link it at the top of this README.
3. Indexer or subgraph so the UI does not have to read tasks one by one.
4. CLI for AI agents to create and submit tasks programmatically.
5. Lightweight audit pass on the contract before mainnet.

## Acknowledgements

Built on GenLayer's Intelligent Contracts and the `genlayer-js` SDK. The `docs/research/` and `genlayer_research_brief.md` notes were my way of forcing myself to understand the consensus model before writing any contract code, and they are kept in the repo in case they help anyone else doing the same.

## License

Not yet specified. Will add an explicit license before mainnet.
