# Studionet Phase 6 Deployment and Smoke Test

Date: 2026-05-30

## Contract

```txt
0xe76307a73bc5456Bb31AB720F38eeBdf3fbcF7c7
```

Deploy transaction:

```txt
0xb44a2c86f0486d248e33dfe2673fdf3ce50c3beaea78732c3216cbb4d8c4ab82
```

## Phase 6 capabilities verified

- `create_case` with `source_type = GITHUB_ISSUE`
- `source_url` as GitHub issue
- `evidence_type = GITHUB_PR`
- worker submits a GitHub PR proof URL
- `evaluate_task` fetches both source issue and proof PR evidence
- AI jury compares issue vs PR
- result includes `reason_code` and `missing_requirements`
- `finalize_task` pays worker after FINALIZED

## Smoke test issue and PR

Source issue:

```txt
https://github.com/tommycet/proofworks-genlayer/issues/1
```

Proof PR:

```txt
https://github.com/zarazhangrui/follow-builders/pull/43
```

## Transactions

Create case:

```txt
0x61ed1b135fb702468e070210ac9275e2d5bd8295a2629c80b8b32d802a9e7971
```

Submit proof:

```txt
0x200b8804075c402d73e6063a854e5aa5f563a21c4b460c0df1ea66c14d848458
```

Evaluate:

```txt
0xd0abf75249cbaffaea0c2cffeb3453389a72033013daaac940273e78c6785395
```

Finalize:

```txt
0xe26e22e3d48a2e5919cfeb8ffe87716216f4c9a9b631ee189349223d38df8fab
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

This verifies the core Phase 6 grant-relevant flow: GitHub issue bounty → GitHub PR proof → GenLayer AI adjudication → escrow finalization.
