import { Contract, Keypair, scValToNative } from "@stellar/stellar-sdk";
import { CONTRACTS } from "../utils/contracts.js";
import {
  createAndFundAccount,
  sendTransaction,
  waitForTransaction,
} from "../utils/stellar.js";

/**
 * Request a draw for the current raffle round
 * This can be called by anyone once the target participants is met
 */
export async function requestDraw(callerKeypair?: Keypair): Promise<bigint> {
  const raffleContract = new Contract(CONTRACTS.RAFFLE);

  // Create and fund caller account if not provided
  const caller = callerKeypair || (await createAndFundAccount());

  console.log(`Requesting draw...`);
  console.log(`  Caller: ${caller.publicKey()}`);

  const txHash = await sendTransaction(raffleContract, "request_draw", caller);

  const txResponse = await waitForTransaction(txHash);

  // Extract the VRF request ID from the return value
  let requestId: bigint = 0n;
  if ("returnValue" in txResponse && txResponse.returnValue) {
    requestId = scValToNative(txResponse.returnValue) as bigint;
  }

  console.log(`✓ Draw requested successfully`);
  console.log(`  VRF Request ID: ${requestId}`);

  return requestId;
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  requestDraw()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
