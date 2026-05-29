# Manual Deployment — Studionet / Hosted GenLayer Studio

This is the preferred first deployment path because it does not require sharing private keys.

## Target

- GenLayer RPC: `https://studio.genlayer.com/api`
- Network: Studionet
- Faucet: built into GenLayer Studio account selector

## Steps

1. Open GenLayer Studio in your browser.
2. Connect your wallet/account.
3. Use the Studio faucet to fund the account with test GEN.
4. Create a new contract file in Studio.
5. Copy the full contents of:

   ```txt
   contracts/proofworks_escrow.py
   ```

6. Deploy the contract with no constructor arguments.
7. Save the deployed contract address.
8. Test these methods manually:

   - `get_task_count()` should return `0`.
   - `create_task(...)` with a small GEN value should create task `1`.
   - `get_task(1)` should show the reward amount.
   - `submit_proof(...)` from a different account should move the task to `SUBMITTED`.
   - `evaluate_task(...)` requires LLM/web consensus and may take longer.
   - `finalize_task(...)` should emit payout/refund after evaluation.

## Free testing guidance

Use Studionet faucet GEN only. Do not use real funds. Start with the smallest practical value in Studio.

## What to record

- contract address
- deployment transaction
- screenshot of task creation
- screenshot of evaluation result
- screenshot or explorer link for finalization/payout
