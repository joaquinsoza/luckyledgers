import {
  Contract,
  Keypair,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { rpcUrl } from "./util";
import { wallet } from "../util/wallet";

export const sorobanServer = new rpc.Server(rpcUrl);

/**
 * Wait for a transaction to be confirmed on the network
 */
export async function waitForTransaction(
  hash: string,
): Promise<rpc.Api.GetTransactionResponse> {
  let status: string = "PENDING";
  let txResponse: rpc.Api.GetTransactionResponse;

  while (status === "PENDING" || status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Waiting for tx confirmation...");

    txResponse = await sorobanServer.getTransaction(hash);
    status = txResponse.status;

    if (status === "SUCCESS") {
      console.log("✓ Transaction successful");
      return txResponse;
    }

    if (status === "FAILED") {
      console.error("✗ Transaction failed");
      throw new Error(`Transaction failed: ${hash}`);
    }
  }

  throw new Error("Transaction timeout");
}

/**
 * Simulate a read-only contract call and return the parsed result
 */
export async function simulateReadOnly<T>(
  contract: Contract,
  method: string,
  ...args: xdr.ScVal[]
): Promise<T> {
  const sourceAccount = await sorobanServer.getAccount(
    "GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO",
  );

  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "2000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResponse = await sorobanServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResponse)}`);
  }

  // Parse and return the result
  const result = simResponse.result?.retval;
  if (!result) {
    throw new Error("No result returned from simulation");
  }

  return result as T;
}

/**
 * Send a write transaction to the network
 */
export async function sendTransaction(
  contract: Contract,
  method: string,
  signer: string,
  ...args: xdr.ScVal[]
): Promise<string> {
  const sourceAccount = await sorobanServer.getAccount(signer);

  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "2000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate first
  const simResponse = await sorobanServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResponse)}`);
  }

  // Assemble, sign, and send
  const assembled = rpc.assembleTransaction(tx, simResponse).build();
  const signedXdr = await wallet.signTransaction(assembled.toXDR());

  const signedTx = TransactionBuilder.fromXDR(
    signedXdr.signedTxXdr,
    Networks.TESTNET,
  );

  const result = await sorobanServer.sendTransaction(signedTx);
  console.log(result.status);

  if (result.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(result, null, 2)}`,
    );
  }

  console.log(`✓ Transaction submitted: ${result.hash}`);
  return result.hash;
}

export async function sendTransactionWithKeyPair(
  contract: Contract,
  method: string,
  keypair: Keypair,
  ...args: xdr.ScVal[]
): Promise<string> {
  const sourceAccount = await sorobanServer.getAccount(keypair.publicKey());

  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "2000",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate first
  const simResponse = await sorobanServer.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResponse)}`);
  }

  // Assemble, sign, and send
  const assembled = rpc.assembleTransaction(tx, simResponse).build();

  assembled.sign(keypair);

  const result = await sorobanServer.sendTransaction(assembled);
  console.log(result.status);

  if (result.status === "ERROR") {
    throw new Error(
      `Transaction submission failed: ${JSON.stringify(result, null, 2)}`,
    );
  }

  console.log(`✓ Transaction submitted: ${result.hash}`);
  return result.hash;
}

/**
 * Get the sorobanServer instance for advanced operations
 */
export function getServer(): rpc.Server {
  return sorobanServer;
}
