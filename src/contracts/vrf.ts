import { Contract } from "@stellar/stellar-sdk";

export const VRF_CONTRACT_ADDRESS: string =
  "CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO";
export const VRF_CONTRACT: Contract = new Contract(VRF_CONTRACT_ADDRESS);

export class VRFContract {}
