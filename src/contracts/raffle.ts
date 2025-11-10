import { Contract } from "@stellar/stellar-sdk";

export const RAFFLE_CONTRACT_ADDRESS: string =
  "CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW";
export const RAFFLE_CONTRACT: Contract = new Contract(RAFFLE_CONTRACT_ADDRESS);

export class RaffleContract {}
