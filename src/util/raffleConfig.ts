export const RAFFLE_CONFIG = {
  TICKET_PRICE: 10_0_000_000n, // 1000 XLM per ticket
  TARGET_TICKETS: 250, // Total tickets needed to trigger draw
  MAX_TICKETS_PER_PARTICIPANT: 10, // Max tickets per wallet
} as const;
