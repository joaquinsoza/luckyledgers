import {
  BASE_FEE,
  Contract,
  Keypair,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { NETWORK_CONFIG } from "./contracts.js";

const server = new rpc.Server(NETWORK_CONFIG.rpcUrl);

/**
 * Create a new random keypair and fund it with testnet XLM
 */
export async function createAndFundAccount(): Promise<Keypair> {
  const keypair = Keypair.random();
  console.log(`Created account: ${keypair.publicKey()}`);
  console.log(`Secret: ${keypair.secret()}`);

  try {
    await server.requestAirdrop(keypair.publicKey());
    console.log(`✓ Funded account with testnet XLM`);
  } catch (error) {
    console.error(`Failed to fund account:`, error);
    throw error;
  }

  return keypair;
}

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

    txResponse = await server.getTransaction(hash);
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
  const sourceAccount = await server.getAccount(
    "GALAXYVOIDAOPZTDLHILAJQKCVVFMD4IKLXLSZV5YHO7VY74IWZILUTO",
  );

  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResponse = await server.simulateTransaction(tx);

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
  signer: Keypair,
  ...args: xdr.ScVal[]
): Promise<string> {
  const sourceAccount = await server.getAccount(signer.publicKey());

  const operation = contract.call(method, ...args);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_CONFIG.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate first
  const simResponse = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResponse)}`);
  }

  // Assemble, sign, and send
  const assembled = rpc.assembleTransaction(tx, simResponse).build();
  assembled.sign(signer);

  const result = await server.sendTransaction(assembled);
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
 * Get the server instance for advanced operations
 */
export function getServer(): rpc.Server {
  return server;
}
