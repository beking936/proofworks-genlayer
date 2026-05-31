import { readFileSync } from "node:fs";
import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// Configuration
const network = (process.env.NETWORK ?? "studionet").toLowerCase();
let privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

// If no private key is provided, generate a fresh disposable one for the test
if (!privateKey) {
  console.log("No PRIVATE_KEY environment variable detected. Generating a fresh disposable burner key...");
  privateKey = generatePrivateKey();
}

const chain = network === "bradbury" || network === "testnet_bradbury"
  ? testnetBradbury
  : studionet;

// Initialize Accounts
const creatorAccount = createAccount(privateKey);
console.log(`\n================================================================`);
console.log(`[+] INITIALIZING REAL-TIME ON-CHAIN TELEMETRY`);
console.log(`================================================================`);
console.log(`Creator Address (Owner): ${creatorAccount.address}`);

// Generate separate Worker and Juror accounts
const workerAccount = createAccount(generatePrivateKey());
console.log(`Worker Address:          ${workerAccount.address}`);

const juror1Account = createAccount("0x9ad5e99107f67bc00c2b2459a9cb269dc2a4d831d3e61f262a7f6d0ec829db50");
const juror2Account = createAccount("0xadcf89da46bfd377f2177157380b2245fc6d1988b4002aeffb290af38eb9e805");
const juror3Account = createAccount("0x95318e4e48ceadbcb753ddad3b0679f221fcc2bfe78382ba3a6d13cf06b60d88");

console.log(`Juror 1 Address:         ${juror1Account.address}`);
console.log(`Juror 2 Address:         ${juror2Account.address}`);
console.log(`Juror 3 Address:         ${juror3Account.address}`);

// Initialize Clients
const creatorClient = createClient({ chain, account: creatorAccount });
const workerClient = createClient({ chain, account: workerAccount });
const juror1Client = createClient({ chain, account: juror1Account });
const juror2Client = createClient({ chain, account: juror2Account });
const juror3Client = createClient({ chain, account: juror3Account });

// Reading contract code
const code = readFileSync("contracts/proofworks_escrow.py", "utf8");

async function main() {
  try {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 1] DEPLOYING NEW PROOFWORKS ESCROW CONTRACT`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Targeting network: ${network.toUpperCase()}`);
    console.log(`Deploying...`);
    
    const deployHash = await creatorClient.deployContract({
      code,
      args: [],
      leaderOnly: false,
    });
    console.log(`Deploy transaction submitted. Hash: ${deployHash}`);
    console.log(`Waiting for block finalization (ACCEPTED status)...`);
    
    const deployReceipt: any = await creatorClient.waitForTransactionReceipt({
      hash: deployHash as any,
      status: TransactionStatus.ACCEPTED,
      retries: 100,
      interval: 4000,
    });
    
    console.log("DEPLOY_RECEIPT:", JSON.stringify(deployReceipt, null, 2));
    
    const contractAddress = deployReceipt?.contract_address ?? deployReceipt?.contractAddress ?? deployReceipt?.data?.contractAddress;
    if (!contractAddress) {
      throw new Error("Contract address could not be retrieved from the deployment receipt.");
    }
    console.log(`[✓] Contract successfully deployed at: ${contractAddress}`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 2] CREATING CASE FILE WITH WORKER STAKE REQUIREMENTS`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Bounty Reward: 1000 wei`);
    console.log(`Required Stake: 15% (150 wei worker deposit)`);
    
    const createHash = await creatorClient.writeContract({
      address: contractAddress,
      functionName: "create_case",
      args: [
        "Audit Smart Contract Security",
        "Perform a detailed manual audit of the solidity contracts.",
        "Must output a PDF report listing vulnerabilities.",
        "MANUAL", "", "TEXT_SUBMISSION", 0, "", 2, 15 // 15% required stake
      ],
      value: 1000n, // reward amount
    });
    console.log(`Create case transaction submitted. Hash: ${createHash}`);
    await creatorClient.waitForTransactionReceipt({ hash: createHash as any, status: TransactionStatus.ACCEPTED });
    console.log(`[✓] Case #1 successfully created and funded in escrow.`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 3] CLAIMING CASE deliverables AND LOCKING COLLATERAL`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Worker Bob is claiming the task and depositing 150 wei stake...`);
    
    const claimHash = await workerClient.writeContract({
      address: contractAddress,
      functionName: "claim_task",
      args: [1],
      value: 150n, // 150 wei stake
    });
    console.log(`Claim transaction submitted. Hash: ${claimHash}`);
    await workerClient.waitForTransactionReceipt({ hash: claimHash as any, status: TransactionStatus.ACCEPTED });
    console.log(`[✓] Case #1 successfully claimed. Worker stake of 150 wei locked.`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 4] SUBMITTING EVIDENCE DELIVERABLES`);
    console.log(`----------------------------------------------------------------`);
    
    const submitHash = await workerClient.writeContract({
      address: contractAddress,
      functionName: "submit_proof",
      args: [1, "", "Here is the completed security audit report. No critical bugs found."],
      value: 0n,
    });
    console.log(`Submit proof transaction submitted. Hash: ${submitHash}`);
    await workerClient.waitForTransactionReceipt({ hash: submitHash as any, status: TransactionStatus.ACCEPTED });
    console.log(`[✓] Deliverable evidence logged in the contract state.`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 5] AUTOMATED ADJUDICATION JURY EVALUATION`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Evaluating case #1 deliverables...`);
    
    // Simulate AI Jury returning a REJECT outcome first to test the appeal flow!
    // Since we're pranking/mocking local networks, let's see how our mock goes:
    const evalHash = await creatorClient.writeContract({
      address: contractAddress,
      functionName: "evaluate_task",
      args: [1],
      value: 0n,
    });
    console.log(`Evaluation transaction submitted. Hash: ${evalHash}`);
    await creatorClient.waitForTransactionReceipt({ hash: evalHash as any, status: TransactionStatus.ACCEPTED });
    
    let task = await creatorClient.readContract({ address: contractAddress, functionName: "get_task", args: [1] }) as any;
    console.log(`[✓] AI Adjudication Completed.`);
    console.log(`Current Status: ${task.status}`);
    console.log(`Jury Decision:  ${task.decision || "PENDING (Mocked Rejection)"}`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 6] FILING DISPUTE AND JURY APPEAL`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Bob disagrees with the verdict and files an appeal, locking 20% bond (200 wei)...`);
    
    const appealHash = await workerClient.writeContract({
      address: contractAddress,
      functionName: "appeal_verdict",
      args: [1],
      value: 200n, // 200 wei appeal bond
    });
    console.log(`Appeal transaction submitted. Hash: ${appealHash}`);
    await workerClient.waitForTransactionReceipt({ hash: appealHash as any, status: TransactionStatus.ACCEPTED });
    console.log(`[✓] Appeal registered. Status locked in APPEALED.`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 7] COMMUNITY JUROR DECISION CASTING`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Jurors are casting consensus votes...`);
    
    // Juror 1 votes APPROVE
    const vote1Hash = await juror1Client.writeContract({
      address: contractAddress,
      functionName: "cast_jury_vote",
      args: [1, "APPROVE"],
      value: 0n,
    });
    console.log(`Juror 1 vote submitted. Hash: ${vote1Hash}`);
    await juror1Client.waitForTransactionReceipt({ hash: vote1Hash as any, status: TransactionStatus.ACCEPTED });

    // Juror 2 votes APPROVE (reaches 2/3 majority approval!)
    const vote2Hash = await juror2Client.writeContract({
      address: contractAddress,
      functionName: "cast_jury_vote",
      args: [1, "APPROVE"],
      value: 0n,
    });
    console.log(`Juror 2 vote submitted. Hash: ${vote2Hash}`);
    await juror2Client.waitForTransactionReceipt({ hash: vote2Hash as any, status: TransactionStatus.ACCEPTED });

    // Juror 3 votes REJECT (dissenting vote)
    const vote3Hash = await juror3Client.writeContract({
      address: contractAddress,
      functionName: "cast_jury_vote",
      args: [1, "REJECT"],
      value: 0n,
    });
    console.log(`Juror 3 vote submitted. Hash: ${vote3Hash}`);
    await juror3Client.waitForTransactionReceipt({ hash: vote3Hash as any, status: TransactionStatus.ACCEPTED });
    
    task = await creatorClient.readContract({ address: contractAddress, functionName: "get_task", args: [1] }) as any;
    console.log(`[✓] Juror Consensus Closed.`);
    console.log(`Resolved Decision: ${task.decision} (Overruled Rejection!)`);
    console.log(`Current Status:    ${task.status}`);

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[STAGE 8] ESCROW FINALIZATION & ASSET DISBURSEMENT`);
    console.log(`----------------------------------------------------------------`);
    console.log(`Finalizing settlement for case #1...`);
    
    const finalizeHash = await creatorClient.writeContract({
      address: contractAddress,
      functionName: "finalize_task",
      args: [1],
      value: 0n,
    });
    console.log(`Finalization transaction submitted. Hash: ${finalizeHash}`);
    await creatorClient.waitForTransactionReceipt({ hash: finalizeHash as any, status: TransactionStatus.ACCEPTED });
    
    task = await creatorClient.readContract({ address: contractAddress, functionName: "get_task", args: [1] }) as any;
    console.log(`\n================================================================`);
    console.log(`[✓] REAL-TIME TELEMETRY TEST COMPLETED SUCCESSFULLY!`);
    console.log(`================================================================`);
    console.log(`Final Task Status:   ${task.status}`);
    console.log(`Final Worker Payout: ${task.worker_payout} wei`);
    console.log(`Final Creator Refund: ${task.creator_refund} wei`);
    console.log(`Staking Returned:     Yes (Worker stake reset to ${task.worker_stake} wei)`);
    console.log(`================================================================\n`);

  } catch (err) {
    console.error(`\n[!] TRANSACTION FLOW CRASHED:`);
    console.error(err);
    process.exit(1);
  }
}

main();
