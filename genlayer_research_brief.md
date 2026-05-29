# GenLayer Research Brief (for future dApp coding)

Date researched: 2026-05-29

Primary sources:
- https://docs.genlayer.com/full-documentation.txt
- https://docs.genlayer.com/api-references/genlayer-js
- https://docs.genlayer.com/api-references/genlayer-js/contracts
- https://docs.genlayer.com/developers/networks

## 1. What GenLayer is

GenLayer is an AI-native blockchain / L2 intended for “trustless adjudication”: contracts that need judgment over language, web data, images, or other non-deterministic evidence. Its smart contracts are called **Intelligent Contracts** and are written in Python for GenVM.

Core idea: Ethereum-style smart contracts require deterministic execution; GenLayer adds a consensus process where validators can independently fetch web data, call LLMs, compare outputs, and agree on whether results are equivalent.

Good fits:
- Prediction/resolution markets
- Dispute or milestone workflows
- DAO policy/rule verification
- Escrow release based on evidence
- Reputation updates or claim adjudication

Weak fits:
- Generic chatbot / recommender / summarizer with no consensus-critical state change
- Anything with private evidence validators cannot inspect
- Unbounded subjective text outputs without structured fields
- Frontend computes answer and GenLayer merely stores it

## 2. Architecture

GenLayer has two layers:

1. **GenVM layer**
   - Executes Python Intelligent Contracts.
   - Supports deterministic storage logic and non-deterministic operations.
   - Provides web access, LLM access, image processing, vector storage, messaging, value transfer abstractions.

2. **GenLayer Chain / EVM layer**
   - Underlying L2 is zkSync Elastic Chain.
   - Standard Ethereum-compatible calls (`eth_*`, `zks_*`) pass through the GenLayer RPC.
   - Intelligent Contracts have corresponding **ghost contracts** at the same address on the chain layer.

Ghost contracts:
- Hold IC GEN balances.
- Relay transactions to consensus via `addTransaction()`.
- Execute external messages via `handleOp()`.
- Same address as the Intelligent Contract.
- In Studio, ghost contracts are simulated/not fully implemented.

## 3. Consensus: Optimistic Democracy

Transaction flow:
1. User submits transaction.
2. A leader validator executes and proposes a result.
3. Validators independently recompute/verify.
4. Commit/reveal process determines majority agreement.
5. If accepted, transaction enters appeal window.
6. After appeal window, it becomes finalized.

Statuses include:
- `PENDING`
- `CANCELED`
- `PROPOSING`
- `COMMITTING`
- `REVEALING`
- `ACCEPTED`
- `FINALIZED`
- `UNDETERMINED`

For frontend UX:
- `ACCEPTED` is faster but still appealable.
- `FINALIZED` is safer and should be used for irreversible downstream actions.

## 4. Intelligent Contract basics

Minimal shape:

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class MyContract(gl.Contract):
    value: str

    def __init__(self, initial: str):
        self.value = initial

    @gl.public.view
    def get_value(self) -> str:
        return self.value

    @gl.public.write
    def set_value(self, new_value: str) -> None:
        self.value = new_value
```

Requirements:
- Magic dependency/version comment must be first line.
- Import `from genlayer import *`.
- Exactly one contract class extending `gl.Contract` per file.
- Public read methods use `@gl.public.view`.
- Public write methods use `@gl.public.write`.
- Payable write methods use `@gl.public.write.payable`.
- Constructor `__init__` is not decorated.
- Persistent fields must be declared in class body with types.
- Creating new instance variables only in methods is not persistent.

## 5. Storage and types

Persistent storage restrictions:
- Use `DynArray[T]` instead of `list[T]`.
- Use `TreeMap[K, V]` instead of `dict[K, V]`.
- Use sized integers like `u32`, `u64`, `u256`, `i64`, etc. instead of `int` for storage fields.
- Use `bigint` only if arbitrary precision is needed.
- Generic types must be fully specified.
- Custom persisted classes need `@allow_storage` and `@dataclass`.

Examples:

```python
class Store(gl.Contract):
    balances: TreeMap[Address, u256]
    names: DynArray[str]

    def __init__(self):
        pass
```

Default storage values:
- Integers: `0`
- `bool`: `False`
- `str`: `""`
- `bytes`: `b""`
- `Address`: zero address
- `DynArray`: empty
- `TreeMap`: empty

Storage classes:

```python
from dataclasses import dataclass

@allow_storage
@dataclass
class UserData:
    score: u32
    username: str
```

Important: Direct tests can enable `direct_vm.check_pickling = True` to catch serialization/storage issues early.

## 6. Addresses and transaction context

`Address` represents a 20-byte Ethereum-like address.

Create via:
```python
addr = Address("0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6")
```

Useful properties:
- `addr.as_hex`
- `addr.as_bytes`
- `addr.as_b64`
- `str(addr)`

`gl.message` typed fields:
- `sender_address`: immediate caller
- `origin_address`: original transaction submitter
- `contract_address`: current contract address
- `value`: GEN value sent, only in payable methods
- `chain_id`: current chain id

`gl.message_raw` includes extras:
- `datetime` ISO string
- `is_init`
- `stack`
- `entry_kind`
- `entry_data`

Time:
- `datetime.now()` and `time.time()` are deterministic and pinned to transaction datetime.
- They are not host wall-clock time.

## 7. Non-determinism rules

All `gl.nondet.*` calls must be inside a non-deterministic block such as `leader_fn` or a function passed to `strict_eq`.

Inside nondet blocks:
- Web calls are allowed.
- LLM calls are allowed.
- Read/compute local values.

Must stay outside nondet blocks:
- Storage writes
- Contract calls
- Message emission
- Nested nondet blocks

Pattern:

```python
@gl.public.write
def update_price(self, pair: str):
    def leader_fn():
        response = gl.nondet.web.get(api_url)
        return parse_price(response)

    def validator_fn(leaders_res) -> bool:
        if not isinstance(leaders_res, gl.vm.Return):
            return False
        my_price = leader_fn()
        return abs(leaders_res.calldata - my_price) / leaders_res.calldata <= 0.02

    price = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
    self.prices[pair] = price
```

## 8. Equivalence Principle

GenLayer offers ways to decide whether non-deterministic outputs are acceptable.

### Strict equality
Use when all validators can produce the exact same normalized value.

```python
def fetch_data():
    response = gl.nondet.web.request("https://api.example.com/data")
    return normalized_result

result = gl.eq_principle.strict_eq(fetch_data)
```

Good for:
- Stable API fields
- Boolean checks after deterministic parsing
- Sorted JSON strings

Bad for:
- LLM outputs
- Randomness
- Mutable sources with rapidly changing data

### Prompt comparative
Leader and validators do the same task; LLM judges whether outputs are equivalent by criteria.

```python
result = gl.eq_principle.prompt_comparative(
    comparative_example,
    "Results should not differ by more than 5%"
)
```

### Prompt non-comparative
Leader produces result; validators check result against criteria without repeating full task.

```python
result = gl.eq_principle.prompt_non_comparative(
    input="This product is amazing!",
    task="Classify the sentiment as positive, negative, or neutral",
    criteria="Output must be one of: positive, negative, neutral"
)
```

### Custom validator functions
Recommended for many production contracts because it gives explicit control.

```python
def leader_fn():
    response = gl.nondet.exec_prompt(prompt, response_format="json")
    return response

def validator_fn(leader_result) -> bool:
    if not isinstance(leader_result, gl.vm.Return):
        return False
    data = leader_result.calldata
    return isinstance(data, dict) and data.get("status") in ("yes", "no")

result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

## 9. Web access

HTTP request:
```python
def post_request():
    response = gl.nondet.web.request(
        "https://test-server.genlayer.com/body/echo",
        method="POST",
        body={}
    )
    return response.status_code

status_code = gl.eq_principle.strict_eq(post_request)
```

Render page:
```python
def render_page():
    return gl.nondet.web.render(url, mode="html")

html = gl.eq_principle.strict_eq(render_page)
```

Screenshot:
```python
def take_screenshot():
    return gl.nondet.web.render(url, mode="screenshot")

image_data = gl.eq_principle.strict_eq(take_screenshot)
```

Consensus-friendly web design:
- Extract stable fields only.
- Avoid timestamps, counters, online statuses unless comparing derived states.
- Handle HTTP 4xx vs 5xx explicitly.
- Prefer trusted, stable sources.
- Normalize output (`json.dumps(..., sort_keys=True)` style) for strict equality.

## 10. LLM calls

Basic:
```python
def leader_fn():
    return gl.nondet.exec_prompt("Answer this question").strip().lower()
```

For JSON:
```python
def structured_llm_call():
    return gl.nondet.exec_prompt(prompt, response_format="json")
```

Important:
- Do not use `strict_eq` for LLM calls; outputs vary.
- Use `response_format="json"` but still validate the structure.
- Validator should reject malformed output to trigger leader rotation instead of committing bad state.
- For images, pass `images=[image_data]`; docs mention image limit of 2.

Image example:
```python
result = gl.nondet.exec_prompt(
    "Does this receipt show payment of 10 GEN? Respond JSON.",
    images=[image_data],
    response_format="json",
)
```

## 11. Error handling

Use:
```python
raise gl.vm.UserError("Invalid input")
```

For immediate uncaught user error:
```python
gl.advanced.user_error_immediate("Insufficient funds")
```

VM result types:
- `gl.vm.Return`
- `gl.vm.VMError`
- `gl.vm.UserError`
- `gl.vm.InternalError`

Pattern in validators:
- If leader errors, decide whether the same error is deterministic or should be rejected.
- Business logic errors may be agreed upon if identical.
- Transient network/LLM errors should usually cause disagreement/retry.

## 12. Value transfers

Native token is GEN, denominated in wei. Use `u256` for amounts.

Receive GEN:
```python
class TipJar(gl.Contract):
    total_tips: u256

    def __init__(self):
        self.total_tips = u256(0)

    @gl.public.write.payable
    def tip(self) -> None:
        v = gl.message.value
        if v == u256(0):
            raise gl.vm.UserError("send some value")
        self.total_tips = self.total_tips + v
```

Send to another IC:
```python
other = gl.get_contract_at(recipient_address)
other.emit_transfer(value=u256(amount), on="finalized")
other.emit(value=u256(amount), on="finalized").deposit()
```

Send to EOA/EVM contract via external message:
```python
@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass

_Recipient(Address(recipient)).emit_transfer(value=v)
```

Caveat:
- Value is deducted from sender immediately when message is emitted and credited when child tx activates.
- If child tx fails, value is not automatically returned.

Special payable methods:
- `__receive__`: handles value-only transfer with no method name.
- `__handle_undefined_method__`: fallback for undefined calls.

## 13. Contract interactions and messages

View call to another IC is synchronous:
```python
other = gl.get_contract_at(addr)
result = other.view().get_token_balance()
```

Write call is asynchronous via message:
```python
other.emit(on="finalized").update_status("active")
```

Typed IC interface:
```python
@gl.contract_interface
class Token:
    class View:
        def balance_of(self, owner: Address) -> u256: ...
    class Write:
        def transfer(self, to: Address, amount: u256) -> None: ...

Token(token_address).emit(on="finalized").transfer(to, amount)
```

`on="accepted"` is faster but risky:
- Message may be emitted again on appeal/reexecution.
- Message may become invalid if appeal changes outcome.
- Receiver must be idempotent.

Use `on="finalized"` as safe default.

External EVM messages:
- Only on finalized.
- `@gl.evm.contract_interface` for ABI-like typed calls.
- In Studio, EVM contract interaction beyond value transfers may not be functional.

Deploy child contracts:
```python
gl.deploy_contract(code=contract_code, args=[], salt_nonce=u256(1), on="finalized")
```

## 14. Upgradability

GenVM has native upgradability through `gl.storage.Root`:
- `code`
- `locked_slots`
- `upgraders`

To make upgradable:
1. Add authorized upgraders in `__init__`.
2. Expose method that replaces code.

```python
root = gl.storage.Root.get()
root.upgraders.get().append(gl.message.sender_address)
```

Upgrade method:
```python
@gl.public.write
def upgrade(self, new_code: bytes) -> None:
    root = gl.storage.Root.get()
    code = root.code.get()
    code.truncate()
    code.extend(new_code)
```

Caveats:
- Storage layout must remain compatible.
- Upgraders persist.
- Can freeze by having locked slots and no upgraders.

## 15. Vector storage

GenLayer has `VecDB` for vector embeddings and semantic search.

Typical pattern:
```python
@allow_storage
@dataclass
class StoreValue:
    log_id: u256
    text: str

class LogIndexer(gl.Contract):
    vector_store: VecDB[np.float32, typing.Literal[384], StoreValue]
```

Use cases:
- Semantic search
- Text indexing
- Recommendations
- Context-aware apps

May need additional dependency for model wrappers.

## 16. Tooling and workflow

Recommended project boilerplate:
- `contracts/`
- `tests/direct/`
- `tests/integration/`
- `frontend/`
- `deploy/`
- `gltest.config.yaml`

Install Python tooling:
```bash
pip install -r requirements.txt
```

Key tools:
- `genlayer-test`: tests, direct mode, GLSim, integration tests.
- `genvm-linter`: static/semantic contract validation.

Lint:
```bash
genvm-lint check contracts/my_contract.py
```

Catches:
- Forbidden imports (`os`, `sys`, `subprocess`, etc.)
- `gl.nondet` outside nondet blocks
- invalid storage types
- missing decorators / annotations

Direct tests:
```bash
pytest tests/direct/ -v
```

Mock web/LLM in direct mode:
```python
direct_vm.mock_web(r".*api\.example\.com/prices.*", {"status": 200, "body": '{"price": 42.5}'})
direct_vm.mock_llm(r".*Extract.*", json.dumps({"score": "2:1", "winner": 1}))
```

Integration tests:
```bash
gltest tests/integration/ -v -s
```

GLSim:
```bash
pip install genlayer-test[sim]
glsim --port 4000 --validators 5
```

Local Studio:
```bash
npm install -g genlayer
genlayer init
genlayer up
```

Studio UI: http://localhost:8080/
RPC: http://localhost:4000/api

## 17. Networks

Bradbury:
- Purpose: production-like testing with real AI/LLM workloads
- GenLayer RPC: `https://rpc-bradbury.genlayer.com`
- Chain ID: 4221
- Currency: GEN
- Faucet: https://testnet-faucet.genlayer.foundation

Asimov:
- Purpose: infrastructure/stress testing
- GenLayer RPC: `https://rpc-asimov.genlayer.com`
- Chain ID: 4221
- Currency: GEN
- Faucet: https://testnet-faucet.genlayer.foundation

Studionet:
- Purpose: hosted dev
- RPC: `https://studio.genlayer.com/api`
- Chain ID: 61999
- Faucet: built-in Studio faucet

Localnet:
- Purpose: local dev
- RPC: `http://localhost:4000/api`
- Chain ID: 61127
- Explorer bundled at `http://localhost:8080`

Recommended flow:
1. Start Studionet or Localnet.
2. Use Localnet/GLSim for fast iteration.
3. Deploy to Bradbury when ready for realistic AI validation.

## 18. GenLayerJS for frontend dApps

Install:
```bash
npm install genlayer-js
```

Read client:
```ts
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const readClient = createClient({ chain: testnetBradbury });

const result = await readClient.readContract({
  address: contractAddress,
  functionName: "get_storage",
  args: [],
});
```

Write client with wallet:
```ts
const writeClient = createClient({
  chain: testnetBradbury,
  account: address as `0x${string}`,
  provider: window.ethereum,
});
```

Switch/add wallet network:
```ts
await writeClient.connect("testnetBradbury");
```

Write contract:
```ts
import { TransactionStatus } from "genlayer-js/types";

const txHash = await writeClient.writeContract({
  address: contractAddress,
  functionName: "update_storage",
  args: ["new value"],
  value: BigInt(0),
});

const receipt = await readClient.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED, // or FINALIZED
});
```

Always check execution result:
```ts
import { ExecutionResult } from "genlayer-js/types";

if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN) {
  // success
} else if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
  // execution failed; state not modified
}
```

Deploy contract:
```ts
const txHash = await client.deployContract({
  code: contractCode,
  args: [],
  leaderOnly: false,
});
```

Get schema:
```ts
const schema = await client.getContractSchema({ address });
const schemaForCode = await client.getContractSchemaForCode({ contractCode });
```

Debug:
```ts
const trace = await client.debugTraceTransaction({ hash: txHash, round: 0 });
console.log(trace.result_code, trace.return_data, trace.stderr, trace.genvm_log);
```

## 19. Frontend UX implications

For a dApp:
- Use separate read and write clients.
- Reads do not require wallet.
- Writes require wallet/provider/account.
- Show transaction lifecycle states (`PENDING`, `PROPOSING`, etc.) if possible.
- Let users choose/wait for `ACCEPTED` for speed or `FINALIZED` for safety.
- Always inspect execution result, not just consensus finalization.
- After write success, re-read contract state.
- For methods involving LLM/web calls, expect longer latency.
- Provide clear error messaging for user rejection, insufficient funds, timeout, consensus undetermined, and contract user errors.

## 20. Contract design checklist before coding a GenLayer dApp

1. What exact consensus-critical decision does GenLayer make?
2. What contract state changes based on that decision?
3. What public evidence can validators independently inspect?
4. Which fields must match exactly?
5. Which fields can be semantically equivalent or within tolerance?
6. Should we wait for `ACCEPTED` or `FINALIZED` before acting?
7. Can downstream messages tolerate duplicates if `on="accepted"` is used?
8. Are web/API fields stable enough for strict equality?
9. Are LLM outputs structured and validated?
10. Are all side effects outside nondet blocks?
11. Are storage types GenVM-safe (`TreeMap`, `DynArray`, sized ints)?
12. Do tests cover happy path, malformed LLM output, unavailable web source, ambiguous evidence, and malicious/invalid user input?

## 21. Coding conventions I should follow later

- Prefer explicit, structured outputs from LLMs: JSON with bounded enums.
- Use `run_nondet_unsafe` with custom validators for production logic.
- Use `strict_eq` only for normalized deterministic outputs from nondet sources.
- Normalize web/API data aggressively.
- Avoid open-ended natural language as final state; store structured decisions plus optional reason.
- Store sender addresses as `Address`, not `str`, when used for authorization/balances.
- Raise `gl.vm.UserError` for user-facing business errors.
- Use `u256` for token values.
- Default cross-contract messages to `on="finalized"`.
- Make receiving contracts idempotent if using `on="accepted"`.
- Lint before testing.
- Write direct tests with mocks first, then consensus/integration tests.
- For frontend, always wait for receipt and check `txExecutionResultName`.
