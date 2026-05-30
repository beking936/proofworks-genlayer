# Recommended Environment for ProofWorks

ProofWorks has two practical environments:

## 1. Permanent public testing URL — GitHub Pages

Use this for most user testing:

```txt
https://tommycet.github.io/proofworks-genlayer/
```

Why this is best:

- It does not shut down like Codespaces.
- It is static, fast, and free.
- It still connects directly to the live Studionet contract.
- Burner mode works without a faucet or MetaMask funds.

Current Studionet contract:

```txt
0xe76307a73bc5456Bb31AB720F38eeBdf3fbcF7c7
```

## 2. Live development URL — Codespaces

Use this when actively developing or testing unmerged frontend changes:

```txt
https://proofworks-live-v6w7rx57965whwj4-5173.app.github.dev/
```

Limitations:

- Codespaces can shut down after idling.
- It may need to be restarted manually.
- It is not ideal as the main demo URL.

## Rebuilding and redeploying GitHub Pages

From the repo root:

```bash
npm --prefix frontend install
./scripts/deploy-gh-pages.sh
```

If using a different contract:

```bash
VITE_CONTRACT_ADDRESS=0x... ./scripts/deploy-gh-pages.sh
```

## Fresh clone validation

```bash
pip install -r requirements.txt
npm install
npm --prefix frontend install
make validate-all
```

## Frontend testing with no faucet

Use **free burner mode** in the app:

1. Open the public URL.
2. Click `Use free burners`.
3. Use `Creator` to create a task.
4. Switch to `Worker` to submit proof.
5. Run AI jury.
6. Finalize payout.

This avoids MetaMask asking for GEN on Studionet.

## GitHub PR task tips

For GitHub PR evidence, use any of these accepted URL formats:

```txt
https://github.com/owner/repo/pull/43
https://github.com/owner/repo/pull/43/files
github.com/owner/repo/pull/43
[PR](https://github.com/owner/repo/pull/43)
```

If a task was created on an old contract version, recreate it on the current contract before testing.
