import pytest

CONTRACT = "contracts/proofworks_escrow.py"
ZERO = "0x0000000000000000000000000000000000000000"


def addr_hex(addr) -> str:
    if isinstance(addr, bytes):
        return "0x" + addr.hex()
    return str(addr)


def create_default_task(contract, assigned_worker: str = ""):
    return contract.create_task(
        "Fix README typo",
        "The README has a typo in the installation section.",
        "A pull request must update the README and clearly fix the typo.",
        "GITHUB_PR",
        0,
        assigned_worker,
    )


@pytest.fixture
def contract(direct_deploy, direct_vm):
    direct_vm.value = 1000
    return direct_deploy(CONTRACT, sdk_version="v0.2.12")


def test_initial_state(contract):
    assert contract.get_task_count() == 0
    assert contract.task_exists(1) is False


def test_create_valid_open_task(contract, direct_owner):
    task_id = create_default_task(contract)

    assert task_id == 1
    assert contract.get_task_count() == 1
    assert contract.task_exists(1) is True

    task = contract.get_task(1)
    assert task["task_id"] == 1
    assert task["creator"] == addr_hex(direct_owner)
    assert task["assigned_worker"] == ZERO
    assert task["title"] == "Fix README typo"
    assert task["evidence_type"] == "GITHUB_PR"
    assert task["status"] == "OPEN"
    assert task["proof_url"] == ""
    assert task["proof_text"] == ""
    assert task["canceled"] is False


def test_create_task_trims_and_uppercases_evidence_type(contract):
    task_id = contract.create_task(
        "  Write tutorial  ",
        "  Useful description  ",
        "  Must explain non-determinism  ",
        " github_pr ",
        123,
        "",
    )
    task = contract.get_task(task_id)
    assert task["title"] == "Write tutorial"
    assert task["description"] == "Useful description"
    assert task["acceptance_criteria"] == "Must explain non-determinism"
    assert task["evidence_type"] == "GITHUB_PR"
    assert task["deadline"] == 123


def test_create_assigned_task_starts_claimed(contract, direct_bob):
    task_id = create_default_task(contract, assigned_worker=addr_hex(direct_bob))
    task = contract.get_task(task_id)
    assert task["status"] == "CLAIMED"
    assert task["assigned_worker"] == addr_hex(direct_bob)


def test_create_rejects_invalid_inputs(contract, direct_vm):
    with direct_vm.expect_revert("TITLE_REQUIRED"):
        contract.create_task("", "desc", "criteria", "GITHUB_PR", 0, "")

    with direct_vm.expect_revert("ACCEPTANCE_CRITERIA_REQUIRED"):
        contract.create_task("title", "desc", "", "GITHUB_PR", 0, "")

    with direct_vm.expect_revert("UNSUPPORTED_EVIDENCE_TYPE"):
        contract.create_task("title", "desc", "criteria", "NOT_REAL", 0, "")

    with direct_vm.expect_revert("INVALID_DEADLINE"):
        contract.create_task("title", "desc", "criteria", "GITHUB_PR", -1, "")


def test_creator_cannot_assign_self(contract, direct_owner, direct_vm):
    with direct_vm.expect_revert("CREATOR_CANNOT_BE_ASSIGNED_WORKER"):
        create_default_task(contract, assigned_worker=addr_hex(direct_owner))


def test_claim_open_task(contract, direct_vm, direct_bob):
    create_default_task(contract)

    with direct_vm.prank(direct_bob):
        contract.claim_task(1)

    task = contract.get_task(1)
    assert task["status"] == "CLAIMED"
    assert task["assigned_worker"] == addr_hex(direct_bob)


def test_creator_cannot_claim_own_task(contract, direct_vm):
    create_default_task(contract)
    with direct_vm.expect_revert("CREATOR_CANNOT_CLAIM"):
        contract.claim_task(1)


def test_cannot_claim_twice(contract, direct_vm, direct_bob, direct_charlie):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)

    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("TASK_NOT_OPEN"):
            contract.claim_task(1)


def test_assigned_worker_submits_github_proof(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)
        contract.submit_proof(1, "https://github.com/example/repo/pull/1", "Implemented the README fix.")

    task = contract.get_task(1)
    assert task["status"] == "SUBMITTED"
    assert task["assigned_worker"] == addr_hex(direct_bob)
    assert task["proof_url"] == "https://github.com/example/repo/pull/1"
    assert task["proof_text"] == "Implemented the README fix."


def test_open_task_first_submitter_becomes_worker(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.submit_proof(1, "https://github.com/example/repo/pull/2", "Done")

    task = contract.get_task(1)
    assert task["status"] == "SUBMITTED"
    assert task["assigned_worker"] == addr_hex(direct_bob)


def test_unassigned_creator_cannot_submit_proof(contract, direct_vm):
    create_default_task(contract)
    with direct_vm.expect_revert("CREATOR_CANNOT_SUBMIT_PROOF"):
        contract.submit_proof(1, "https://github.com/example/repo/pull/1", "Done")


def test_only_assigned_worker_can_submit_for_claimed_task(contract, direct_vm, direct_bob, direct_charlie):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)

    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("ONLY_ASSIGNED_WORKER"):
            contract.submit_proof(1, "https://github.com/example/repo/pull/3", "Done")


def test_submit_proof_requires_proof(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)
        with direct_vm.expect_revert("PROOF_REQUIRED"):
            contract.submit_proof(1, "", "")


def test_github_task_requires_url(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)
        with direct_vm.expect_revert("PROOF_URL_REQUIRED"):
            contract.submit_proof(1, "", "text-only proof")


def test_creator_can_cancel_open_task(contract, direct_vm):
    create_default_task(contract)
    contract.cancel_task(1)

    task = contract.get_task(1)
    assert task["status"] == "CANCELED"
    assert task["canceled"] is True


def test_creator_can_cancel_claimed_task_before_submission(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)

    contract.cancel_task(1)
    task = contract.get_task(1)
    assert task["status"] == "CANCELED"


def test_non_creator_cannot_cancel(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("ONLY_CREATOR"):
            contract.cancel_task(1)


def test_cannot_cancel_after_submission(contract, direct_vm, direct_bob):
    create_default_task(contract)
    with direct_vm.prank(direct_bob):
        contract.claim_task(1)
        contract.submit_proof(1, "https://github.com/example/repo/pull/4", "Done")

    with direct_vm.expect_revert("TASK_CANNOT_BE_CANCELED"):
        contract.cancel_task(1)


def test_missing_task_reverts(contract, direct_vm):
    with direct_vm.expect_revert("TASK_NOT_FOUND"):
        contract.get_task(999)
    with direct_vm.expect_revert("TASK_NOT_FOUND"):
        contract.claim_task(999)
    with direct_vm.expect_revert("TASK_NOT_FOUND"):
        contract.submit_proof(999, "https://github.com/example/repo/pull/1", "Done")
    with direct_vm.expect_revert("TASK_NOT_FOUND"):
        contract.cancel_task(999)
