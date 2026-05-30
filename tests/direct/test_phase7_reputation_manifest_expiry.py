import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"


def addr_hex(addr) -> str:
    return str(addr) if not isinstance(addr, bytes) else "0x" + addr.hex()


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


def create_text_task(contract, deadline=0):
    return contract.create_case("T", "D", "C", "MANUAL", "", "TEXT_SUBMISSION", deadline, "", 2)


def evaluate_approve(contract, direct_vm, task_id):
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps({
        "decision": "APPROVE",
        "score": 90,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "Valid.",
        "reason_code": "SOLVES_ISSUE",
        "missing_requirements": [],
        "required_revision": "",
    }))
    contract.evaluate_task(task_id)


def test_reputation_updates_on_create_finalize(contract, direct_vm, direct_owner, direct_bob):
    task_id = create_text_task(contract)
    creator_rep = contract.get_reputation(addr_hex(direct_owner))
    assert creator_rep["tasks_created"] == 1

    with direct_vm.prank(direct_bob):
        contract.submit_proof(task_id, "", "done")
    evaluate_approve(contract, direct_vm, task_id)
    contract.finalize_task(task_id)

    creator_rep = contract.get_reputation(addr_hex(direct_owner))
    worker_rep = contract.get_reputation(addr_hex(direct_bob))
    assert creator_rep["total_paid"] == 1000
    assert worker_rep["tasks_completed"] == 1
    assert worker_rep["tasks_approved"] == 1
    assert worker_rep["total_earned"] == 1000


def test_reputation_updates_on_cancel(contract, direct_owner):
    task_id = create_text_task(contract)
    contract.cancel_task(task_id)
    rep = contract.get_reputation(addr_hex(direct_owner))
    assert rep["tasks_created"] == 1
    assert rep["tasks_canceled"] == 1
    assert rep["total_refunded"] == 1000


def test_task_manifest_is_machine_readable(contract):
    task_id = create_text_task(contract)
    manifest = contract.get_task_manifest(task_id)
    assert manifest["protocol"] == "proofworks-v1"
    assert manifest["task_id"] == task_id
    assert manifest["source"]["type"] == "MANUAL"
    assert manifest["proof_schema"]["type"] == "TEXT_SUBMISSION"
    assert manifest["settlement"]["reward_amount"] == 1000


def test_release_expired_claim(contract, direct_vm, direct_bob):
    # deadline is used as claim expiry timestamp for claimed tasks.
    direct_vm.warp("2026-01-01T00:00:00Z")
    task_id = create_text_task(contract, deadline=100)
    with direct_vm.prank(direct_bob):
        contract.claim_task(task_id)
    assert contract.get_task(task_id)["status"] == "CLAIMED"

    direct_vm.warp("2026-01-01T00:05:00Z")
    contract.release_expired_claim(task_id)
    task = contract.get_task(task_id)
    assert task["status"] == "OPEN"
    assert task["assigned_worker"] == "0x0000000000000000000000000000000000000000"


def test_release_claim_rejects_when_not_expired(contract, direct_vm, direct_bob):
    direct_vm.warp("1970-01-01T00:00:01Z")
    task_id = create_text_task(contract, deadline=999999)
    with direct_vm.prank(direct_bob):
        contract.claim_task(task_id)
    with direct_vm.expect_revert("CLAIM_NOT_EXPIRED"):
        contract.release_expired_claim(task_id)
