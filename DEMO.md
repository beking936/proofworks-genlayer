# ProofWorks demo walkthrough

Live demo: **https://proofworks-genlayer.vercel.app**

This is the shortest path from "open the site" to "see GenLayer pay a bounty out."

## 1. Open the site

Go to https://proofworks-genlayer.vercel.app. The top bar shows the active Studionet contract and the current escrow summary. The docket lists existing tasks. You do not need a wallet for any of this.

## 2. Use a burner or connect a wallet

In the wallet panel, click **Use free burners** to switch between Creator, Worker, and Juror roles without funding anything. Or click **Connect wallet** if you have MetaMask and want to use a real Studionet address.

## 3. Create a task as Creator

Open the **Create escrow case** form, fill in title, description, acceptance criteria, evidence type, and reward, then click **Seal new case**. The transaction wire waits for ACCEPTED and the docket refreshes with your new task in `OPEN` status.

## 4. Submit proof as Worker

Switch to the Worker burner, select the task, paste a proof URL or text, and click **Submit evidence**. The task moves to `SUBMITTED`.

## 5. Run the AI jury

Click **Run AI jury**. GenLayer validators fetch the GitHub evidence, run their LLMs, and converge on a structured verdict. The verdict panel shows decision, score, payout percent, confidence, and reason.

## 6. Finalize payout

Click **Finalize payout**. The UI waits for FINALIZED (not just ACCEPTED) because the external transfer only executes after finalization. The task status becomes `PAID`, `REFUNDED`, or `PARTIALLY_PAID` depending on the verdict.

That is the entire loop. The same flow works for GitHub PR evidence: paste a real PR URL in step 4 and the contract will fetch and adjudicate it during step 5.
