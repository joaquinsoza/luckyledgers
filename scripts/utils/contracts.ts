/**
 * Contract addresses and network configuration
 */

export const NETWORK_CONFIG = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
} as const;

export const CONTRACTS = {
  VRF: "CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO",
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  RAFFLE: "CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW",
} as const;

export const RAFFLE_CONFIG = {
  TICKET_PRICE: 10_0_000_000n, // 10 XLM per ticket
  TARGET_TICKETS: 250, // Total tickets needed to trigger draw
  MAX_TICKETS_PER_PARTICIPANT: 10, // Max tickets per wallet
} as const;
