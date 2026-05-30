import json
import pytest

CONTRACT = "contracts/proofworks_escrow.py"

@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")

def create_ms(contract):
    return contract.create_milestone_case(
        "Build feature", "Complex feature", "Complete all milestones", "MANUAL", "", "TEXT_SUBMISSION", 0, "", 2,
        "Design", "Submit design docs", 20,
        "Implementation", "Submit implementation", 50,
        "Tests", "Submit tests", 30,
    )

def mock_eval(direct_vm, decision="APPROVE", pct=100):
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps({
        "decision": decision,
        "score": 90,
        "payout_percent": pct,
        "confidence": "HIGH",
        "reason": "Milestone satisfies criteria.",
        "reason_code": "SOLVES_ISSUE",
        "missing_requirements": [],
        "required_revision": "",
    }))

def test_create_milestone_case(contract):
    tid = create_ms(contract)
    task = contract.get_task(tid)
    assert task["is_milestone_task"] is True
    assert task["milestone_count"] == 3
    assert contract.get_milestone(tid, 1)["payout_percent_of_task"] == 20
    assert contract.get_milestone(tid, 2)["title"] == "Implementation"


def test_milestone_sum_required(contract, direct_vm):
    with direct_vm.expect_revert("MILESTONE_PERCENT_SUM"):
        contract.create_milestone_case("T","D","C","MANUAL","","TEXT_SUBMISSION",0,"",2,"A","A",60,"B","B",30,"","",0)


def test_submit_evaluate_finalize_milestone(contract, direct_vm, direct_bob):
    tid = create_ms(contract)
    with direct_vm.prank(direct_bob):
        contract.submit_milestone_proof(tid, 1, "", "design done")
    mock_eval(direct_vm)
    contract.evaluate_milestone(tid, 1)
    ms = contract.get_milestone(tid, 1)
    assert ms["status"] == "APPROVED"
    contract.finalize_milestone(tid, 1)
    ms = contract.get_milestone(tid, 1)
    task = contract.get_task(tid)
    assert ms["status"] == "PAID"
    assert ms["worker_payout"] == 200
    assert task["milestones_finalized"] == 1
    assert task["milestone_finalized_amount"] == 200


def test_all_milestones_finalize_task(contract, direct_vm, direct_bob):
    tid = create_ms(contract)
    for i in [1, 2, 3]:
        with direct_vm.prank(direct_bob):
            contract.submit_milestone_proof(tid, i, "", f"done {i}")
        mock_eval(direct_vm)
        contract.evaluate_milestone(tid, i)
        contract.finalize_milestone(tid, i)
        direct_vm.clear_mocks()
    task = contract.get_task(tid)
    assert task["finalized"] is True
    assert task["status"] == "PAID"
    assert task["milestone_finalized_amount"] == 1000
