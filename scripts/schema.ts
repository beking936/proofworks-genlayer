import { readFileSync } from "node:fs";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({ chain: studionet });
const code = readFileSync("contracts/proofworks_escrow.py", "utf8");
const schema = await client.getContractSchemaForCode(code);
console.log(JSON.stringify(schema, null, 2));
