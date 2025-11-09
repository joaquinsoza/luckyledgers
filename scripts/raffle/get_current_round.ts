import { Contract, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

/**
 * Get statistics for a specific raffle round
 */
export async function getCurrentRound(): Promise<number> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Getting current Round...`);

  const result = await simulateReadOnly<xdr.ScVal>(
    raffleContract,
    "get_current_round_number",
    ...[],
  );

  const currentRound = scValToNative(result) as number;

  console.log(`Current Round: ${currentRound}`);

  return currentRound;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getCurrentRound()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
