import {
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import { sendTransaction, waitForTransaction } from "../utils/stellar.js";

/**
 * Claim prize for a specific round
 */
export async function claimPrize(
  roundNumber: number,
  winnerKeypair: Keypair,
): Promise<bigint> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  console.log(`Claiming prize...`);
  console.log(`  Winner: ${winnerKeypair.publicKey()}`);
  console.log(`  Round: ${roundNumber}`);

  const args: xdr.ScVal[] = [
    nativeToScVal(winnerKeypair.publicKey(), { type: "address" }),
    nativeToScVal(roundNumber, { type: "u32" }),
  ];

  const txHash = await sendTransaction(
    raffleContract,
    "claim_prize",
    winnerKeypair,
    ...args,
  );

  const txResponse = await waitForTransaction(txHash);

  // Extract the prize amount from the return value
  let prizeAmount: bigint = 0n;
  if ("returnValue" in txResponse && txResponse.returnValue) {
    prizeAmount = scValToNative(txResponse.returnValue) as bigint;
  }

  console.log(`✓ Prize claimed successfully`);
  console.log(`  Amount: ${prizeAmount}`);

  return prizeAmount;
}

// If running directly (requires winner keypair secret key as argument)
if (import.meta.url === `file://${process.argv[1]}`) {
  const round = parseInt(process.argv[2] || "1");
  const secretKey = process.argv[3];

  if (!secretKey) {
    console.error(
      "Usage: npx tsx scripts/raffle/claim_prize.ts <round> <winner_secret_key>",
    );
    process.exit(1);
  }

  const winner = Keypair.fromSecret(secretKey);

  claimPrize(round, winner)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
