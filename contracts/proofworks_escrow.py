# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
# Explicit imports keep direct tests stable across Python/SDK loader variants
# where star imports may not populate every runtime type. `gl` itself is
# provided by `from genlayer import *` in the GenVM SDK.
from genlayer.py.types import Address, u256, u64, u32
from genlayer.py.storage import TreeMap, allow_storage
from dataclasses import dataclass
import json


STATUS_OPEN = "OPEN"
STATUS_CLAIMED = "CLAIMED"
STATUS_SUBMITTED = "SUBMITTED"
STATUS_EVALUATING = "EVALUATING"
STATUS_APPROVED = "APPROVED"
STATUS_REJECTED = "REJECTED"
STATUS_PARTIAL = "PARTIAL"
STATUS_NEEDS_REVISION = "NEEDS_REVISION"
STATUS_PAID = "PAID"
STATUS_REFUNDED = "REFUNDED"
STATUS_PARTIALLY_PAID = "PARTIALLY_PAID"
STATUS_CANCELED = "CANCELED"

SOURCE_MANUAL = "MANUAL"
SOURCE_GITHUB_ISSUE = "GITHUB_ISSUE"
SOURCE_GITHUB_PR = "GITHUB_PR"
SOURCE_URL_SPEC = "URL_SPEC"

REASON_SOLVES_ISSUE = "SOLVES_ISSUE"
REASON_UNRELATED_PR = "UNRELATED_PR"
REASON_INCOMPLETE_SCOPE = "INCOMPLETE_SCOPE"
REASON_NEEDS_TESTS = "NEEDS_TESTS"
REASON_NEEDS_REVIEW = "NEEDS_REVIEW"
REASON_AMBIGUOUS = "AMBIGUOUS"
REASON_OTHER = "OTHER"

DECISION_APPROVE = "APPROVE"
DECISION_REJECT = "REJECT"
DECISION_PARTIAL = "PARTIAL"
DECISION_NEEDS_REVISION = "NEEDS_REVISION"

CONFIDENCE_LOW = "LOW"
CONFIDENCE_MEDIUM = "MEDIUM"
CONFIDENCE_HIGH = "HIGH"

EVIDENCE_GITHUB_PR = "GITHUB_PR"
EVIDENCE_GITHUB_ISSUE = "GITHUB_ISSUE"
EVIDENCE_URL_DOCUMENT = "URL_DOCUMENT"
EVIDENCE_TEXT_SUBMISSION = "TEXT_SUBMISSION"

ZERO_ADDRESS = Address("0x0000000000000000000000000000000000000000")


@gl.evm.contract_interface
class _ExternalRecipient:
    class View:
        pass

    class Write:
        pass


def _to_upper_string(value) -> str:
    return str(value).strip().upper()


def _coerce_int(value) -> int:
    if isinstance(value, bool):
        raise ValueError("boolean is not an integer field")
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if value != int(value):
            raise ValueError("non-integer float")
        return int(value)
    return int(str(value).strip())


def _strip_url_noise(url: str) -> str:
    clean = url.strip()
    # Users often paste Markdown links, angle-bracketed URLs, or text copied
    # from rendered UIs. Be permissive and extract the GitHub URL portion.
    if "](" in clean and ")" in clean:
        start = clean.find("](") + 2
        stop = clean.find(")", start)
        if stop > start:
            clean = clean[start:stop]

    github_pos = clean.find("github.com/")
    if github_pos > 0:
        clean = clean[github_pos:]

    for ch in ("`", "'", '"', "<", ">", "[", "]", "(", ")"):
        clean = clean.replace(ch, "")

    hash_pos = clean.find("#")
    if hash_pos >= 0:
        clean = clean[:hash_pos]
    query_pos = clean.find("?")
    if query_pos >= 0:
        clean = clean[:query_pos]
    while clean.endswith("/"):
        clean = clean[:-1]
    return clean.strip()


def _parse_github_pr_url(url: str) -> dict:
    """Parse a GitHub pull request URL into API fields.

    Accepted examples:
    - https://github.com/owner/repo/pull/43
    - http://github.com/owner/repo/pull/43/files
    - github.com/owner/repo/pull/43?tab=files
    - [PR](https://github.com/owner/repo/pull/43)
    """
    clean = _strip_url_noise(url)
    prefix_https = "https://github.com/"
    prefix_http = "http://github.com/"
    prefix_bare = "github.com/"

    if clean.startswith(prefix_https):
        path = clean[len(prefix_https):]
    elif clean.startswith(prefix_http):
        path = clean[len(prefix_http):]
    elif clean.startswith(prefix_bare):
        path = clean[len(prefix_bare):]
    else:
        raise ValueError("invalid github host")

    parts = [part.strip() for part in path.split("/") if len(part.strip()) > 0]
    if len(parts) < 4:
        raise ValueError("invalid github pr path")

    owner = parts[0]
    repo = parts[1]
    kind = parts[2]
    number_text = parts[3]
    if len(owner) == 0 or len(repo) == 0 or kind != "pull":
        raise ValueError("invalid github pr path")

    digits = ""
    for ch in number_text:
        if ch >= "0" and ch <= "9":
            digits += ch
        else:
            break
    if len(digits) == 0:
        raise ValueError("invalid github pr number")

    number = _coerce_int(digits)
    if number <= 0:
        raise ValueError("invalid github pr number")

    return {
        "owner": owner,
        "repo": repo,
        "number": number,
        "api_pr_url": f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}",
        "api_files_url": f"https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files",
    }




def _parse_github_issue_url(url: str) -> dict:
    """Parse a GitHub issue URL into API fields."""
    clean = _strip_url_noise(url)
    prefix_https = "https://github.com/"
    prefix_http = "http://github.com/"
    prefix_bare = "github.com/"

    if clean.startswith(prefix_https):
        path = clean[len(prefix_https):]
    elif clean.startswith(prefix_http):
        path = clean[len(prefix_http):]
    elif clean.startswith(prefix_bare):
        path = clean[len(prefix_bare):]
    else:
        raise ValueError("invalid github host")

    parts = [part.strip() for part in path.split("/") if len(part.strip()) > 0]
    if len(parts) < 4:
        raise ValueError("invalid github issue path")

    owner = parts[0]
    repo = parts[1]
    kind = parts[2]
    number_text = parts[3]
    if len(owner) == 0 or len(repo) == 0 or kind != "issues":
        raise ValueError("invalid github issue path")

    digits = ""
    for ch in number_text:
        if ch >= "0" and ch <= "9":
            digits += ch
        else:
            break
    if len(digits) == 0:
        raise ValueError("invalid github issue number")

    number = _coerce_int(digits)
    if number <= 0:
        raise ValueError("invalid github issue number")

    return {
        "owner": owner,
        "repo": repo,
        "number": number,
        "api_issue_url": f"https://api.github.com/repos/{owner}/{repo}/issues/{number}",
    }


def _build_adjudication_prompt(
    title: str,
    description: str,
    acceptance_criteria: str,
    source_type: str,
    source_url: str,
    evidence_type: str,
    proof_url: str,
    proof_text: str,
    source_evidence: str,
    github_evidence: str,
) -> str:
    return f"""
You are ProofWorks, a neutral GenLayer task fulfillment evaluator.

Evaluate whether the submitted proof satisfies the source work item and acceptance criteria.

TASK TITLE:
{title}

TASK DESCRIPTION:
{description}

ACCEPTANCE CRITERIA:
{acceptance_criteria}

SOURCE TYPE:
{source_type}

SOURCE URL:
{source_url}

PROOF EVIDENCE TYPE:
{evidence_type}

SUBMITTED PROOF URL:
{proof_url}

SUBMITTED PROOF TEXT:
{proof_text}

NORMALIZED SOURCE EVIDENCE, IF AVAILABLE:
{source_evidence}

NORMALIZED PROOF EVIDENCE, IF AVAILABLE:
{github_evidence}

Return ONLY a JSON object with exactly these keys:
- decision: one of APPROVE, REJECT, PARTIAL, NEEDS_REVISION
- score: integer 0-100
- payout_percent: integer 0-100
- confidence: one of LOW, MEDIUM, HIGH
- reason: concise explanation under 1000 characters
- reason_code: one of SOLVES_ISSUE, UNRELATED_PR, INCOMPLETE_SCOPE, NEEDS_TESTS, NEEDS_REVIEW, AMBIGUOUS, OTHER
- missing_requirements: array of short strings, empty array if none
- required_revision: empty string unless decision is NEEDS_REVISION

Decision rules:
- APPROVE requires payout_percent 100.
- REJECT requires payout_percent 0.
- PARTIAL requires payout_percent from 1 to 99.
- NEEDS_REVISION requires payout_percent 0 and a non-empty required_revision.
- For GitHub issue bounties, compare the source issue against the submitted PR and changed files.
""".strip()


def _compact_github_pr_evidence(pr_data: dict, files_data) -> dict:
    files_summary = []
    if isinstance(files_data, list):
        for item in files_data[:20]:
            if isinstance(item, dict):
                files_summary.append({
                    "filename": str(item.get("filename", ""))[:200],
                    "status": str(item.get("status", ""))[:50],
                    "additions": item.get("additions", 0),
                    "deletions": item.get("deletions", 0),
                    "changes": item.get("changes", 0),
                })

    return {
        "title": str(pr_data.get("title", ""))[:500],
        "body": str(pr_data.get("body", ""))[:3000],
        "state": str(pr_data.get("state", ""))[:50],
        "merged": bool(pr_data.get("merged", False)),
        "draft": bool(pr_data.get("draft", False)),
        "html_url": str(pr_data.get("html_url", ""))[:1000],
        "base_ref": str((pr_data.get("base") or {}).get("ref", ""))[:100],
        "head_ref": str((pr_data.get("head") or {}).get("ref", ""))[:100],
        "changed_files": pr_data.get("changed_files", len(files_summary)),
        "additions": pr_data.get("additions", 0),
        "deletions": pr_data.get("deletions", 0),
        "files": files_summary,
    }



def _compact_github_issue_evidence(issue_data: dict) -> dict:
    labels = []
    raw_labels = issue_data.get("labels", [])
    if isinstance(raw_labels, list):
        for item in raw_labels[:20]:
            if isinstance(item, dict):
                labels.append(str(item.get("name", ""))[:80])
            else:
                labels.append(str(item)[:80])

    return {
        "title": str(issue_data.get("title", ""))[:500],
        "body": str(issue_data.get("body", ""))[:3000],
        "state": str(issue_data.get("state", ""))[:50],
        "html_url": str(issue_data.get("html_url", ""))[:1000],
        "labels": labels,
        "comments": issue_data.get("comments", 0),
        "author": str((issue_data.get("user") or {}).get("login", ""))[:100],
    }


def _is_valid_raw_evaluation(data) -> bool:
    """Pure validation helper safe to use inside validator functions."""
    try:
        if not isinstance(data, dict):
            return False

        decision = _to_upper_string(data.get("decision", ""))
        if decision not in (DECISION_APPROVE, DECISION_REJECT, DECISION_PARTIAL, DECISION_NEEDS_REVISION):
            return False

        score = _coerce_int(data.get("score", -1))
        payout_percent = _coerce_int(data.get("payout_percent", -1))
        if score < 0 or score > 100:
            return False
        if payout_percent < 0 or payout_percent > 100:
            return False

        confidence = _to_upper_string(data.get("confidence", CONFIDENCE_MEDIUM))
        if confidence not in (CONFIDENCE_LOW, CONFIDENCE_MEDIUM, CONFIDENCE_HIGH):
            return False

        reason = str(data.get("reason", "")).strip()
        if len(reason) == 0 or len(reason) > 1000:
            return False

        revision = str(data.get("required_revision", "")).strip()
        if len(revision) > 1000:
            return False

        reason_code = _to_upper_string(data.get("reason_code", REASON_OTHER))
        if reason_code not in (REASON_SOLVES_ISSUE, REASON_UNRELATED_PR, REASON_INCOMPLETE_SCOPE, REASON_NEEDS_TESTS, REASON_NEEDS_REVIEW, REASON_AMBIGUOUS, REASON_OTHER):
            return False

        missing = data.get("missing_requirements", [])
        if not isinstance(missing, list):
            return False
        if len(missing) > 10:
            return False
        for item in missing:
            if len(str(item)) > 200:
                return False

        if decision == DECISION_APPROVE and payout_percent != 100:
            return False
        if decision == DECISION_REJECT and payout_percent != 0:
            return False
        if decision == DECISION_PARTIAL and (payout_percent <= 0 or payout_percent >= 100):
            return False
        if decision == DECISION_NEEDS_REVISION:
            if payout_percent != 0:
                return False
            if len(revision) == 0:
                return False

        return True
    except Exception:
        return False


@allow_storage
@dataclass
class Task:
    task_id: u256
    creator: Address
    assigned_worker: Address
    title: str
    description: str
    acceptance_criteria: str
    source_type: str
    source_url: str
    evidence_type: str
    reward_amount: u256
    deadline: u64
    status: str
    proof_url: str
    proof_text: str
    canceled: bool
    evaluated: bool
    decision: str
    score: u32
    payout_percent: u32
    confidence: str
    reason: str
    required_revision: str
    reason_code: str
    missing_requirements: str
    revision_count: u32
    max_revisions: u32
    finalized: bool
    worker_payout: u256
    creator_refund: u256


class ProofWorksEscrow(gl.Contract):
    """Deterministic ProofWorks task registry for Phase 1.

    Phase 1 intentionally does not perform AI adjudication or value transfers.
    It establishes the task lifecycle that later phases will extend:
    create -> claim -> submit proof, or create -> cancel.
    """

    next_task_id: u256
    tasks: TreeMap[u256, Task]
    total_escrowed: u256
    total_finalized: u256

    def __init__(self):
        self.next_task_id = u256(1)
        self.total_escrowed = u256(0)
        self.total_finalized = u256(0)

    def _require(self, condition: bool, message: str) -> None:
        if not condition:
            raise gl.vm.UserError(message)

    def _is_supported_evidence_type(self, evidence_type: str) -> bool:
        return (
            evidence_type == EVIDENCE_GITHUB_PR
            or evidence_type == EVIDENCE_GITHUB_ISSUE
            or evidence_type == EVIDENCE_URL_DOCUMENT
            or evidence_type == EVIDENCE_TEXT_SUBMISSION
        )

    def _is_supported_source_type(self, source_type: str) -> bool:
        return (
            source_type == SOURCE_MANUAL
            or source_type == SOURCE_GITHUB_ISSUE
            or source_type == SOURCE_GITHUB_PR
            or source_type == SOURCE_URL_SPEC
        )

    def _task_exists(self, task_id: u256) -> bool:
        return self.tasks.get(task_id, None) is not None

    def _get_existing_task(self, task_id: u256) -> Task:
        task = self.tasks.get(task_id, None)
        self._require(task is not None, "TASK_NOT_FOUND")
        return task

    def _create_task_internal(
        self,
        title: str,
        description: str,
        acceptance_criteria: str,
        source_type: str,
        source_url: str,
        evidence_type: str,
        deadline: int,
        assigned_worker: str,
        max_revisions: int,
    ) -> u256:
        clean_title = title.strip()
        clean_description = description.strip()
        clean_criteria = acceptance_criteria.strip()
        clean_source_type = source_type.strip().upper()
        clean_source_url = source_url.strip()
        clean_evidence_type = evidence_type.strip().upper()

        self._require(len(clean_title) > 0, "TITLE_REQUIRED")
        self._require(len(clean_title) <= 160, "TITLE_TOO_LONG")
        self._require(len(clean_description) <= 7000, "DESCRIPTION_TOO_LONG")
        self._require(len(clean_criteria) > 0, "ACCEPTANCE_CRITERIA_REQUIRED")
        self._require(len(clean_criteria) <= 7000, "ACCEPTANCE_CRITERIA_TOO_LONG")
        self._require(self._is_supported_source_type(clean_source_type), "UNSUPPORTED_SOURCE_TYPE")
        self._require(self._is_supported_evidence_type(clean_evidence_type), "UNSUPPORTED_EVIDENCE_TYPE")
        self._require(deadline >= 0, "INVALID_DEADLINE")
        self._require(max_revisions >= 0 and max_revisions <= 10, "INVALID_MAX_REVISIONS")
        self._require(len(clean_source_url) <= 1000, "SOURCE_URL_TOO_LONG")

        if clean_source_type == SOURCE_GITHUB_ISSUE:
            try:
                _parse_github_issue_url(clean_source_url)
            except Exception:
                raise gl.vm.UserError("INVALID_GITHUB_ISSUE_URL")
            self._require(clean_evidence_type == EVIDENCE_GITHUB_PR, "GITHUB_ISSUE_REQUIRES_PR_PROOF")
        elif clean_source_type == SOURCE_GITHUB_PR:
            try:
                _parse_github_pr_url(clean_source_url)
            except Exception:
                raise gl.vm.UserError("INVALID_SOURCE_GITHUB_PR_URL")
            self._require(clean_evidence_type == EVIDENCE_GITHUB_PR, "GITHUB_PR_SOURCE_REQUIRES_PR_PROOF")
        elif clean_source_type == SOURCE_URL_SPEC:
            self._require(len(clean_source_url) > 0, "SOURCE_URL_REQUIRED")

        worker = ZERO_ADDRESS
        if len(assigned_worker.strip()) > 0:
            worker = Address(assigned_worker)

        status = STATUS_OPEN
        if worker != ZERO_ADDRESS:
            self._require(worker != gl.message.sender_address, "CREATOR_CANNOT_BE_ASSIGNED_WORKER")
            status = STATUS_CLAIMED

        reward_amount = gl.message.value
        self._require(reward_amount > u256(0), "REWARD_REQUIRED")

        task_id = self.next_task_id
        self.next_task_id = u256(int(self.next_task_id) + 1)

        self.tasks[task_id] = Task(
            task_id=task_id,
            creator=gl.message.sender_address,
            assigned_worker=worker,
            title=clean_title,
            description=clean_description,
            acceptance_criteria=clean_criteria,
            source_type=clean_source_type,
            source_url=clean_source_url,
            evidence_type=clean_evidence_type,
            reward_amount=reward_amount,
            deadline=u64(deadline),
            status=status,
            proof_url="",
            proof_text="",
            canceled=False,
            evaluated=False,
            decision="",
            score=u32(0),
            payout_percent=u32(0),
            confidence="",
            reason="",
            required_revision="",
            reason_code="",
            missing_requirements="[]",
            revision_count=u32(0),
            max_revisions=u32(max_revisions),
            finalized=False,
            worker_payout=u256(0),
            creator_refund=u256(0),
        )
        self.total_escrowed = u256(int(self.total_escrowed) + int(reward_amount))
        return task_id

    @gl.public.write.payable
    def create_task(
        self,
        title: str,
        description: str,
        acceptance_criteria: str,
        evidence_type: str,
        deadline: int,
        assigned_worker: str,
    ) -> u256:
        """Legacy-compatible task creation. Uses MANUAL source."""
        return self._create_task_internal(
            title,
            description,
            acceptance_criteria,
            SOURCE_MANUAL,
            "",
            evidence_type,
            deadline,
            assigned_worker,
            2,
        )

    @gl.public.write.payable
    def create_case(
        self,
        title: str,
        description: str,
        acceptance_criteria: str,
        source_type: str,
        source_url: str,
        evidence_type: str,
        deadline: int,
        assigned_worker: str,
        max_revisions: int,
    ) -> u256:
        """Create a source-aware escrow case for Phase 6."""
        return self._create_task_internal(
            title,
            description,
            acceptance_criteria,
            source_type,
            source_url,
            evidence_type,
            deadline,
            assigned_worker,
            max_revisions,
        )

    @gl.public.write
    def claim_task(self, task_id: int) -> None:
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.status == STATUS_OPEN, "TASK_NOT_OPEN")
        self._require(task.creator != gl.message.sender_address, "CREATOR_CANNOT_CLAIM")
        task.assigned_worker = gl.message.sender_address
        task.status = STATUS_CLAIMED

    @gl.public.write
    def submit_proof(self, task_id: int, proof_url: str, proof_text: str) -> None:
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.status == STATUS_CLAIMED or task.status == STATUS_OPEN, "TASK_NOT_ACCEPTING_PROOF")

        if task.status == STATUS_OPEN:
            self._require(task.creator != gl.message.sender_address, "CREATOR_CANNOT_SUBMIT_PROOF")
            task.assigned_worker = gl.message.sender_address
        else:
            self._require(task.assigned_worker == gl.message.sender_address, "ONLY_ASSIGNED_WORKER")

        clean_url = proof_url.strip()
        clean_text = proof_text.strip()
        self._require(len(clean_url) > 0 or len(clean_text) > 0, "PROOF_REQUIRED")
        self._require(len(clean_url) <= 1000, "PROOF_URL_TOO_LONG")
        self._require(len(clean_text) <= 5000, "PROOF_TEXT_TOO_LONG")

        if task.evidence_type == EVIDENCE_GITHUB_PR or task.evidence_type == EVIDENCE_GITHUB_ISSUE or task.evidence_type == EVIDENCE_URL_DOCUMENT:
            self._require(len(clean_url) > 0, "PROOF_URL_REQUIRED")

        task.proof_url = clean_url
        task.proof_text = clean_text
        task.status = STATUS_SUBMITTED

    @gl.public.write
    def cancel_task(self, task_id: int) -> None:
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.creator == gl.message.sender_address, "ONLY_CREATOR")
        self._require(task.status == STATUS_OPEN or task.status == STATUS_CLAIMED, "TASK_CANNOT_BE_CANCELED")
        self._require(not task.finalized, "TASK_ALREADY_FINALIZED")

        refund = task.reward_amount
        self._send_value_to_eoa(task.creator, refund)
        task.status = STATUS_CANCELED
        task.canceled = True
        task.finalized = True
        task.creator_refund = refund
        task.worker_payout = u256(0)
        self.total_finalized = u256(int(self.total_finalized) + int(refund))


    def _normalize_evaluation_result(self, data: dict) -> dict:
        self._require(_is_valid_raw_evaluation(data), "INVALID_EVALUATION_RESULT")
        return {
            "decision": _to_upper_string(data.get("decision", "")),
            "score": _coerce_int(data.get("score", 0)),
            "payout_percent": _coerce_int(data.get("payout_percent", 0)),
            "confidence": _to_upper_string(data.get("confidence", CONFIDENCE_MEDIUM)),
            "reason": str(data.get("reason", "")).strip(),
            "required_revision": str(data.get("required_revision", "")).strip(),
            "reason_code": _to_upper_string(data.get("reason_code", REASON_OTHER)),
            "missing_requirements": json.dumps(data.get("missing_requirements", []))[:2000],
        }

    def _status_for_decision(self, decision: str) -> str:
        if decision == DECISION_APPROVE:
            return STATUS_APPROVED
        if decision == DECISION_REJECT:
            return STATUS_REJECTED
        if decision == DECISION_PARTIAL:
            return STATUS_PARTIAL
        if decision == DECISION_NEEDS_REVISION:
            return STATUS_NEEDS_REVISION
        raise gl.vm.UserError("UNKNOWN_DECISION")

    @gl.public.write
    def evaluate_task(self, task_id: int) -> None:
        """Evaluate a submitted task using a mocked LLM in Phase 2.

        Later phases will enrich this with real GitHub evidence fetching. For now,
        the task fields and submitted proof are passed directly to the LLM prompt.
        """
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.status == STATUS_SUBMITTED, "TASK_NOT_SUBMITTED")
        self._require(not task.evaluated, "TASK_ALREADY_EVALUATED")

        title = task.title
        description = task.description
        acceptance_criteria = task.acceptance_criteria
        source_type = task.source_type
        source_url = task.source_url
        evidence_type = task.evidence_type
        proof_url = task.proof_url
        proof_text = task.proof_text
        github_api_issue_url = ""
        github_api_pr_url = ""
        github_api_files_url = ""
        if source_type == SOURCE_GITHUB_ISSUE:
            try:
                parsed_issue = _parse_github_issue_url(source_url)
                github_api_issue_url = parsed_issue["api_issue_url"]
            except Exception:
                raise gl.vm.UserError("INVALID_GITHUB_ISSUE_URL")
        elif source_type == SOURCE_GITHUB_PR:
            try:
                parsed_source_pr = _parse_github_pr_url(source_url)
                github_api_issue_url = ""
            except Exception:
                raise gl.vm.UserError("INVALID_SOURCE_GITHUB_PR_URL")

        if evidence_type == EVIDENCE_GITHUB_PR:
            try:
                parsed = _parse_github_pr_url(proof_url)
                github_api_pr_url = parsed["api_pr_url"]
                github_api_files_url = parsed["api_files_url"]
            except Exception:
                raise gl.vm.UserError("INVALID_GITHUB_PR_URL")

        def leader_fn() -> dict:
            source_evidence = ""
            github_evidence = ""
            if len(github_api_issue_url) > 0:
                issue_response = gl.nondet.web.get(github_api_issue_url)
                if issue_response.status < 200 or issue_response.status >= 300 or issue_response.body is None:
                    raise gl.vm.UserError("GITHUB_ISSUE_FETCH_FAILED")
                issue_data = json.loads(issue_response.body.decode("utf-8"))
                source_evidence = json.dumps(
                    _compact_github_issue_evidence(issue_data),
                    sort_keys=True,
                )[:5000]

            if len(github_api_pr_url) > 0:
                pr_response = gl.nondet.web.get(github_api_pr_url)
                if pr_response.status < 200 or pr_response.status >= 300 or pr_response.body is None:
                    raise gl.vm.UserError("GITHUB_PR_FETCH_FAILED")
                files_response = gl.nondet.web.get(github_api_files_url)
                if files_response.status < 200 or files_response.status >= 300 or files_response.body is None:
                    raise gl.vm.UserError("GITHUB_FILES_FETCH_FAILED")
                pr_data = json.loads(pr_response.body.decode("utf-8"))
                files_data = json.loads(files_response.body.decode("utf-8"))
                github_evidence = json.dumps(
                    _compact_github_pr_evidence(pr_data, files_data),
                    sort_keys=True,
                )[:6000]

            prompt = _build_adjudication_prompt(
                title,
                description,
                acceptance_criteria,
                source_type,
                source_url,
                evidence_type,
                proof_url,
                proof_text,
                source_evidence,
                github_evidence,
            )
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError("LLM_RETURNED_NON_DICT")
            return result

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            return _is_valid_raw_evaluation(leaders_res.calldata)

        raw_result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = self._normalize_evaluation_result(raw_result)

        decision = result["decision"]
        task.evaluated = True
        task.decision = decision
        task.score = u32(result["score"])
        task.payout_percent = u32(result["payout_percent"])
        task.confidence = result["confidence"]
        task.reason = result["reason"]
        task.required_revision = result["required_revision"]
        task.reason_code = result["reason_code"]
        task.missing_requirements = result["missing_requirements"]
        task.status = self._status_for_decision(decision)


    @gl.public.write
    def resubmit_proof(self, task_id: int, proof_url: str, proof_text: str) -> None:
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.status == STATUS_NEEDS_REVISION, "TASK_NOT_IN_REVISION")
        self._require(task.assigned_worker == gl.message.sender_address, "ONLY_ASSIGNED_WORKER")
        self._require(int(task.revision_count) < int(task.max_revisions), "MAX_REVISIONS_REACHED")
        self._require(not task.finalized, "TASK_ALREADY_FINALIZED")

        clean_url = proof_url.strip()
        clean_text = proof_text.strip()
        self._require(len(clean_url) > 0 or len(clean_text) > 0, "PROOF_REQUIRED")
        self._require(len(clean_url) <= 1000, "PROOF_URL_TOO_LONG")
        self._require(len(clean_text) <= 5000, "PROOF_TEXT_TOO_LONG")
        if task.evidence_type == EVIDENCE_GITHUB_PR or task.evidence_type == EVIDENCE_GITHUB_ISSUE or task.evidence_type == EVIDENCE_URL_DOCUMENT:
            self._require(len(clean_url) > 0, "PROOF_URL_REQUIRED")

        task.proof_url = clean_url
        task.proof_text = clean_text
        task.evaluated = False
        task.decision = ""
        task.score = u32(0)
        task.payout_percent = u32(0)
        task.confidence = ""
        task.reason = ""
        task.required_revision = ""
        task.reason_code = ""
        task.missing_requirements = "[]"
        task.revision_count = u32(int(task.revision_count) + 1)
        task.status = STATUS_SUBMITTED


    def _send_value_to_eoa(self, recipient: Address, amount: u256) -> None:
        if amount > u256(0):
            _ExternalRecipient(recipient).emit_transfer(value=amount)

    @gl.public.write
    def finalize_task(self, task_id: int) -> None:
        """Finalize an evaluated task and emit payout/refund transfers.

        Phase 4 uses a hybrid model: AI evaluation stores a decision first;
        this separate method performs the money movement once the decision is known.
        """
        tid = u256(task_id)
        task = self._get_existing_task(tid)
        self._require(task.evaluated, "TASK_NOT_EVALUATED")
        self._require(not task.finalized, "TASK_ALREADY_FINALIZED")
        self._require(task.reward_amount > u256(0), "NO_REWARD_ESCROWED")
        self._require(task.assigned_worker != ZERO_ADDRESS, "NO_WORKER_ASSIGNED")
        self._require(task.decision != DECISION_NEEDS_REVISION, "REVISION_REQUIRED")

        amount = int(task.reward_amount)
        payout_percent = int(task.payout_percent)
        worker_payout_int = (amount * payout_percent) // 100
        creator_refund_int = amount - worker_payout_int

        worker_payout = u256(worker_payout_int)
        creator_refund = u256(creator_refund_int)

        self._send_value_to_eoa(task.assigned_worker, worker_payout)
        self._send_value_to_eoa(task.creator, creator_refund)

        task.worker_payout = worker_payout
        task.creator_refund = creator_refund
        task.finalized = True
        self.total_finalized = u256(int(self.total_finalized) + amount)

        if task.decision == DECISION_APPROVE:
            task.status = STATUS_PAID
        elif task.decision == DECISION_REJECT:
            task.status = STATUS_REFUNDED
        elif task.decision == DECISION_PARTIAL:
            task.status = STATUS_PARTIALLY_PAID
        else:
            raise gl.vm.UserError("UNFINALIZABLE_DECISION")

    @gl.public.view
    def get_task_count(self) -> u256:
        return u256(int(self.next_task_id) - 1)

    @gl.public.view
    def task_exists(self, task_id: int) -> bool:
        return self._task_exists(u256(task_id))

    @gl.public.view
    def get_escrow_summary(self) -> dict:
        return {
            "total_escrowed": self.total_escrowed,
            "total_finalized": self.total_finalized,
            "active_escrow": u256(int(self.total_escrowed) - int(self.total_finalized)),
            "contract_balance": self.balance,
        }

    @gl.public.view
    def get_task(self, task_id: int) -> dict:
        task = self._get_existing_task(u256(task_id))
        return {
            "task_id": task.task_id,
            "creator": str(task.creator),
            "assigned_worker": str(task.assigned_worker),
            "title": task.title,
            "description": task.description,
            "acceptance_criteria": task.acceptance_criteria,
            "source_type": task.source_type,
            "source_url": task.source_url,
            "evidence_type": task.evidence_type,
            "reward_amount": task.reward_amount,
            "deadline": task.deadline,
            "status": task.status,
            "proof_url": task.proof_url,
            "proof_text": task.proof_text,
            "canceled": task.canceled,
            "evaluated": task.evaluated,
            "decision": task.decision,
            "score": task.score,
            "payout_percent": task.payout_percent,
            "confidence": task.confidence,
            "reason": task.reason,
            "required_revision": task.required_revision,
            "reason_code": task.reason_code,
            "missing_requirements": task.missing_requirements,
            "revision_count": task.revision_count,
            "max_revisions": task.max_revisions,
            "finalized": task.finalized,
            "worker_payout": task.worker_payout,
            "creator_refund": task.creator_refund,
        }
