/**
 * Simple VRF test flow
 */

import { getRandomNumber } from "./get_random.js";
import { fulfillVRF } from "./fulfill.js";
import { CONTRACTS } from "../utils/contracts.js";

async function main() {
  console.log("========================================");
  console.log("VRF Test Flow");
  console.log("========================================\n");

  // Step 1: Get a random number
  console.log("Step 1: Getting random number...\n");

  const randomValue = await getRandomNumber();

  console.log(`\n`);

  // Step 2: Fulfill to raffle contract
  console.log("Step 2: Fulfilling VRF to raffle contract...\n");

  await fulfillVRF(CONTRACTS.RAFFLE, randomValue);

  console.log("\n========================================");
  console.log("✓ VRF Test Complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Error:", err);
    process.exit(1);
  });
