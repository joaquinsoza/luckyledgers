/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

interface RoundInfo {
  round: number;
  state: "OPEN" | "DRAWING" | "COMPLETED";
  vrf_request_id: bigint | null;
}

/**
 * Get information about a specific raffle round
 */
export async function getRoundInfo(roundNumber: number): Promise<RoundInfo> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Getting info for round ${roundNumber}...`);

  const args: xdr.ScVal[] = [nativeToScVal(roundNumber, { type: "u32" })];

  const result = await simulateReadOnly<xdr.ScVal>(
    raffleContract,
    "get_round_info",
    ...args,
  );

  const parsed = scValToNative(result);

  // Stellar SDK returns enum variants as arrays, extract the string value
  const roundInfo: RoundInfo = {
    round: parsed.round,
    state: Array.isArray(parsed.state) ? parsed.state[0] : parsed.state,
    vrf_request_id: parsed.vrf_request_id,
  };

  console.log(`✓ Round Info:`, roundInfo);

  return roundInfo;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const round = parseInt(process.argv[2] || "1");

  getRoundInfo(round)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
