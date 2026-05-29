import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"


def addr_hex(addr) -> str:
    if isinstance(addr, bytes):
        return "0x" + addr.hex()
    return str(addr)


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


@pytest.fixture
def eth_sends(direct_vm):
    sent = []

    def hook(vm, request):
        if "EthSend" in request:
            data = request["EthSend"]
            sent.append({
                "address": str(data["address"]),
                "value": int(data.get("value", 0)),
                "calldata": data.get("calldata", b""),
            })
            return {"ok": None}
        return None

    direct_vm._gl_call_hook = hook
    return sent


def create_and_submit_text_task(contract, direct_vm, direct_bob):
    task_id = contract.create_task(
        "Write docs",
        "Write a short guide.",
        "The guide must explain the contract lifecycle.",
        "TEXT_SUBMISSION",
        0,
        "",
    )
    with direct_vm.prank(direct_bob):
        contract.submit_proof(task_id, "", "Here is the completed guide text.")
    return task_id


def evaluate_with(contract, direct_vm, task_id, payload):
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps(payload))
    contract.evaluate_task(task_id)


def test_create_task_records_reward_and_summary(contract):
    task_id = contract.create_task("Task", "Desc", "Criteria", "TEXT_SUBMISSION", 0, "")
    task = contract.get_task(task_id)
    summary = contract.get_escrow_summary()

    assert task["reward_amount"] == 1000
    assert task["finalized"] is False
    assert summary["total_escrowed"] == 1000
    assert summary["total_finalized"] == 0
    assert summary["active_escrow"] == 1000


def test_create_task_requires_reward(contract, direct_vm):
    direct_vm.value = 0
    with direct_vm.expect_revert("REWARD_REQUIRED"):
        contract.create_task("Task", "Desc", "Criteria", "TEXT_SUBMISSION", 0, "")


def test_finalize_approve_pays_worker(contract, direct_vm, direct_bob, eth_sends):
    task_id = create_and_submit_text_task(contract, direct_vm, direct_bob)
    evaluate_with(contract, direct_vm, task_id, {
        "decision": "APPROVE",
        "score": 99,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "The work satisfies the criteria.",
        "required_revision": "",
    })

    contract.finalize_task(task_id)
    task = contract.get_task(task_id)
    summary = contract.get_escrow_summary()

    assert task["status"] == "PAID"
    assert task["finalized"] is True
    assert task["worker_payout"] == 1000
    assert task["creator_refund"] == 0
    assert summary["total_finalized"] == 1000
    assert summary["active_escrow"] == 0
    assert eth_sends == [{"address": addr_hex(direct_bob), "value": 1000, "calldata": b""}]


def test_finalize_reject_refunds_creator(contract, direct_vm, direct_owner, direct_bob, eth_sends):
    task_id = create_and_submit_text_task(contract, direct_vm, direct_bob)
    evaluate_with(contract, direct_vm, task_id, {
        "decision": "REJECT",
        "score": 5,
        "payout_percent": 0,
        "confidence": "HIGH",
        "reason": "The proof does not satisfy the criteria.",
        "required_revision": "",
    })

    contract.finalize_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "REFUNDED"
    assert task["worker_payout"] == 0
    assert task["creator_refund"] == 1000
    assert eth_sends == [{"address": addr_hex(direct_owner), "value": 1000, "calldata": b""}]


def test_finalize_partial_splits_reward(contract, direct_vm, direct_owner, direct_bob, eth_sends):
    task_id = create_and_submit_text_task(contract, direct_vm, direct_bob)
    evaluate_with(contract, direct_vm, task_id, {
        "decision": "PARTIAL",
        "score": 60,
        "payout_percent": 35,
        "confidence": "MEDIUM",
        "reason": "The work satisfies some but not all criteria.",
        "required_revision": "",
    })

    contract.finalize_task(task_id)
    task = contract.get_task(task_id)

    assert task["status"] == "PARTIALLY_PAID"
    assert task["worker_payout"] == 350
    assert task["creator_refund"] == 650
    assert eth_sends == [
        {"address": addr_hex(direct_bob), "value": 350, "calldata": b""},
        {"address": addr_hex(direct_owner), "value": 650, "calldata": b""},
    ]


def test_finalize_needs_revision_reverts(contract, direct_vm, direct_bob, eth_sends):
    task_id = create_and_submit_text_task(contract, direct_vm, direct_bob)
    evaluate_with(contract, direct_vm, task_id, {
        "decision": "NEEDS_REVISION",
        "score": 50,
        "payout_percent": 0,
        "confidence": "MEDIUM",
        "reason": "Needs changes.",
        "required_revision": "Add lifecycle details.",
    })

    with direct_vm.expect_revert("REVISION_REQUIRED"):
        contract.finalize_task(task_id)
    assert eth_sends == []


def test_finalize_requires_evaluation(contract, direct_vm):
    task_id = contract.create_task("Task", "Desc", "Criteria", "TEXT_SUBMISSION", 0, "")
    with direct_vm.expect_revert("TASK_NOT_EVALUATED"):
        contract.finalize_task(task_id)


def test_finalize_cannot_run_twice(contract, direct_vm, direct_bob, eth_sends):
    task_id = create_and_submit_text_task(contract, direct_vm, direct_bob)
    evaluate_with(contract, direct_vm, task_id, {
        "decision": "APPROVE",
        "score": 99,
        "payout_percent": 100,
        "confidence": "HIGH",
        "reason": "Valid.",
        "required_revision": "",
    })
    contract.finalize_task(task_id)

    with direct_vm.expect_revert("TASK_ALREADY_FINALIZED"):
        contract.finalize_task(task_id)
    assert len(eth_sends) == 1


def test_cancel_refunds_creator(contract, direct_vm, direct_owner, eth_sends):
    task_id = contract.create_task("Task", "Desc", "Criteria", "TEXT_SUBMISSION", 0, "")

    contract.cancel_task(task_id)
    task = contract.get_task(task_id)
    summary = contract.get_escrow_summary()

    assert task["status"] == "CANCELED"
    assert task["canceled"] is True
    assert task["finalized"] is True
    assert task["worker_payout"] == 0
    assert task["creator_refund"] == 1000
    assert summary["active_escrow"] == 0
    assert eth_sends == [{"address": addr_hex(direct_owner), "value": 1000, "calldata": b""}]
