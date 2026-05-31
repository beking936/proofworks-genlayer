import { createClient } from "genlayer-js";
import { simulator } from "genlayer-js/chains";
import fs from "fs";

// Read the keystore from the CLI
const keystore = JSON.parse(fs.readFileSync("/home/user/.genlayer/keystores/default.json", "utf-8"));

// Actually, let's use a simpler random account for genlayer-js to sign.
import { createAccount } from "genlayer-js";
const account = createAccount();

const client = createClient({
    chain: simulator,
    endpoint: "https://studio.genlayer.com/api", // guess or localnet? 
});

async function main() {
    console.log("Account:", account.address);
    // Well, wait. It might be easier to use the python test suite since the python test suite already covers 89 cases.
}
main();
