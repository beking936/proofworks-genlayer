import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


def create_issue_case(contract):
    return contract.create_case(
        "Solve issue #43",
        "Issue bounty imported from GitHub.",
        "PR must materially solve the source issue.",
        "GITHUB_ISSUE",
        "https://github.com/example/repo/issues/43",
        "GITHUB_PR",
        0,
        "",
        2,
    )


def submit_pr(contract, direct_vm, direct_bob, task_id, url="https://github.com/example/repo/pull/99", text="PR solves issue #43"):
    with direct_vm.prank(direct_bob):
        contract.submit_proof(task_id, url, text)


def mock_issue_pr(direct_vm):
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/issues/43$",
        {"status": 200, "body": json.dumps({
            "title": "Add settlement preview",
            "body": "The UI should show worker payout and creator refund before finalization.",
            "state": "open",
            "html_url": "https://github.com/example/repo/issues/43",
            "labels": [{"name": "bounty"}, {"name": "frontend"}],
            "comments": 3,
            "user": {"login": "maintainer"},
        })},
    )
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/pulls/99$",
        {"status": 200, "body": json.dumps({
            "title": "Add settlement preview panel",
            "body": "Implements payout/refund preview. Fixes #43.",
            "state": "open",
            "merged": False,
            "draft": False,
            "html_url": "https://github.com/example/repo/pull/99",
            "base": {"ref": "main"},
            "head": {"ref": "settlement-preview"},
            "changed_files": 2,
            "additions": 120,
            "deletions": 10,
        })},
    )
    direct_vm.mock_web(
        r"https://api\.github\.com/repos/example/repo/pulls/99/files$",
        {"status": 200, "body": json.dumps([
            {"filename": "frontend/src/components/SettlementPreview.tsx", "status": "added", "additions": 80, "deletions": 0, "changes": 80},
            {"filename": "frontend/src/App.tsx", "status": "modified", "additions": 40, "deletions": 10, "changes": 50},
        ])},
    )


def mock_llm(direct_vm, payload):
    direct_vm.mock_llm(r"(?s).*NORMALIZED SOURCE EVIDENCE.*Add settlement preview.*NORMALIZED PROOF EVIDENCE.*SettlementPreview.*", json.dumps(payload))


def test_create_case_stores_source_fields(contract):
    task_id = create_issue_case(contract)
    task = contract.get_task(task_id)
    assert task["source_type"] == "GITHUB_ISSUE"
    assert task["source_url"] == "https://github.com/example/repo/issues/43"
    assert task["evidence_type"] == "GITHUB_PR"
    assert task["max_revisions"] == 2
    assert task["revision_count"] == 0


def test_github_issue_requires_pr_proof(contract, direct_vm):
    with direct_vm.expect_revert("GITHUB_ISSUE_REQUIRES_PR_PROOF"):
        contract.create_case("T", "D", "C", "GITHUB_ISSUE", "https://github.com/example/repo/issues/43", "TEXT_SUBMISSION", 0, "", 2)


def test_invalid_github_issue_url_reverts(contract, direct_vm):
    with direct_vm.expect_revert("INVALID_GITHUB_ISSUE_URL"):
        contract.create_case("T", "D", "C", "GITHUB_ISSUE", "https://github.com/example/repo/pull/43", "GITHUB_PR", 0, "", 2)


def test_issue_pr_evaluation_uses_source_and_proof(contract, direct_vm, direct_bob):
    task_id = create_issue_case(contract)
    submit_pr(contract, direct_vm, direct_bob, task_id)
    mock_issue_pr(direct_vm)
    mock_llm(direct_vm, {
        "decision": "APPROVE",
        "score": 92,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "The PR adds a settlement preview that satisfies the issue.",
        "reason_code": "SOLVES_ISSUE",
        "missing_requirements": [],
        "required_revision": "",
    })
    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)
    assert task["status"] == "APPROVED"
    assert task["reason_code"] == "SOLVES_ISSUE"
    assert json.loads(task["missing_requirements"]) == []


def test_needs_revision_then_resubmit_and_approve(contract, direct_vm, direct_bob):
    task_id = create_issue_case(contract)
    submit_pr(contract, direct_vm, direct_bob, task_id)
    mock_issue_pr(direct_vm)
    mock_llm(direct_vm, {
        "decision": "NEEDS_REVISION",
        "score": 55,
        "payout_percent": 0,
        "confidence": "MEDIUM",
        "reason": "The PR lacks tests.",
        "reason_code": "NEEDS_TESTS",
        "missing_requirements": ["Add tests for settlement preview"],
        "required_revision": "Add tests and resubmit.",
    })
    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)
    assert task["status"] == "NEEDS_REVISION"
    assert task["reason_code"] == "NEEDS_TESTS"

    with direct_vm.prank(direct_bob):
        contract.resubmit_proof(task_id, "https://github.com/example/repo/pull/99", "Added tests as requested")
    task = contract.get_task(task_id)
    assert task["status"] == "SUBMITTED"
    assert task["evaluated"] is False
    assert task["revision_count"] == 1
    assert task["reason_code"] == ""

    direct_vm.clear_mocks()
    mock_issue_pr(direct_vm)
    mock_llm(direct_vm, {
        "decision": "APPROVE",
        "score": 95,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "The revised PR satisfies the issue.",
        "reason_code": "SOLVES_ISSUE",
        "missing_requirements": [],
        "required_revision": "",
    })
    contract.evaluate_task(task_id)
    assert contract.get_task(task_id)["status"] == "APPROVED"


def test_resubmit_requires_worker_and_revision_state(contract, direct_vm, direct_bob, direct_charlie):
    task_id = create_issue_case(contract)
    submit_pr(contract, direct_vm, direct_bob, task_id)
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("TASK_NOT_IN_REVISION"):
            contract.resubmit_proof(task_id, "https://github.com/example/repo/pull/99", "x")


def test_max_revisions_enforced(contract, direct_vm, direct_bob):
    task_id = contract.create_case("T", "D", "C", "MANUAL", "", "TEXT_SUBMISSION", 0, "", 0)
    with direct_vm.prank(direct_bob):
        contract.submit_proof(task_id, "", "bad")
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps({
        "decision": "NEEDS_REVISION",
        "score": 40,
        "payout_percent": 0,
        "confidence": "MEDIUM",
        "reason": "Needs work.",
        "reason_code": "INCOMPLETE_SCOPE",
        "missing_requirements": ["Complete the work"],
        "required_revision": "Complete the work.",
    }))
    contract.evaluate_task(task_id)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("MAX_REVISIONS_REACHED"):
            contract.resubmit_proof(task_id, "", "better")
