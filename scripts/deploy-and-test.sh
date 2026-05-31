#!/usr/bin/env bash
set -euo pipefail

# This script automates the complete Phase 9 deployment and real-time on-chain testing.
# It deploys the fresh contract to Studionet, updates the frontend configuration,
# redeploys the updated frontend to GitHub Pages, and runs the entire 8-stage on-chain test!

NETWORK="${NETWORK:-studionet}"
PRIVATE_KEY="${PRIVATE_KEY:-}"

echo "================================================================="
echo ">>> STARTING AUTOMATED DEPLOYMENT & TELEMETRY STACK"
echo "================================================================="

if [ -z "${PRIVATE_KEY}" ]; then
  echo "[!] ERROR: PRIVATE_KEY environment variable is required to deploy on Studionet."
  echo "Please fund a testnet address using GenLayer Studio, then run:"
  echo "PRIVATE_KEY=0xYourFundedKey ./scripts/deploy-and-test.sh"
  exit 1
fi

echo "[+] Dedeploying Python contract to ${NETWORK}..."
DEPLOY_LOG=$(NETWORK="${NETWORK}" PRIVATE_KEY="${PRIVATE_KEY}" npx tsx scripts/deploy.ts)
echo "${DEPLOY_LOG}"

# Extract contract address using grep and sed/awk
NEW_ADDRESS=$(echo "${DEPLOY_LOG}" | grep -i "Contract address:" | awk '{print $3}' | tr -d '\r' | tr -d '\n')

if [ -z "${NEW_ADDRESS}" ]; then
  echo "[!] ERROR: Failed to retrieve contract address from deploy logs."
  exit 1
fi

echo "[✓] New contract address deployed: ${NEW_ADDRESS}"

echo "[+] Updating frontend configuration 'frontend/src/lib/contract.ts'..."
# Update DEFAULT_CONTRACT_ADDRESS in contract.ts
python3 -c "
content = open('frontend/src/lib/contract.ts').read()
# Replace the old DEFAULT_CONTRACT_ADDRESS definition
import re
new_content = re.sub(r'export const DEFAULT_CONTRACT_ADDRESS = \"[^\"]+\" as Address;', 'export const DEFAULT_CONTRACT_ADDRESS = \"${NEW_ADDRESS}\" as Address;', content)
open('frontend/src/lib/contract.ts', 'w').write(new_content)
"

echo "[✓] Frontend configuration successfully updated."

echo "[+] Redeploying updated frontend to GitHub Pages..."
./scripts/deploy-gh-pages.sh

echo "[✓] Frontend live on GitHub Pages!"

echo "[+] Executing automated 8-stage real-time on-chain test stages..."
NETWORK="${NETWORK}" PRIVATE_KEY="${PRIVATE_KEY}" npx tsx scripts/test-realtime-flow.ts
