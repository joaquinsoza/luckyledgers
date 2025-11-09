import { Contract, Keypair, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import {
  createAndFundAccount,
  sendTransaction,
  waitForTransaction,
} from "../utils/stellar.js";

/**
 * Fulfill a VRF request by calling back to the requester contract
 * This simulates what the oracle would do in production
 */
export async function fulfillVRF(
  requesterAddress: string,
  randomValue: bigint,
  oracleSigner?: Keypair,
): Promise<void> {
  const vrfContract = new Contract(CONTRACTS.VRF);

  // Create and fund oracle account if not provided
  const oracle = oracleSigner || (await createAndFundAccount());

  console.log(`Fulfilling VRF request...`);
  console.log(`  Requester: ${requesterAddress}`);
  console.log(`  Random Value: ${randomValue}`);

  const args: xdr.ScVal[] = [
    nativeToScVal(requesterAddress, { type: "address" }),
    nativeToScVal(randomValue, { type: "u64" }),
  ];

  const txHash = await sendTransaction(vrfContract, "fulfill", oracle, ...args);

  await waitForTransaction(txHash);

  console.log(`✓ VRF fulfilled successfully`);
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const requester = process.argv[2] || CONTRACTS.RAFFLE;
  const randomValue = BigInt(
    process.argv[3] || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
  );

  fulfillVRF(requester, randomValue)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
