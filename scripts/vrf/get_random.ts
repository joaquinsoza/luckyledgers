import { Contract, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

/**
 * Get a random number from the VRF contract (read-only simulation)
 */
export async function getRandomNumber(): Promise<bigint> {
  const vrfContract = new Contract(CONTRACTS.VRF);

  console.log("Getting random number from VRF...");

  const result = await simulateReadOnly<xdr.ScVal>(vrfContract, "get_random");

  const randomValue = scValToNative(result) as bigint;

  console.log(`✓ Random number: ${randomValue}`);

  return randomValue;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getRandomNumber()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
