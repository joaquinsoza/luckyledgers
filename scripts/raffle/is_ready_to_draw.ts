import { Contract, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

/**
 * Check if the current raffle round is ready to draw
 */
export async function isReadyToDraw(): Promise<boolean> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Checking if raffle is ready to draw...`);

  const result = await simulateReadOnly<xdr.ScVal>(
    raffleContract,
    "is_ready_to_draw",
  );

  const ready = scValToNative(result) as boolean;

  console.log(`✓ Ready to draw: ${ready}`);

  return ready;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  isReadyToDraw()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
