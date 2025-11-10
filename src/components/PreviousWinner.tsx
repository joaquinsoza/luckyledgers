/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { Card, Text } from "@stellar/design-system";
import { Box } from "./layout/Box";
import { simulateReadOnly } from "../contracts/stellar";
import { RAFFLE_CONTRACT } from "../contracts/raffle";
import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

interface WinnerInfo {
  amount: bigint;
  claimed: boolean;
  round: number;
  winner: string;
}

export const PreviousWinner = () => {
  const [previousWinner, setPreviousWinner] = useState<WinnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current round number
        const roundResultRaw: xdr.ScVal = await simulateReadOnly(
          RAFFLE_CONTRACT,
          "get_current_round_number",
          ...[],
        );
        const roundNumber: number = scValToNative(roundResultRaw);
        console.log("🚀 | fetchData | roundResult:", roundNumber);

        // Only fetch previous winner if we're past round 1
        if (roundNumber && roundNumber > 1) {
          const previousWinnerRaw: xdr.ScVal = await simulateReadOnly(
            RAFFLE_CONTRACT,
            "get_winner",
            ...[nativeToScVal(roundNumber - 1, { type: "u32" })],
          );

          const previousWinner: WinnerInfo = scValToNative(previousWinnerRaw);

          console.log("🚀 | fetchData | previousWinner:", previousWinner);
          if (previousWinner) {
            setPreviousWinner({
              winner: previousWinner.winner,
              round: Number(previousWinner.round),
              amount: BigInt(previousWinner.amount),
              claimed: previousWinner.claimed,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch raffle data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
    const interval = setInterval(() => void fetchData(), 10000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return null;
  }

  if (!previousWinner) {
    return null;
  }

  const amountXLM = Number(previousWinner.amount) / 10000000;

  return (
    <div style={{ backgroundColor: "#fff3cd", borderRadius: "8px" }}>
      <Card>
        <Box gap="md">
          <Text as="h2" size="lg">
            🏆 Previous Round Winner
          </Text>
          <Box gap="sm">
            <Text as="p" size="md">
              <strong>Round #{previousWinner.round}</strong>
            </Text>
            <Text as="p" size="md">
              Winner:{" "}
              <strong>
                {previousWinner.winner.slice(0, 8)}...
                {previousWinner.winner.slice(-8)}
              </strong>
            </Text>
            <Text as="p" size="md">
              Prize Won: <strong>{amountXLM.toFixed(1)} XLM</strong>
            </Text>
            <Text
              as="p"
              size="sm"
              style={{ color: previousWinner.claimed ? "#28a745" : "#6c757d" }}
            >
              {previousWinner.claimed
                ? "✓ Prize claimed"
                : "⏳ Prize not yet claimed"}
            </Text>
          </Box>
        </Box>
      </Card>
    </div>
  );
};
