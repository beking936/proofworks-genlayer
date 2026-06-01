// Regression test for: TypeError: create_case() takes 10 positional arguments but 11 were given
//
// Reproduces the exact failure that happened when the Phase 9 frontend (10 args incl.
// required_stake_percent) called the old Phase 7 contract (9 args). Then runs the same
// exact call against the new Phase 9 contract address to confirm the fix.

import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const OLD_PHASE7 = "0x5E992bBc2De02C3878d2623A7C3bEc9603aB651A";
const NEW_PHASE9 = "0x541031b4574cDE16c93c2b580Bc1Da763a3efbc7";
const RPC = "https://studio.genlayer.com/api";

async function fundAccount(addr: string) {
  const body = { jsonrpc: "2.0", method: "sim_fundAccount", params: [addr, 2_000_000_000_000_000_000], id: 1 };
  await fetch(RPC, { method: "POST", headers: {"content-type":"application/json"}, body: JSON.stringify(body) });
}

async function tryCreateCase(addr: string, label: string) {
  const pk = generatePrivateKey();
  const acc = createAccount(pk);
  await fundAccount(acc.address);
  const client = createClient({ chain: studionet, account: acc });
  console.log(`\n--- ${label} (${addr}) ---`);
  try {
    const hash = await client.writeContract({
      address: addr as `0x${string}`,
      functionName: "create_case",
      args: [
        "regression test",
        "verify that the 10-arg Phase 9 frontend call works",
        "n/a",
        "MANUAL",
        "",
        "TEXT_SUBMISSION",
        0,
        "",
        2,
        0,  // <-- the 10th arg that broke against Phase 7
      ],
      value: 100n,
    });
    console.log("  tx:", hash);
    const r: any = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 80, interval: 3000 });
    const stderr = r?.consensus_data?.leader_receipt?.[0]?.genvm_result?.stderr ?? "";
    const ok = r?.status_name === "ACCEPTED" && !stderr.includes("TypeError");
    if (ok) {
      console.log(`  ✅ ACCEPTED, no TypeError`);
    } else {
      console.log(`  ❌ FAILED: status=${r?.status_name} stderr=${stderr.slice(0, 200)}`);
    }
    return ok;
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("TypeError") && msg.includes("positional arguments")) {
      console.log(`  ❌ FAILED with the expected bug:`, msg.slice(0, 300));
    } else {
      console.log(`  ❌ FAILED (other):`, msg.slice(0, 300));
    }
    return false;
  }
}

async function main() {
  console.log("Regression: create_case 10-arg call");
  console.log("====================================");
  const oldOk = await tryCreateCase(OLD_PHASE7, "OLD Phase 7 contract (should FAIL)");
  const newOk = await tryCreateCase(NEW_PHASE9, "NEW Phase 9 contract (should PASS)");
  console.log("\n=== Summary ===");
  console.log("  old phase 7 :", oldOk ? "unexpectedly OK" : "failed as expected");
  console.log("  new phase 9 :", newOk ? "OK ✅"            : "STILL BROKEN ❌");
  if (!newOk) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
