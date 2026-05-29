import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"


def create_submitted_task(contract, direct_vm, direct_bob):
    task_id = contract.create_task(
        "Fix README typo",
        "The README has a typo in the installation section.",
        "A pull request must update the README and clearly fix the typo.",
        "TEXT_SUBMISSION",
        0,
        "",
    )
    with direct_vm.prank(direct_bob):
        contract.submit_proof(
            task_id,
            "",
            "The submitted work updates README.md and fixes the typo.",
        )
    return task_id


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


def mock_eval(direct_vm, payload):
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps(payload))


def test_approve_evaluation_updates_task(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, {
        "decision": "APPROVE",
        "score": 94,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "The PR clearly satisfies the README typo fix criteria.",
        "required_revision": "",
    })

    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "APPROVED"
    assert task["evaluated"] is True
    assert task["decision"] == "APPROVE"
    assert task["score"] == 94
    assert task["payout_percent"] == 100
    assert task["confidence"] == "HIGH"
    assert "satisfies" in task["reason"]
    assert task["required_revision"] == ""


def test_reject_evaluation_updates_task(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, {
        "decision": "REJECT",
        "score": 10,
        "payout_percent": 0,
        "confidence": "HIGH",
        "reason": "The submitted PR is unrelated to the README typo.",
        "required_revision": "",
    })

    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "REJECTED"
    assert task["decision"] == "REJECT"
    assert task["score"] == 10
    assert task["payout_percent"] == 0


def test_partial_evaluation_updates_task(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, {
        "decision": "PARTIAL",
        "score": 60,
        "payout_percent": 50,
        "confidence": "MEDIUM",
        "reason": "The proof addresses part of the criteria but misses important details.",
        "required_revision": "",
    })

    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "PARTIAL"
    assert task["decision"] == "PARTIAL"
    assert task["payout_percent"] == 50


def test_needs_revision_evaluation_updates_task(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, {
        "decision": "NEEDS_REVISION",
        "score": 45,
        "payout_percent": 0,
        "confidence": "MEDIUM",
        "reason": "The submission is close but needs clearer proof.",
        "required_revision": "Link the PR to the issue and add a clearer explanation.",
    })

    contract.evaluate_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "NEEDS_REVISION"
    assert task["decision"] == "NEEDS_REVISION"
    assert task["required_revision"].startswith("Link the PR")


def test_cannot_evaluate_before_submission(contract, direct_vm):
    task_id = contract.create_task("Task", "Desc", "Criteria", "GITHUB_PR", 0, "")
    with direct_vm.expect_revert("TASK_NOT_SUBMITTED"):
        contract.evaluate_task(task_id)


def test_cannot_evaluate_twice(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, {
        "decision": "APPROVE",
        "score": 90,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "Valid.",
        "required_revision": "",
    })
    contract.evaluate_task(task_id)

    with direct_vm.expect_revert("TASK_NOT_SUBMITTED"):
        contract.evaluate_task(task_id)


@pytest.mark.parametrize(
    "payload",
    [
        {"decision": "MAYBE", "score": 90, "payout_percent": 100, "confidence": "HIGH", "reason": "x", "required_revision": ""},
        {"decision": "APPROVE", "score": 101, "payout_percent": 100, "confidence": "HIGH", "reason": "x", "required_revision": ""},
        {"decision": "APPROVE", "score": 90, "payout_percent": 99, "confidence": "HIGH", "reason": "x", "required_revision": ""},
        {"decision": "REJECT", "score": 10, "payout_percent": 10, "confidence": "HIGH", "reason": "x", "required_revision": ""},
        {"decision": "PARTIAL", "score": 60, "payout_percent": 0, "confidence": "MEDIUM", "reason": "x", "required_revision": ""},
        {"decision": "NEEDS_REVISION", "score": 60, "payout_percent": 0, "confidence": "MEDIUM", "reason": "x", "required_revision": ""},
        {"decision": "APPROVE", "score": 90, "payout_percent": 100, "confidence": "UNKNOWN", "reason": "x", "required_revision": ""},
        {"decision": "APPROVE", "score": 90, "payout_percent": 100, "confidence": "HIGH", "reason": "", "required_revision": ""},
    ],
)
def test_invalid_evaluation_payloads_revert(contract, direct_vm, direct_bob, payload):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    mock_eval(direct_vm, payload)

    with direct_vm.expect_revert("INVALID_EVALUATION_RESULT"):
        contract.evaluate_task(task_id)


def test_non_dict_llm_response_reverts(contract, direct_vm, direct_bob):
    task_id = create_submitted_task(contract, direct_vm, direct_bob)
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", "not json")

    with direct_vm.expect_revert("LLM_RETURNED_NON_DICT"):
        contract.evaluate_task(task_id)
