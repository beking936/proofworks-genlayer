# Phase 4 Implementation Report — Payable Escrow and Finalization

## Completed scope

Phase 4 implements the hybrid escrow model selected for ProofWorks:

- `create_task` is now payable.
- The task stores `reward_amount = gl.message.value`.
- `evaluate_task` still only stores the GenLayer adjudication result.
- `finalize_task` performs payout/refund/split after evaluation.
- `cancel_task` refunds the creator before proof submission.

## New public method

```python
finalize_task(task_id: int) -> None
```

## New view method

```python
get_escrow_summary() -> dict
```

Returns:

- `total_escrowed`
- `total_finalized`
- `active_escrow`
- `contract_balance`

## Finalization behavior

| Decision | Worker payout | Creator refund | Final status |
|---|---:|---:|---|
| APPROVE | 100% | 0% | PAID |
| REJECT | 0% | 100% | REFUNDED |
| PARTIAL | `payout_percent` | remainder | PARTIALLY_PAID |
| NEEDS_REVISION | none | none | cannot finalize |

## Safety checks

`finalize_task` requires:

- task exists
- task has been evaluated
- task is not already finalized
- reward amount is non-zero
- worker is assigned
- decision is not `NEEDS_REVISION`

`cancel_task` requires:

- sender is creator
- task is still `OPEN` or `CLAIMED`
- task is not already finalized

## Tests added

`tests/direct/test_phase4_escrow_finalization.py`

Covers:

- payable reward recording
- zero reward rejection
- approve payout
- reject refund
- partial split
- needs-revision cannot finalize
- cannot finalize before evaluation
- cannot finalize twice
- cancel refund

## Current verification

```bash
make test
make lint-contract
```

Current test count: 54 direct tests. A real Studionet smoke test has also passed; see `docs/deployments/studionet-smoke-test.md`.

## Remaining real-world verification

Before Bradbury deployment, verify on Studionet:

1. payable `create_task` accepts faucet GEN;
2. `finalize_task` emits the intended EOA transfer;
3. child/external transfer transaction behavior is visible in Studio/explorer;
4. `get_escrow_summary().contract_balance` matches expectations after create/finalize.


## Studionet verification update

The deployed Studionet contract `0xC57dEa38AeDA667985a8A8A95002c7D3ad063E08` successfully completed create → submit → evaluate → finalize. External value transfer effects were observed after FINALIZED status, confirming the need to wait for FINALIZED for payout completion.
