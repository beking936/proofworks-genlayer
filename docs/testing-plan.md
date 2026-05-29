# ProofWorks Testing Plan

## Current test layers

### Direct contract tests

The current implementation uses `genlayer-test` direct mode for fast contract tests.

Run:

```bash
pytest -q
```

### GenVM lint and schema validation

Run:

```bash
GENVMROOT=$(pwd)/.genvmroot genvm-lint check contracts/proofworks_escrow.py
```

A local `.genvmroot` folder is included so `genvm-lint` can validate against the v0.2.12 SDK instead of attempting to resolve a broken latest release asset.

## Current coverage

- deterministic task lifecycle
- mocked LLM adjudication
- invalid result handling
- access control
- state transitions

## Future coverage

Phase 3:

- GitHub URL parsing
- mocked GitHub evidence fetching
- realistic PR evidence normalization
- integration tests using live or controlled GitHub evidence

Phase 4:

- payable task creation
- escrow accounting
- payout/refund/split logic
- double-finalization prevention

Phase 5:

- frontend client tests
- form validation tests
- transaction status UI tests
