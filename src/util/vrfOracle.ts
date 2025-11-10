/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Address,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  sendTransactionWithKeyPair,
  simulateReadOnly,
  waitForTransaction,
} from "../contracts/stellar";
import { VRF_CONTRACT } from "../contracts/vrf";
import { RAFFLE_CONTRACT, RAFFLE_CONTRACT_ADDRESS } from "../contracts/raffle";
import { defaultWallet } from "../contracts/util";

/**
 * Auto-fulfill VRF for testing/demo purposes
 * In production, this would be handled by a backend oracle service
 */
export const autoFulfillVRF = async (): Promise<void> => {
  try {
    // Step 1: Get random number from VRF contract
    console.log("Getting random number from VRF...");
    const randomResultRaw: xdr.ScVal = await simulateReadOnly(
      VRF_CONTRACT,
      "get_random",
      ...[],
    );
    const randomResult: number = scValToNative(randomResultRaw);
    console.log("🚀 | randomResult | randomResult:", randomResult);

    if (!randomResult) {
      throw new Error(`Failed to get random number`);
    }

    const randomValue = BigInt(randomResult);
    console.log("Random value:", randomValue);

    // Step 2: Fulfill the VRF callback on the raffle contract
    console.log("Fulfilling VRF on raffle contract...");

    const publicKeypair: Keypair = Keypair.fromSecret(defaultWallet);
    const fulfillTxHash: string = await sendTransactionWithKeyPair(
      VRF_CONTRACT,
      "fulfill",
      publicKeypair,
      ...[
        new Address(RAFFLE_CONTRACT_ADDRESS).toScVal(),
        nativeToScVal(randomValue, { type: "u64" }),
      ],
    );

    await waitForTransaction(fulfillTxHash);

    console.log("VRF fulfilled successfully!");
  } catch (error) {
    console.error("Error in auto-fulfill VRF:", error);
    throw error;
  }
};

/**
 * Wait for round state to change from DRAWING to COMPLETED
 * Polls every 2 seconds for up to 30 seconds
 */
export const waitForDrawCompletion = async (
  round: number,
): Promise<boolean> => {
  const maxAttempts = 15;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const infoResultRaw: xdr.ScVal = await simulateReadOnly(
        RAFFLE_CONTRACT,
        "get_round_info",
        ...[nativeToScVal(round, { type: "u32" })],
      );
      const infoResult = scValToNative(infoResultRaw);

      if (infoResult) {
        const info: { state: string } = infoResult;
        if (info.state === "COMPLETED") {
          return true;
        }
      }
    } catch (err) {
      console.error("Error checking round state:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  return false;
};
