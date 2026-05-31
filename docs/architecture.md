# ProofWorks architecture

This page is the picture-first companion to `spec.md`. If you want the full reasoning, read the spec. If you just want to see how the pieces fit, read this.

## End-to-end flow

```mermaid
sequenceDiagram
    autonumber
    participant Creator as Creator (wallet)
    participant FE as Frontend (React + genlayer-js)
    participant IC as ProofWorksEscrow (Intelligent Contract)
    participant Vals as GenLayer validators + LLM
    participant GH as GitHub API
    participant Worker as Worker (wallet)
    participant Jurors as Community jurors

    Creator->>FE: Fill bounty form, deposit GEN
    FE->>IC: create_task(title, criteria, source_url, reward)
    IC-->>FE: task_id, status=OPEN

    Worker->>FE: Browse tasks, claim
    FE->>IC: claim_task(task_id) [payable if stake required]
    IC-->>FE: status=CLAIMED, worker_stake locked

    Worker->>FE: Paste PR URL
    FE->>IC: submit_proof(task_id, pr_url)
    IC-->>FE: status=SUBMITTED

    FE->>IC: evaluate_task(task_id)
    IC->>Vals: run_nondet_unsafe(leader_fn, validator_fn)
    Vals->>GH: fetch issue + PR + files
    Vals->>Vals: LLM returns JSON verdict
    Vals-->>IC: consensus result (decision, payout_percent, ...)
    IC-->>FE: status=APPROVED | REJECTED | PARTIAL | NEEDS_REVISION

    alt Verdict accepted, flagging window elapses
        FE->>IC: finalize_task(task_id)
        IC->>Worker: pay reward (split if team)
        IC->>Creator: refund remainder
    else Someone flags or appeals
        Creator->>IC: appeal(task_id) [posts bond]
        IC->>Jurors: open vote
        Jurors->>IC: cast votes (2-of-3 majority)
        IC->>Worker: pay or forfeit per juror decision
    end
```

## Component map

```mermaid
flowchart LR
    subgraph Client
        UI[React + Vite UI<br/>burner wallet, role switcher]
        SDK[genlayer-js read/write clients]
        Proxy[GitHub proxy server<br/>server/github-proxy.mjs]
    end

    subgraph GenLayer
        IC[ProofWorksEscrow.py<br/>Intelligent Contract on GenVM]
        Ghost[Ghost contract on EVM L2<br/>holds GEN balance]
        Cons[Optimistic Democracy<br/>validators + LLMs]
    end

    subgraph External
        GH[GitHub REST API<br/>issues, pulls, files]
        EAS[(EAS / SBT badges<br/>optional reputation hooks)]
    end

    UI --> SDK
    UI --> Proxy
    Proxy --> GH
    SDK --> IC
    IC <--> Ghost
    IC --> Cons
    Cons --> GH
    IC -. attest .-> EAS
```

## Task state machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: create_task
    OPEN --> CLAIMED: claim_task (stake optional)
    OPEN --> CANCELED: cancel_task
    CLAIMED --> SUBMITTED: submit_proof
    CLAIMED --> OPEN: release_expired_claim
    SUBMITTED --> EVALUATING: evaluate_task
    EVALUATING --> APPROVED
    EVALUATING --> REJECTED
    EVALUATING --> PARTIAL
    EVALUATING --> NEEDS_REVISION
    NEEDS_REVISION --> SUBMITTED: resubmit (within max_revisions)
    APPROVED --> PAID: finalize_task (after flagging delay)
    PARTIAL --> PARTIALLY_PAID: finalize_task
    REJECTED --> REFUNDED: finalize_task
    APPROVED --> APPEALED: appeal (posts bond)
    REJECTED --> APPEALED: appeal (posts bond)
    APPEALED --> PAID: jurors vote pay
    APPEALED --> REFUNDED: jurors vote refund
    PAID --> [*]
    REFUNDED --> [*]
    PARTIALLY_PAID --> [*]
    CANCELED --> [*]
```

## Why these components exist

The Intelligent Contract is the only place a verdict is allowed to live. The frontend can show one, the GitHub proxy can fetch evidence to display, but the actual decision that moves money is the consensus output from `run_nondet_unsafe`. That is the whole reason ProofWorks is built on GenLayer instead of Ethereum.

The ghost contract is GenLayer's standard mechanism for letting the IC hold and route GEN on the EVM layer. We do not need to think about it much, but it is what makes payouts work.

The GitHub proxy is a convenience for the UI, not the contract. Validators fetch GitHub directly inside the nondet block so the consensus result does not depend on a centralized server.
