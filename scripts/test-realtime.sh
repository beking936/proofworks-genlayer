#!/usr/bin/env bash
set -euo pipefail

# This script runs the entire on-chain test stages in real-time
# using tsx and genlayer-js against your target network.

NETWORK="${NETWORK:-studionet}"
PRIVATE_KEY="${PRIVATE_KEY:-}"

echo "================================================================"
echo ">>> RUNNING REAL-TIME CONTRACT TELEMETRY STAGES"
echo "================================================================"
echo "Target Network: ${NETWORK}"

if [ -z "${PRIVATE_KEY}" ]; then
  echo "WARNING: No PRIVATE_KEY environment variable provided."
  echo "The deployment script will auto-generate a fresh disposable burner account."
  echo "If deploying to Studionet, ensure the generated account receives faucet GEN first,"
  echo "or override PRIVATE_KEY with a pre-funded testnet account."
fi

# Run the TypeScript telemetry script
npx tsx scripts/test-realtime-flow.ts
