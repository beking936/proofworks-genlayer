import json
import pytest
from genlayer.py.types import Address

CONTRACT = "contracts/proofworks_escrow.py"

def addr_hex(addr) -> str:
    return str(addr) if not isinstance(addr, bytes) else "0x" + addr.hex()

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


# Helper functions
def create_staked_case(contract, stake_pct=10):
    return contract.create_case(
        "Staked Bounty", "Do work.", "Pass criteria.", "MANUAL", "", "TEXT_SUBMISSION", 10000, "", 2, stake_pct
    )

def evaluate_task_to(contract, direct_vm, task_id, decision="APPROVE", pct=100):
    direct_vm.mock_llm(r"(?s).*ProofWorks.*", json.dumps({
        "decision": decision,
        "score": 90,
        "payout_percent": pct,
        "confidence": "HIGH",
        "reason": "Satisfactory execution.",
        "reason_code": "SOLVES_ISSUE",
        "missing_requirements": [],
        "required_revision": "",
    }))
    contract.evaluate_task(task_id)


# --- 1. Worker Staking Tests ---

def test_claim_staked_bounty_reverts_if_insufficient_stake(contract, direct_vm, direct_bob):
    tid = create_staked_case(contract, stake_pct=10) # 10% of 1000 is 100 stake
    with direct_vm.prank(direct_bob):
        direct_vm.value = 50 # Send too little
        with direct_vm.expect_revert("INSUFFICIENT_CLAIM_STAKE"):
            contract.claim_task(tid)

def test_claim_staked_bounty_succeeds_with_stake(contract, direct_vm, direct_bob):
    tid = create_staked_case(contract, stake_pct=15) # 150 stake required
    with direct_vm.prank(direct_bob):
        direct_vm.value = 150
        contract.claim_task(tid)
    task = contract.get_task(tid)
    assert task["assigned_worker"] == addr_hex(direct_bob)
    assert task["worker_stake"] == 150

def test_payout_returns_stake_on_finalization(contract, direct_vm, direct_bob, eth_sends):
    tid = create_staked_case(contract, stake_pct=10) # 100 stake
    with direct_vm.prank(direct_bob):
        direct_vm.value = 100
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "APPROVE", 100)
    
    eth_sends.clear()
    contract.finalize_task(tid)
    
    # Payout should be: 1000 (worker reward) + 100 (stake returned) = 1100 to Bob
    bob_sends = [s for s in eth_sends if s["address"] == addr_hex(direct_bob)]
    assert len(bob_sends) == 2
    total_bob_received = sum(s["value"] for s in bob_sends)
    assert total_bob_received == 1100

def test_forfeit_stake_on_expired_claim(contract, direct_vm, direct_bob, eth_sends):
    # Set deadline of 100 seconds from 1970 base
    direct_vm.warp("2026-01-01T00:00:00Z")
    # 2026-01-01 timestamp is 1767225600.
    # Set deadline of 100 seconds in the future
    deadline = 1767225600 + 100
    
    tid = contract.create_case(
        "Staked Bounty", "Do work.", "Pass criteria.", "MANUAL", "", "TEXT_SUBMISSION", deadline, "", 2, 10
    )
    with direct_vm.prank(direct_bob):
        direct_vm.value = 100
        contract.claim_task(tid)
    
    # Warp time past deadline
    direct_vm.warp("2026-01-01T00:05:00Z") # 300 seconds later
    
    eth_sends.clear()
    contract.release_expired_claim(tid)
    
    task = contract.get_task(tid)
    assert task["assigned_worker"] == "0x0000000000000000000000000000000000000000"
    assert task["status"] == "OPEN"
    assert task["worker_stake"] == 0
    
    # Forfeited stake (100) split: 50 to creator, 50 to treasury (Address 0x9999...)
    creator_sends = [s for s in eth_sends if s["address"] == addr_hex(contract.owner)]
    treasury_sends = [s for s in eth_sends if s["address"] == "0x9999999999999999999999999999999999999999"]
    assert len(creator_sends) == 1
    assert creator_sends[0]["value"] == 50
    assert len(treasury_sends) == 1
    assert treasury_sends[0]["value"] == 50


# --- 2. Creator Tips ---

def test_creator_tip_worker_recounts_earned_reputation(contract, direct_vm, direct_bob, eth_sends):
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "APPROVE", 100)
    contract.finalize_task(tid)
    
    rep_before = contract.get_reputation(addr_hex(direct_bob))
    assert rep_before["total_earned"] == 1000
    
    eth_sends.clear()
    # Creator tips 500 wei
    direct_vm.value = 500
    contract.tip_worker(tid)
    
    # Tip goes to worker
    assert eth_sends[0]["address"] == addr_hex(direct_bob)
    assert eth_sends[0]["value"] == 500
    
    # Reputation is updated
    rep_after = contract.get_reputation(addr_hex(direct_bob))
    assert rep_after["total_earned"] == 1500


# --- 3. Appeal & Human Jury Tests ---

def test_appeal_verdict_locks_status_and_requires_bond(contract, direct_vm, direct_bob):
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "REJECT", 0)
    
    # Try to appeal with insufficient bond (20% of 1000 = 200 required)
    with direct_vm.prank(direct_bob):
        direct_vm.value = 100
        with direct_vm.expect_revert("INSUFFICIENT_APPEAL_BOND"):
            contract.appeal_verdict(tid)
            
    # Succeeds with 200 bond
    with direct_vm.prank(direct_bob):
        direct_vm.value = 200
        contract.appeal_verdict(tid)
        
    task = contract.get_task(tid)
    assert task["status"] == "APPEALED"
    assert task["is_appealed"] is True
    assert task["appeal_bond"] == 200
    assert task["appellant"] == addr_hex(direct_bob)
    assert task["juror1"] == "0x363403E6502DD64C84c5A4558C70c822Eaad05B7"

def test_jury_votes_resolves_appeal_worker_wins(contract, direct_vm, direct_bob, eth_sends):
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "REJECT", 0)
    
    with direct_vm.prank(direct_bob):
        direct_vm.value = 200
        contract.appeal_verdict(tid)
        
    juror1 = Address("0x363403E6502DD64C84c5A4558C70c822Eaad05B7")
    juror2 = Address("0x349738621751dA80305c9E67B5D71Ee723142Bd8")
    juror3 = Address("0x5b3A94f5013C92461cF24f86FC25298CB7519D26")
    
    with direct_vm.prank(juror1):
        contract.cast_jury_vote(tid, "APPROVE")
    with direct_vm.prank(juror2):
        contract.cast_jury_vote(tid, "APPROVE")
        
    eth_sends.clear()
    with direct_vm.prank(juror3):
        contract.cast_jury_vote(tid, "REJECT") # 2-1 APPROVE wins
        
    task = contract.get_task(tid)
    assert task["status"] == "APPROVED"
    assert task["decision"] == "APPROVE"
    assert task["payout_percent"] == 100
    assert task["is_appealed"] is False
    
    # Bond is refunded to appellant (Bob) because Bob won (wanted APPROVE and got APPROVE)
    bob_sends = [s for s in eth_sends if s["address"] == addr_hex(direct_bob)]
    assert len(bob_sends) == 1
    assert bob_sends[0]["value"] == 200

def test_jury_votes_resolves_appeal_worker_loses(contract, direct_vm, direct_bob, eth_sends):
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "REJECT", 0)
    
    with direct_vm.prank(direct_bob):
        direct_vm.value = 200
        contract.appeal_verdict(tid)
        
    juror1 = Address("0x363403E6502DD64C84c5A4558C70c822Eaad05B7")
    juror2 = Address("0x349738621751dA80305c9E67B5D71Ee723142Bd8")
    juror3 = Address("0x5b3A94f5013C92461cF24f86FC25298CB7519D26")
    
    with direct_vm.prank(juror1):
        contract.cast_jury_vote(tid, "REJECT")
    with direct_vm.prank(juror2):
        contract.cast_jury_vote(tid, "REJECT")
        
    eth_sends.clear()
    with direct_vm.prank(juror3):
        contract.cast_jury_vote(tid, "APPROVE") # 2-1 REJECT wins, Bob loses
        
    task = contract.get_task(tid)
    assert task["status"] == "REJECTED"
    assert task["decision"] == "REJECT"
    
    # Bond is split as jury fees: 66/66/68 split
    juror_sends = [s for s in eth_sends if s["address"] in (juror1.as_hex, juror2.as_hex, juror3.as_hex)]
    assert len(juror_sends) == 3
    total_split = sum(s["value"] for s in juror_sends)
    assert total_split == 200


# --- 4. Flagging Window Tests ---

def test_flagging_window_restricts_instant_finalization(contract, direct_vm, direct_bob):
    # Enable flagging delay of 1 hour
    contract.set_flagging_delay(3600)
    
    # Base start time
    direct_vm.warp("2026-01-01T00:00:00Z")
    
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "APPROVE", 100)
    
    # Instant finalize reverts because window is active
    with pytest.raises(Exception) as exc_info:
        contract.finalize_task(tid)
    assert "FLAGGING_WINDOW_ACTIVE" in str(exc_info.value)
    
    # Warp past the 1-hour delay
    direct_vm.warp("2026-01-01T01:05:00Z")
    contract.finalize_task(tid) # Succeeds
    assert contract.get_task(tid)["finalized"] is True

def test_flagging_evaluation_escalates_to_appeal(contract, direct_vm, direct_bob, direct_charlie):
    contract.set_flagging_delay(3600)
    direct_vm.warp("2026-01-01T00:00:00Z")
    
    tid = create_staked_case(contract, stake_pct=0)
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "done")
    evaluate_task_to(contract, direct_vm, tid, "APPROVE", 100)
    
    # Charlie flags the evaluation within window
    with direct_vm.prank(direct_charlie):
        direct_vm.value = 100
        contract.flag_evaluation(tid, "This is spam.")
        
    task = contract.get_task(tid)
    assert task["status"] == "APPEALED"
    assert task["is_appealed"] is True


# --- 5. Team Payout Splits Tests ---

def test_team_splits_distribute_rewards_accordingly(contract, direct_vm, direct_bob, direct_charlie, eth_sends):
    tid = create_staked_case(contract, stake_pct=0)
    
    # Creator configures a team split of 60/40 between Bob and Charlie
    members = [direct_bob, direct_charlie]
    splits = [60, 40]
    contract.register_team(tid, members, splits)
    
    # Worker claims and submits
    with direct_vm.prank(direct_bob):
        contract.claim_task(tid)
        contract.submit_proof(tid, "", "joint work deliverable")
        
    evaluate_task_to(contract, direct_vm, tid, "APPROVE", 100)
    
    eth_sends.clear()
    contract.finalize_task(tid)
    
    # 600 to Bob, 400 to Charlie
    bob_sends = [s for s in eth_sends if s["address"] == addr_hex(direct_bob)]
    charlie_sends = [s for s in eth_sends if s["address"] == addr_hex(direct_charlie)]
    assert len(bob_sends) == 1
    assert bob_sends[0]["value"] == 600
    assert len(charlie_sends) == 1
    assert charlie_sends[0]["value"] == 400
    
    # Both reputations updated
    rep_bob = contract.get_reputation(addr_hex(direct_bob))
    rep_charlie = contract.get_reputation(addr_hex(direct_charlie))
    assert rep_bob["total_earned"] == 600
    assert rep_bob["tasks_completed"] == 1
    assert rep_charlie["total_earned"] == 400
    assert rep_charlie["tasks_completed"] == 1
