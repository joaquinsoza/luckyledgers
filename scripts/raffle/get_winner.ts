import {
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { simulateReadOnly } from "../utils/stellar.js";

interface RoundWinner {
  amount: string;
  claimed: boolean;
  round: number;
  winner: string;
}

export async function getRoundWinner(round: number): Promise<RoundWinner> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Getting Round ${round} winner...`);

  const result = await simulateReadOnly<xdr.ScVal>(
    raffleContract,
    "get_winner",
    ...[nativeToScVal(round, { type: "u32" })],
  );

  const roundWinner = scValToNative(result) as RoundWinner;

  console.log(
    `Round Winner: ${JSON.stringify(roundWinner, bigintReplacer, 2)}`,
  );

  return roundWinner;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const round = process.argv[2];

  getRoundWinner(Number(round))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Define a replacer function for BigInt serialization in JSON
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bigintReplacer(key: string, value: any) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return typeof value === "bigint" ? value.toString() : value;
}
