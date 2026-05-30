# Studionet Phase 6 Deployment and Smoke Test

Date: 2026-05-30

## Current Phase 6 Contract

```txt
0xB9B31ABA945D9056e71d53CB4E2c71090D3FaA57
```

Deploy transaction:

```txt
0x9a17a565da2098abf93ed49dd6bd0c6faf27bbe2c10682aeabca4f4bac16697d
```

## Important product rule

For `source_type = GITHUB_ISSUE`, the submitted `GITHUB_PR` proof must be from the **same GitHub owner/repository** as the issue.

If source issue and PR are from different repositories, the contract rejects evaluation with:

```txt
GITHUB_REPO_MISMATCH
```

This prevents fake/circular-looking adjudication where a source issue in one repo is matched against an unrelated PR from another repo.

## Phase 6 capabilities verified

- `create_case` with `source_type = GITHUB_ISSUE`
- `source_url` as GitHub issue
- `evidence_type = GITHUB_PR`
- worker submits a GitHub PR proof URL from the same repo
- `evaluate_task` fetches both source issue and proof PR evidence
- AI jury compares issue vs PR
- result includes `reason_code` and `missing_requirements`
- `finalize_task` pays worker after FINALIZED

## Same-repository smoke test

Source issue:

```txt
https://github.com/tommycet/proofworks-genlayer/issues/2
```

Proof PR:

```txt
https://github.com/tommycet/proofworks-genlayer/pull/3
```

## Transactions

Create case:

```txt
0x73fa581c2a0d1817d296ef354e4f0c35f0b6beace5391fdbcacd9cd77960a244
```

Submit proof:

```txt
0xf7df47647f9b3042883ddbe44f1b8361171318f8651e7eb2f8eab69b334e8e41
```

Evaluate:

```txt
0x01d98f37f46cba8906a86470a26304ba892ef97c6ff2aff5ed9bdfdd4aecbcb2
```

Finalize:

```txt
0xd6822b2c68b9b473e5f697dc83ff05e07bcca7b77995b0cceeb4429d4f9a6d26
```

## Evaluation result

```txt
decision: APPROVE
score: 100
payout_percent: 100
confidence: HIGH
reason_code: SOLVES_ISSUE
status after finalize: PAID
worker_payout: 1
```

This verifies the real Phase 6 grant-relevant flow:

```txt
GitHub issue bounty → same-repo GitHub PR proof → GenLayer AI adjudication → escrow finalization
```
