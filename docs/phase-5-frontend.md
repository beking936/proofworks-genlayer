# Phase 5 Implementation Report — Frontend MVP

## Completed scope

Phase 5 implements a production-grade React/Vite frontend for the deployed Studionet ProofWorks contract.

The interface is intentionally designed as a **brutalist escrow court / industrial ledger cockpit** rather than a generic Web3 dashboard. The visual system uses parchment, ink, acid green, vermilion, hard borders, ledger-style cards, and a live transaction wire.

## Live contract target

Default contract:

```txt
0xC57dEa38AeDA667985a8A8A95002c7D3ad063E08
```

Configured in:

```txt
frontend/src/lib/contract.ts
```

Can be overridden with:

```txt
VITE_CONTRACT_ADDRESS=0x...
```

## Features implemented

### Read-only without wallet

- reads `get_task_count`
- reads `get_escrow_summary`
- reads each task with `get_task`
- displays docket/task list
- displays selected task details
- displays verdict details after evaluation

### Wallet write flow

With an injected wallet, the frontend can:

- connect wallet
- switch/add Studionet via GenLayerJS `client.connect("studionet")`
- create payable tasks
- submit proof
- evaluate task
- finalize task and wait for FINALIZED
- cancel task and wait for FINALIZED

### UX details

- shows contract address
- shows escrow summary
- distinguishes task status visually
- has a transaction console/wire
- waits for ACCEPTED for normal state updates
- waits for FINALIZED for payout/refund operations because Studionet testing confirmed external transfers complete after finalization

## File structure

```txt
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── ActionPanel.tsx
│   │   ├── StatCard.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskDetail.tsx
│   │   └── TransactionConsole.tsx
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   └── useWallet.ts
│   ├── lib/
│   │   ├── contract.ts
│   │   └── format.ts
│   └── types/
│       └── task.ts
```

## Validation

Build command:

```bash
npm --prefix frontend run build
```

The build passes. Vite warns that the GenLayerJS bundle is large, which is expected for now. Code splitting can be added later if needed.

## Preview/deployment note

The Arena workspace preview sandbox may block external network calls. The UI still renders, but live Studionet reads/writes require opening the built app in a normal browser with network access and an injected wallet.

## Remaining frontend work

- better task filtering/search
- dedicated GitHub PR task template
- transaction receipt detail drawer
- explicit child transaction display after finalization
- persisted local activity history
- improved mobile action flow
- environment selector for Studionet/Bradbury


## Live frontend

The current GitHub Pages deployment is available at:

```txt
https://tommycet.github.io/proofworks-genlayer/
```
