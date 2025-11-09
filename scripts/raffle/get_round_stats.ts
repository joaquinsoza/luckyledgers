import {
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

interface RoundStats {
  total_tickets: number;
  total_participants: number;
  prize_pool: bigint;
}

/**
 * Get statistics for a specific raffle round
 */
export async function getRoundStats(roundNumber: number): Promise<RoundStats> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Getting stats for round ${roundNumber}...`);

  const args: xdr.ScVal[] = [nativeToScVal(roundNumber, { type: "u32" })];

  const result = await simulateReadOnly<xdr.ScVal>(
    raffleContract,
    "get_round_stats",
    ...args,
  );

  const stats = scValToNative(result) as RoundStats;

  console.log(`✓ Round Stats:`);
  console.log(`  Total Tickets: ${stats.total_tickets}`);
  console.log(`  Total Participants: ${stats.total_participants}`);
  console.log(`  Prize Pool: ${stats.prize_pool}`);

  return stats;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const round = parseInt(process.argv[2] || "1");

  getRoundStats(round)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
