# ProofWorks-GenLayer Escrow Protocol

ProofWorks is a GenLayer-native, proof-of-fulfillment escrow protocol and court system. The MVP focuses on GitHub bounty tasks: a creator posts a bounty, a worker claims the case and submits proof, GenLayer AI-validators adjudicate, and the escrow disburses funds.

Current implementation: **Phases 1–9 fully complete, tested, and optimized**—featuring a complete, high-fidelity brutalist tactile console, worker staking, creator tips, same-repository checking safeguards, automatic flagging window delays, and a multi-juror decentralized appeal workflow.

---

## 🚀 Newly Shipped Phase 9 Backend & Frontend Features

1.  **Industrial Brutalism & Tactical Telemetry UI**: Upgraded the entire frontend with a high-contrast dark CRT terminal mode. Enforces grid-mathematical joints, low bit-depth phosphor colors, global dither effects, and technical syntax decorations (`[+]`, `>>>`, `[ CASE FILE ]`) to simulate a mechanical ledger cockpit.
2.  **Worker Staking / Skin in the Game**: Creators can enforce X% worker collateral when claiming tasks. The claim is payable and locks the worker's $GEN. If they fail to deliver before expiration, the collateral is automatically forfeited (50% to creator, 50% to treasury). Payout returned on completion.
3.  **Appeals & Juror Voting Desk**: Locked tasks can be disputed by posting an appeal bond. A panel of 3 designated community jurors votes via an interactive, on-chain Juror Voting Desk. majority consensus (2-out-of-3) settles disputes, distributes bonds, and updates final payout records.
4.  **Community Flagging Windows**: Releasing evaluated cases is delayed by a customizable flagging delay window. Any community member can stake a minor bond and flag the AI Jury's evaluation within the window, escalating the case to human juror arbitration.
5.  **Performance Tips & Team Splits**: Creators can tip workers directly on finalized tasks. The system also supports team split-payouts, auto-distributing shares (e.g. 60/40) on finalization.

---

## 🔧 Backend Architecture

Primary contract: `contracts/proofworks_escrow.py`  
Lints cleanly against the static compiler:
```bash
make lint-contract
```

The contract separates non-deterministic operations (using `gl.vm.run_nondet_unsafe` and strict schema validation blocks) from deterministic payment finalizations, ensuring maximum consensus resilience and security against malicious jailbreaking vectors.

---

## 🧪 Testing and Verification

The test suite contains **89 comprehensive direct tests** verifying every edge case, state machine transition, and staking forfeiture parameter.

Run the test suite:
```bash
pytest tests/direct/ -v
```

All 89 tests pass with **100% success rate**:
```txt
============================== 89 passed in 3.64s ==============================
```

---

## 🖥️ Frontend Client Development

The React client compiles with zero errors, packing optimized bundles containing complete on-chain views and write wrappers:

```bash
npm --prefix frontend install
npm --prefix frontend run build
```

### Free Burner Wallet Simulation:
To facilitate developer testing, the **Burner Court** console allows users to instantly toggle between these roles:
*   **Creator**: Fund escrows, set stake requirements, register teams, and tip workers.
*   **Worker**: Claim tasks (staking collateral if required), submit PR links, and appeal verdicts.
*   **Juror 1 / 2 / 3**: Switch to assigned community jurors to cast votes on the interactive Juror Desk.
