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
  RAFFLE: "CA7OH2ZXHVGATCY2VS3QFLA2FRLYB3WY33DZYCDCN6FWMJUBUWFR2APA",
} as const;

export const RAFFLE_CONFIG = {
  TICKET_PRICE: 1_000_000_000n, // 100 XLM
  TARGET_PARTICIPANTS: 25,
} as const;
