# Studionet Phase 7 Deployment

Date: 2026-05-30

## Contract

```txt
0x5E992bBc2De02C3878d2623A7C3bEc9603aB651A
```

Deploy transaction:

```txt
0xca2ca4afde4c4ce3f666c40c219784f4fcc7ec664ceb40db7f18c939a9bc8b00
```

## Added capabilities

- Same-repository enforcement remains active for GitHub issue → PR cases.
- `release_expired_claim(task_id)` for claim expiry release.
- `get_reputation(address)` for creator/worker reputation stats.
- `get_task_manifest(task_id)` for agent-readable task manifests.
- Reputation updates on create, cancel, revision request, and finalization.

## Deployment verification

Read calls after deployment:

```txt
get_task_count() -> 0
get_escrow_summary() -> active_escrow 0, contract_balance 0, total_escrowed 0, total_finalized 0
```

Full direct test suite passes with 74 tests.
