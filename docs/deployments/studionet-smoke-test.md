# Studionet Deployment and Smoke Test

Date: 2026-05-29

## Deployment

- Network: Studionet (`https://studio.genlayer.com/api`)
- Deployment method: scripted deploy with generated burner wallet
- Burner deployer address: `0x8308A59524C139Af298Be389b9D48f92f17dAb9e`
- Contract address: `0xC57dEa38AeDA667985a8A8A95002c7D3ad063E08`
- Deploy transaction: `0x7be849bd8534717164abcc421b60ea3cdad25f6596fb43ec541b563c85401e9c`
- Deployment status: ACCEPTED / MAJORITY_AGREE

No private key is stored in the repository.

## Read verification

After deployment:

- `get_task_count()` returned `0`
- `get_escrow_summary()` returned zero escrow values

## End-to-end smoke test

### Task creation

- Creator burner address: `0x009E9d5a72CCf25d8126F8D32e65e7554dfd3eF3`
- Transaction: `0xb7d9acc1a04efaa0f84a2825c4c86ff56b1a36e0ddddf8c53e6590810742d0be`
- Method: `create_task`
- Value: `1` wei-equivalent test GEN unit
- Result: task `1` created with status `OPEN`

### Proof submission

- Worker burner address: `0xD7a017C3Bdb068BB40C46B261a9DD26fb2f9913f`
- Transaction: `0x9e78cad5c3ad1aa41a24773cb18e0d4ab671bdbe92d9afe102e2184c52e6e4bd`
- Method: `submit_proof`
- Proof text: `done`
- Result: task `1` moved to `SUBMITTED`

### Evaluation

- Transaction: `0xd7f034413d08e4470f344881fb75012a5f59259152256a0620ce6e21d22f709f`
- Method: `evaluate_task`
- Result: task `1` moved to `APPROVED`
- Decision: `APPROVE`
- Score: `100`
- Payout percent: `100`
- Reason: LLM concluded the proof text matched the criteria.

### Finalization

- Transaction: `0x1df225066743813a91976c1b3732bfd071d0cba39be76a30410531a5a743a329`
- Method: `finalize_task`
- Accepted result: task `1` moved to `PAID`
- Worker payout recorded: `1`
- Creator refund recorded: `0`

Important observation:

- Immediately after ACCEPTED, `get_escrow_summary().contract_balance` still showed `1`.
- After waiting for the finalize transaction to become FINALIZED, `contract_balance` became `0`.
- `getTriggeredTransactionIds` returned child transaction:
  - `0x844796e4db7fefaaefe6fb61f1829b713f226084665bc009d3a735980452afcd`

This confirms external value transfers execute on finalization, not merely acceptance.

## Final summary after finalization

`get_escrow_summary()` returned:

```json
{
  "active_escrow": 0,
  "contract_balance": 0,
  "total_escrowed": 1,
  "total_finalized": 1
}
```

## Conclusion

Studionet deployment and full create → submit → evaluate → finalize flow succeeded using generated burner wallets and free Studionet transactions.

## Follow-up implementation note

Frontend and scripts should distinguish:

- ACCEPTED: application state decision is visible
- FINALIZED: external payout/refund messages have executed and contract balance reflects transfer
