# Deployment — Bradbury Testnet

Bradbury should only be used after Studionet testing passes.

## Target

- GenLayer RPC: `https://rpc-bradbury.genlayer.com`
- Currency: testnet GEN
- Faucet: `https://testnet-faucet.genlayer.foundation`

## Plan

1. Complete Studionet deployment and manual flow test.
2. Confirm payable escrow and finalization behavior.
3. Fund a disposable Bradbury test wallet with testnet GEN.
4. Deploy using either:
   - manual Studio/import flow if available, or
   - scripted deployment via `scripts/deploy.ts`.
5. Re-run the same flow with tiny testnet GEN values.

## Scripted deployment

Use only a disposable testnet private key.

```bash
npm install
PRIVATE_KEY=0x... NETWORK=bradbury npm run deploy:bradbury
```

Never use a mainnet wallet/private key.
