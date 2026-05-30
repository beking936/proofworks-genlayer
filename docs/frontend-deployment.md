# Frontend Deployment

The frontend can be run locally or deployed as a static site.

## Local

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## GitHub Pages

Because GitHub fine-grained PATs need the special `workflow` permission to push GitHub Actions workflow files, this repository uses a simple static `gh-pages` branch deployment instead of committing a workflow.

Expected public URL:

```txt
https://tommycet.github.io/proofworks-genlayer/
```

Build for GitHub Pages with:

```bash
GITHUB_PAGES=true VITE_CONTRACT_ADDRESS=0xB9B31ABA945D9056e71d53CB4E2c71090D3FaA57 npm --prefix frontend run build
```

Then publish the contents of:

```txt
frontend/dist
```

to the `gh-pages` branch.

## Notes

- GitHub Pages should be configured to serve from the `gh-pages` branch and `/` root.
- If wallet injection is unavailable in an embedded browser, open the site directly in a normal browser with MetaMask or compatible wallet.
- `GITHUB_PAGES=true` sets the Vite base path to `/proofworks-genlayer/`.
