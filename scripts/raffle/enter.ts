import { Contract, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import {
  createAndFundAccount,
  sendTransaction,
  waitForTransaction,
} from "../utils/stellar.js";

/**
 * Enter the raffle by buying tickets
 */
export async function enterRaffle(
  numTickets: number,
  userKeypair?: Keypair,
): Promise<void> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  // Create and fund user account if not provided
  const user = userKeypair || (await createAndFundAccount());

  console.log(`Entering raffle...`);
  console.log(`  User: ${user.publicKey()}`);
  console.log(`  Tickets: ${numTickets}`);

  const args: xdr.ScVal[] = [
    nativeToScVal(user.publicKey(), { type: "address" }),
    nativeToScVal(numTickets, { type: "u32" }),
  ];

  const txHash = await sendTransaction(raffleContract, "enter", user, ...args);

  await waitForTransaction(txHash);

  console.log(`✓ Successfully entered raffle with ${numTickets} ticket(s)`);
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const numTickets = parseInt(process.argv[2] || "1");

  enterRaffle(numTickets)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
