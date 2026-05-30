import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


def create_github_submitted_task(contract, direct_vm, direct_bob, proof_url="https://github.com/example/repo/pull/7"):
    task_id = contract.create_task(
        "Fix README typo",
        "The README has a typo in the installation section.",
        "A pull request must update README.md and fix the installation typo.",
        "GITHUB_PR",
        0,
        "",
    )
    with direct_vm.prank(direct_bob):
        contract.submit_proof(task_id, proof_url, "PR submitted for review.")
    return task_id


def mock_github_pr(direct_vm, owner="example", repo="repo", number=7, *, merged=False, files=None):
    pr_payload = {
        "title": "Fix README installation typo",
        "body": "This PR fixes the typo in the README installation section.",
        "state": "open",
        "merged": merged,
        "draft": False,
        "html_url": f"https://github.com/{owner}/{repo}/pull/{number}",
        "base": {"ref": "main"},
        "head": {"ref": "fix-readme-typo"},
        "changed_files": 1,
        "additions": 1,
        "deletions": 1,
    }
    files_payload = files if files is not None else [
        {"filename": "README.md", "status": "modified", "additions": 1, "deletions": 1, "changes": 2}
    ]
    direct_vm.mock_web(
        rf"https://api\.github\.com/repos/{owner}/{repo}/pulls/{number}$",
        {"status": 200, "body": json.dumps(pr_payload)},
    )
    direct_vm.mock_web(
        rf"https://api\.github\.com/repos/{owner}/{repo}/pulls/{number}/files$",
        {"status": 200, "body": json.dumps(files_payload)},
    )


def mock_approval_llm(direct_vm):
    direct_vm.mock_llm(
        r"(?s).*NORMALIZED PROOF EVIDENCE.*README\.md.*",
        json.dumps({
            "decision": "APPROVE",
            "score": 96,
            "payout_percent": 100,
            "confidence": "HIGH",
            "reason": "GitHub evidence shows README.md was modified to fix the requested typo.",
            "required_revision": "",
        }),
    )


def test_github_pr_evidence_is_fetched_and_used(contract, direct_vm, direct_bob):
    task_id = create_github_submitted_task(contract, direct_vm, direct_bob)
    mock_github_pr(direct_vm)
    mock_approval_llm(direct_vm)

    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "APPROVED"
    assert task["decision"] == "APPROVE"
    assert task["score"] == 96
    assert "GitHub evidence" in task["reason"]


def test_github_pr_url_query_and_trailing_slash_are_accepted(contract, direct_vm, direct_bob):
    task_id = create_github_submitted_task(
        contract,
        direct_vm,
        direct_bob,
        "https://github.com/example/repo/pull/7/?utm_source=test#discussion",
    )
    mock_github_pr(direct_vm)
    mock_approval_llm(direct_vm)

    contract.evaluate_task(task_id)
    assert contract.get_task(task_id)["status"] == "APPROVED"


@pytest.mark.parametrize(
    "url",
    [
        "https://github.com/example/repo/pull/7",
        "http://github.com/example/repo/pull/7",
        "github.com/example/repo/pull/7",
        "https://github.com/example/repo/pull/7/files",
        "https://github.com/example/repo/pull/7/commits",
        "[PR](https://github.com/example/repo/pull/7)",
        "See https://github.com/example/repo/pull/7 for details",
        "<https://github.com/example/repo/pull/7>",
    ],
)
def test_github_pr_url_tolerant_formats_are_accepted(contract, direct_vm, direct_bob, url):
    task_id = create_github_submitted_task(contract, direct_vm, direct_bob, url)
    mock_github_pr(direct_vm)
    mock_approval_llm(direct_vm)
    contract.evaluate_task(task_id)
    assert contract.get_task(task_id)["status"] == "APPROVED"


@pytest.mark.parametrize(
    "bad_url",
    [
        "",
        "https://gitlab.com/example/repo/-/merge_requests/1",
        "https://github.com/example/repo/issues/7",
        "https://github.com/example/repo/pull/not-a-number",
        "https://github.com/example/repo/pull/0",
    ],
)
def test_invalid_github_pr_urls_revert(contract, direct_vm, direct_bob, bad_url):
    # Empty URL is rejected at proof submission for URL-based evidence.
    if bad_url == "":
        task_id = contract.create_task("Task", "Desc", "Criteria", "GITHUB_PR", 0, "")
        with direct_vm.prank(direct_bob):
            with direct_vm.expect_revert("PROOF_REQUIRED"):
                contract.submit_proof(task_id, bad_url, "")
        return

    task_id = create_github_submitted_task(contract, direct_vm, direct_bob, bad_url)
    with direct_vm.expect_revert("INVALID_GITHUB_PR_URL"):
        contract.evaluate_task(task_id)


def test_github_pr_fetch_failure_reverts(contract, direct_vm, direct_bob):
    task_id = create_github_submitted_task(contract, direct_vm, direct_bob)
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/pulls/7$",
        {"status": 404, "body": json.dumps({"message": "Not Found"})},
    )

    with direct_vm.expect_revert("GITHUB_PR_FETCH_FAILED"):
        contract.evaluate_task(task_id)


def test_github_files_fetch_failure_reverts(contract, direct_vm, direct_bob):
    task_id = create_github_submitted_task(contract, direct_vm, direct_bob)
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/pulls/7$",
        {"status": 200, "body": json.dumps({"title": "ok"})},
    )
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/pulls/7/files$",
        {"status": 500, "body": "server error"},
    )

    with direct_vm.expect_revert("GITHUB_FILES_FETCH_FAILED"):
        contract.evaluate_task(task_id)
