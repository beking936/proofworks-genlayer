import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const network = (process.env.NETWORK ?? "studionet").toLowerCase();
const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

if (!privateKey || !privateKey.startsWith("0x")) {
  throw new Error(
    "PRIVATE_KEY is required for scripted deploy. Use a disposable testnet-only key."
  );
}

const chain = network === "bradbury" || network === "testnet_bradbury"
  ? testnetBradbury
  : studionet;

const account = createAccount(privateKey);
const client = createClient({ chain, account });
const code = readFileSync("contracts/proofworks_escrow.py", "utf8");

console.log(`Deploying ProofWorksEscrow to ${network}...`);
console.log(`Deployer: ${account.address}`);

const txHash = await client.deployContract({
  code,
  args: [],
  leaderOnly: false,
});

console.log(`Deploy tx: ${txHash}`);
console.log("Waiting for ACCEPTED receipt...");

const receipt: any = await client.waitForTransactionReceipt({
  hash: txHash as any,
  status: TransactionStatus.ACCEPTED,
  retries: 80,
  interval: 5000,
});

console.log(JSON.stringify(receipt, null, 2));

const contractAddress =
  receipt?.data?.contract_address ??
  receipt?.data?.contractAddress ??
  receipt?.contract_address ??
  receipt?.contractAddress;

if (contractAddress) {
  console.log(`Contract address: ${contractAddress}`);
} else {
  console.log("Contract address not found in simplified receipt. Inspect receipt above.");
}
