# Value Transfer Research Notes

## Confirmed SDK patterns

GenLayer Intelligent Contracts receive GEN with:

```python
@gl.public.write.payable
def method(self):
    amount = gl.message.value
```

The contract's own balance is available through:

```python
self.balance
```

For sending GEN to an EOA/chain-layer address, the current SDK pattern is an EVM contract interface with a value-only transfer:

```python
@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass

_Recipient(Address(recipient)).emit_transfer(value=amount)
```

This maps to `EthSend` in the GenLayer SDK. External messages execute on finalization in the real network.

## ProofWorks Phase 4 design decision

Use the hybrid model:

1. `create_task` is payable and records the escrow amount.
2. `evaluate_task` only stores the adjudication result.
3. `finalize_task` emits the actual payout/refund transfers.
4. `cancel_task` refunds the creator if the task is canceled before submission.

This avoids mixing non-deterministic adjudication and value movement in the same transaction.

## Direct-mode testing caveat

`genlayer-test` direct mode does not execute real EVM transfers. Phase 4 tests install a `_gl_call_hook` to capture `EthSend` calls and assert the intended transfer recipients and amounts.

Real transfer behavior must still be verified manually on Studionet before Bradbury.


## Studionet smoke-test result

A real Studionet smoke test confirmed that value transfer messages emitted by `finalize_task` do not reduce `contract_balance` at ACCEPTED status. After waiting for the finalize transaction to reach FINALIZED, the external child transaction was triggered and `contract_balance` dropped to zero. Frontend UX should therefore wait for FINALIZED when it needs payout completion, even if ACCEPTED is enough to show the internal decision state.
