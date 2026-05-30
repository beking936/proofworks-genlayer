# ProofWorks

ProofWorks is a GenLayer-native proof-of-fulfillment escrow protocol. The MVP focuses on GitHub bounty tasks: a creator posts a bounty, a worker submits proof, and later phases will use GenLayer AI-validator adjudication to decide payout.

Current implementation: **Phases 1-4 complete** — deterministic task lifecycle, mocked GenLayer LLM adjudication, GitHub PR evidence fetching/normalization, and payable escrow finalization.

## Development

```bash
pip install -r requirements.txt
pytest
```

## Contract

Primary contract: `contracts/proofworks_escrow.py`

Phase 1 supports deterministic task creation, claiming, proof submission, cancellation, and task reads. Phase 2 adds mocked LLM adjudication with structured result validation. Phase 3 adds GitHub PR URL parsing, API evidence fetching, and evidence normalization. Phase 4 makes task creation payable and adds separate finalize/cancel payout flows.

## Validation

```bash
make test
make lint-contract
```

Current direct test suite: 54 tests.

## Deployment docs

- `docs/deployment-studionet.md`
- `docs/deployment-bradbury.md`

Studionet should be tested first with faucet GEN, then Bradbury.

## Current Studionet deployment

- Contract: `0x697dB374F592f11Fe85Efb081E7fA53c9684eb47`
- Deploy tx: `0x7be849bd8534717164abcc421b60ea3cdad25f6596fb43ec541b563c85401e9c`
- Smoke test: see `docs/deployments/studionet-smoke-test.md`

Important: payout/refund external transfers are reflected after FINALIZED, not just ACCEPTED.

## Frontend MVP

Implemented in `frontend/`.

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Build validation:

```bash
make frontend-build
```

See `docs/phase-5-frontend.md`.


## Live frontend

The current GitHub Pages deployment is available at:

```txt
https://tommycet.github.io/proofworks-genlayer/
```
