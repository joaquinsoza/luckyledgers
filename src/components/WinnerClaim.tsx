/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { Button, Card, Text } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { Box } from "./layout/Box";
import {
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  sendTransaction,
  simulateReadOnly,
  waitForTransaction,
} from "../contracts/stellar";
import { RAFFLE_CONTRACT } from "../contracts/raffle";

interface WinnerRecord {
  winner: string;
  round: number;
  amount: bigint;
  claimed: boolean;
}

export const WinnerClaim = () => {
  const [unclaimedPrizes, setUnclaimedPrizes] = useState<WinnerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [claimingRound, setClaimingRound] = useState<number | null>(null);
  const { address } = useWallet();

  useEffect(() => {
    const fetchUnclaimedPrizes = async () => {
      if (!address) return;

      try {
        const infoResultRaw: xdr.ScVal = await simulateReadOnly(
          RAFFLE_CONTRACT,
          "get_unclaimed_prizes",
          ...[new Address(address).toScVal()],
        );
        const infoResult = scValToNative(infoResultRaw);
        console.log("🚀 | fetchUnclaimedPrizes | infoResult:", infoResult);

        if (infoResult) {
          const prizes: {
            winner: string;
            round: number;
            amount: bigint;
            claimed: boolean;
          }[] = infoResult;
          setUnclaimedPrizes(
            prizes.map((p) => ({
              winner: p.winner,
              round: Number(p.round),
              amount: BigInt(p.amount),
              claimed: p.claimed,
            })),
          );
        }

        return 0;
      } catch (err) {
        console.error("Failed to fetch unclaimed prizes:", err);
      }
    };

    void fetchUnclaimedPrizes();
    const interval = setInterval(() => void fetchUnclaimedPrizes(), 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [address]);

  if (!address) {
    return null;
  }

  if (unclaimedPrizes.length === 0) {
    return null;
  }

  const claimPrize = async (round: number) => {
    if (!address) return;

    setIsLoading(true);
    setClaimingRound(round);

    try {
      const claimPrizeHash: string = await sendTransaction(
        RAFFLE_CONTRACT,
        "claim_prize",
        address,
        ...[
          new Address(address).toScVal(),
          nativeToScVal(round, { type: "u32" }),
        ],
      );

      await waitForTransaction(claimPrizeHash);

      alert(`Successfully claimed`);
      // Remove claimed prize from list
      setUnclaimedPrizes((prev) => prev.filter((p) => p.round !== round));
    } catch (err) {
      console.error("Error claiming prize:", err);
      alert("Transaction failed. Please try again.");
    } finally {
      setIsLoading(false);
      setClaimingRound(null);
    }
  };

  return (
    <Card>
      <Box gap="md">
        <Text as="h2" size="lg">
          🎉 Congratulations! You Won!
        </Text>
        <Text as="p" size="md">
          You have {unclaimedPrizes.length} unclaimed prize
          {unclaimedPrizes.length > 1 ? "s" : ""}:
        </Text>

        {unclaimedPrizes.map((prize) => {
          const amountXLM = Number(prize.amount) / 10000000;
          const isClaiming = claimingRound === prize.round;

          return (
            <div
              key={prize.round}
              style={{ backgroundColor: "#f0f8ff", borderRadius: "8px" }}
            >
              <Card>
                <Box gap="sm">
                  <Text as="p" size="md">
                    <strong>Round #{prize.round}</strong>
                  </Text>
                  <Text as="p" size="md">
                    Prize: <strong>{amountXLM.toFixed(1)} XLM</strong>
                  </Text>
                  <Button
                    onClick={() => void claimPrize(prize.round)}
                    disabled={isLoading}
                    variant="primary"
                    size="md"
                  >
                    {isClaiming ? "Claiming..." : "Claim Prize"}
                  </Button>
                </Box>
              </Card>
            </div>
          );
        })}
      </Box>
    </Card>
  );
};
