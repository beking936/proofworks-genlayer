#!/usr/bin/env bash
set -euo pipefail

# Deploy the static frontend to the gh-pages branch.
# Requires a git remote named origin with push access.

CONTRACT_ADDRESS="${VITE_CONTRACT_ADDRESS:-0x697dB374F592f11Fe85Efb081E7fA53c9684eb47}"
WORKTREE_DIR="${WORKTREE_DIR:-/tmp/proofworks-pages}"

echo "Building frontend for GitHub Pages with contract ${CONTRACT_ADDRESS}"
GITHUB_PAGES=true VITE_CONTRACT_ADDRESS="$CONTRACT_ADDRESS" npm --prefix frontend run build

rm -rf "$WORKTREE_DIR"
mkdir -p "$WORKTREE_DIR"
cp -R frontend/dist/. "$WORKTREE_DIR/"
cd "$WORKTREE_DIR"

git init
git config user.name "ProofWorks Builder"
git config user.email "builder@proofworks.local"
touch .nojekyll
git add .
git commit -m "Deploy ProofWorks frontend"
git branch -M gh-pages
git remote add origin "${GITHUB_REMOTE:-https://github.com/tommycet/proofworks-genlayer.git}"
git push -f origin gh-pages
