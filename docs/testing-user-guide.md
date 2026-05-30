# ProofWorks Testing Guide

This guide tests everything implemented so far: contract logic, deployed Studionet contract, and the frontend MVP.

## 0. What exists now

### Studionet contract

```txt
0xfCaB5Af8F640ee65dd79fA4BA5819Ab95de8582a
```

Deployment/smoke-test details:

```txt
docs/deployments/studionet-smoke-test.md
```

### Implemented phases

- Phase 1: deterministic task lifecycle
- Phase 2: LLM adjudication
- Phase 3: GitHub PR evidence fetching/normalization
- Phase 4: payable escrow and finalization
- Phase 5: frontend MVP

---

## 1. Local repository validation

From the project root:

```bash
pip install -r requirements.txt
npm install
npm --prefix frontend install
make validate-all
```

Expected result:

```txt
54 contract tests passed
GenVM lint passed
GenVM validation passed
Frontend build passed
```

Notes:

- `make lint-contract` runs `scripts/setup_genvmroot.py` first. This prepares a local `.genvmroot` folder for GenVM SDK validation. `.genvmroot` is intentionally ignored by git.
- The Vite build may warn that the GenLayerJS bundle is large. That is acceptable for the MVP.

---

## 2. Test read-only frontend mode

Start the frontend:

```bash
npm --prefix frontend run dev
```

Open the local Vite URL, usually:

```txt
http://localhost:5173
```

Expected behavior without wallet:

1. The page loads with the ProofWorks visual design.
2. The top bar shows the Studionet contract.
3. Stats load from the deployed contract.
4. The docket shows existing Studionet tasks.
5. Selecting a task opens the case file detail panel.
6. The app should not require a wallet for reads.

If the Arena/embedded preview blocks network calls, open the Vite URL in a normal browser.

---

## 3. Test wallet connection

Use a burner/test wallet only.

1. Open the frontend in a normal browser with an injected wallet.
2. Click **Connect wallet**.
3. Approve connection.
4. If prompted, approve switching/adding Studionet.

Expected result:

- The wallet button changes to a shortened address.
- No write button should be disabled because of missing wallet.

---

## 4. Create a text-submission task

In the **Create escrow case** form:

```txt
Title: Frontend smoke oath
Description: Test the ProofWorks frontend flow.
Acceptance criteria: The proof text must say done.
Evidence: TEXT_SUBMISSION
Reward: 1
```

Click:

```txt
Seal new case
```

Expected result:

1. Transaction appears in the transaction wire.
2. It waits for ACCEPTED.
3. Docket refreshes.
4. New task appears with status `OPEN`.
5. Task detail shows `reward_amount: 1`.

---

## 5. Submit proof

Select the newly created task.

In **Submit proof**:

```txt
Proof URL: leave empty
Proof text: done
```

Click:

```txt
Submit evidence
```

Expected result:

- Task moves to `SUBMITTED`.
- Your wallet becomes the assigned worker if it was open.
- Proof text appears in the task detail panel.

Important:

If you created and submit from the same wallet, the contract rejects it because creators cannot submit proof for their own unassigned open task. Use a second burner wallet/account for worker testing, or create a task assigned to a different worker.

---

## 6. Run AI jury

Select the submitted task and click:

```txt
Run AI jury
```

Expected result:

- Transaction waits for ACCEPTED.
- Task moves to one of:
  - `APPROVED`
  - `REJECTED`
  - `PARTIAL`
  - `NEEDS_REVISION`
- The verdict panel displays:
  - decision
  - score
  - payout percent
  - confidence
  - reason

For the proof text `done` and criteria `The proof text must say done`, expected result is usually:

```txt
APPROVE
score near 100
payout_percent 100
```

---

## 7. Finalize payout

If the task decision is not `NEEDS_REVISION`, click:

```txt
Finalize payout
```

Expected result:

1. The frontend waits for FINALIZED, not just ACCEPTED.
2. Task final status becomes:
   - `PAID` for APPROVE
   - `REFUNDED` for REJECT
   - `PARTIALLY_PAID` for PARTIAL
3. `active_escrow` decreases.
4. After finalization, `contract_balance` should reflect the external transfer.

Why FINALIZED matters:

The Studionet smoke test proved that value transfer effects are visible after FINALIZED. At ACCEPTED, internal task state may already be updated, but external transfer child transactions may not have executed yet.

---

## 8. Test GitHub PR evidence task

Create a new task:

```txt
Evidence: GITHUB_PR
Acceptance criteria: The PR must update README.md.
```

Submit proof with a real public GitHub PR URL:

```txt
https://github.com/{owner}/{repo}/pull/{number}
```

Expected behavior:

- The contract parses the GitHub PR URL.
- The contract fetches:
  - PR metadata
  - changed files
- The AI jury receives normalized GitHub evidence.
- The task receives a structured decision.

Invalid URLs should fail:

- GitHub issue URLs
- GitLab URLs
- non-numeric PR numbers
- malformed PR paths

---

## 9. Cancel/refund test

Create a task but do not submit proof.

Click:

```txt
Cancel + refund
```

Expected result:

- Task status becomes `CANCELED`.
- `finalized` becomes true.
- `creator_refund` equals reward amount.
- The frontend waits for FINALIZED.

---

## 10. Known frontend limitations

- The current MVP does not yet include task search/filtering.
- It does not persist local transaction wire history after refresh.
- It does not show child transaction IDs after finalization yet.
- It is wired to Studionet only by default.
- GitHub PR evaluation depends on public GitHub API accessibility from GenLayer validators.

---

## 11. What to report if testing fails

Please send:

1. The task ID.
2. The transaction hash.
3. Which step failed.
4. Screenshot or copied error message.
5. Whether the transaction reached ACCEPTED or FINALIZED.



## Live frontend

The current GitHub Pages deployment is available at:

```txt
https://tommycet.github.io/proofworks-genlayer/
```


## Same-repository rule for GitHub issue bounties

For `source_type = GITHUB_ISSUE`, the submitted PR proof must be from the same GitHub owner/repository as the source issue.

Example valid pair:

```txt
source_url: https://github.com/tommycet/proofworks-genlayer/issues/2
proof_url:  https://github.com/tommycet/proofworks-genlayer/pull/3
```

Invalid pair:

```txt
source_url: https://github.com/tommycet/proofworks-genlayer/issues/2
proof_url:  https://github.com/other/repo/pull/3
```

Invalid pairs fail with:

```txt
GITHUB_REPO_MISMATCH
```
