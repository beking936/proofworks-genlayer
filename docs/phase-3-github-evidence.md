# Phase 3 Implementation Report — GitHub Evidence Fetching

## Completed scope

Phase 3 adds real GitHub PR evidence preparation to the adjudication path.

When a task uses `GITHUB_PR` evidence, `evaluate_task` now:

1. validates the submitted proof URL as a GitHub pull request URL;
2. derives GitHub API endpoints for the PR and changed files;
3. fetches both endpoints inside the GenLayer nondeterministic leader function;
4. compacts the evidence into stable fields;
5. injects normalized evidence into the adjudication prompt;
6. validates the LLM's structured result before storing the decision.

## Supported GitHub proof URL

```txt
https://github.com/{owner}/{repo}/pull/{number}
```

The parser accepts trailing slashes, query strings, and hash fragments, e.g.

```txt
https://github.com/example/repo/pull/7/?utm_source=test#discussion
```

Invalid hosts, issue URLs, non-numeric PR numbers, zero PR numbers, and malformed paths are rejected.

## Evidence fields retained

The contract compacts PR data to avoid volatile or overly large data:

- title
- body
- state
- merged
- draft
- html_url
- base branch
- head branch
- changed_files
- additions
- deletions
- first 20 changed files with filename/status/additions/deletions/changes

The compact evidence is serialized with sorted JSON keys before being included in the prompt.

## Tests added

`tests/direct/test_phase3_github_evidence.py`

Covers:

- successful GitHub PR evidence fetching
- query/hash/trailing slash URL normalization
- invalid URL rejection
- PR fetch failure
- PR files fetch failure

## Current verification

```bash
make test
make lint-contract
```

Current test count: 45 direct tests.

## Known limitations

- Tests use mocked GitHub API responses.
- Live GitHub API behavior on GenLayer testnet still needs integration testing.
- CI/check-run status is not fetched yet.
- Large diffs are intentionally not fetched in this phase.
- No value transfer/finalization yet.

## Next phase

Phase 4 will add real payable GEN escrow and payout/refund/split finalization logic.
