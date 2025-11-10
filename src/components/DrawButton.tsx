/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { Button, Card, Text } from "@stellar/design-system";
import { Box } from "./layout/Box";
import { autoFulfillVRF, waitForDrawCompletion } from "../util/vrfOracle";
import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";
import {
  sendTransaction,
  simulateReadOnly,
  waitForTransaction,
} from "../contracts/stellar";
import { RAFFLE_CONTRACT } from "../contracts/raffle";
import { useWallet } from "../hooks/useWallet";

interface WinnerRecord {
  winner: string;
  round: number;
  amount: bigint;
  claimed: boolean;
}

export const DrawButton = () => {
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [winner, setWinner] = useState<WinnerRecord | null>(null);
  const [drawStep, setDrawStep] = useState<string>("");
  const { address } = useWallet();

  useEffect(() => {
    const checkReadiness = async () => {
      try {
        // Get current round
        const roundResultRaw: xdr.ScVal = await simulateReadOnly(
          RAFFLE_CONTRACT,
          "get_current_round_number",
          ...[],
        );
        const roundNumber: number = scValToNative(roundResultRaw);
        console.log("🚀 | fetchData | roundResult:", roundNumber);

        if (roundNumber) {
          const round = Number(roundNumber);
          setCurrentRound(round);

          // Check if ready to draw
          const readyResultRaw: xdr.ScVal = await simulateReadOnly(
            RAFFLE_CONTRACT,
            "is_ready_to_draw",
            ...[],
          );
          const readyResult: boolean = scValToNative(readyResultRaw);
          console.log("🚀 | checkReadiness | readyResult:", readyResult);

          if (readyResult) {
            setIsReady(readyResult);
          }

          // Check if already drawing or completed
          const infoResultRaw: xdr.ScVal = await simulateReadOnly(
            RAFFLE_CONTRACT,
            "get_round_info",
            ...[nativeToScVal(roundNumber, { type: "u32" })],
          );
          const infoResult = scValToNative(infoResultRaw);

          if (infoResult) {
            const info: {
              state: string;
            } = infoResult;
            if (info.state === "DRAWING") {
              setIsDrawing(true);
              setDrawStep("Drawing in progress...");
            } else if (info.state === "COMPLETED") {
              // Fetch winner
              const getWinnerRaw: xdr.ScVal = await simulateReadOnly(
                RAFFLE_CONTRACT,
                "get_winner",
                ...[nativeToScVal(roundNumber, { type: "u32" })],
              );
              const winnerResult = scValToNative(getWinnerRaw);

              if (winnerResult) {
                const w: {
                  winner: string;
                  round: number;
                  amount: bigint;
                  claimed: boolean;
                } = winnerResult;
                if (w) {
                  setWinner({
                    winner: w.winner,
                    round: Number(w.round),
                    amount: BigInt(w.amount),
                    claimed: w.claimed,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to check readiness:", err);
      }
    };

    void checkReadiness();
    const interval = setInterval(() => void checkReadiness(), 8000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const triggerDraw = async () => {
    setIsDrawing(true);
    setWinner(null);

    try {
      // Step 1: Request draw from raffle contract
      setDrawStep("Requesting draw...");
      const requestDrawTxHash: string = await sendTransaction(
        RAFFLE_CONTRACT,
        "request_draw",
        address!,
        ...[],
      );
      await waitForTransaction(requestDrawTxHash);

      // Step 2: Auto-fulfill VRF (simulates oracle)
      setDrawStep("Fulfilling VRF (simulating oracle)...");
      await autoFulfillVRF();

      // Step 3: Wait for draw completion
      setDrawStep("Waiting for winner selection...");
      const completed = await waitForDrawCompletion(currentRound);

      if (!completed) {
        alert("Draw took too long. Please refresh the page.");
        setIsDrawing(false);
        return;
      }

      // Step 4: Fetch winner
      setDrawStep("Fetching winner...");
      const getWinnerRaw: xdr.ScVal = await simulateReadOnly(
        RAFFLE_CONTRACT,
        "get_winner",
        ...[nativeToScVal(currentRound, { type: "u32" })],
      );
      const winnerResult = scValToNative(getWinnerRaw);

      if (winnerResult) {
        const w: {
          winner: string;
          round: number;
          amount: bigint;
          claimed: boolean;
        } = winnerResult;
        if (w) {
          setWinner({
            winner: w.winner,
            round: Number(w.round),
            amount: BigInt(w.amount),
            claimed: w.claimed,
          });
          setDrawStep("Draw complete!");
        }
      }
    } catch (err) {
      console.error("Error during draw:", err);
      alert("Draw failed. Please try again.");
    } finally {
      setIsDrawing(false);
    }
  };

  if (winner) {
    const amountXLM = Number(winner.amount) / 10000000;
    return (
      <div style={{ backgroundColor: "#fff3cd", borderRadius: "8px" }}>
        <Card>
          <Box gap="md">
            <Text as="h2" size="lg">
              🎊 Winner Selected!
            </Text>
            <Text as="p" size="md">
              <strong>Round #{winner.round}</strong>
            </Text>
            <Text as="p" size="md">
              Winner: <strong>{winner.winner}</strong>
            </Text>
            <Text as="p" size="md">
              Prize: <strong>{amountXLM.toFixed(1)} XLM</strong>
            </Text>
            <Text as="p" size="sm">
              {winner.claimed ? "✓ Prize claimed" : "Prize not yet claimed"}
            </Text>
          </Box>
        </Card>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <div style={{ backgroundColor: "#d4edda", borderRadius: "8px" }}>
      <Card>
        <Box gap="md">
          <Text as="h2" size="lg">
            ✨ Ready to Draw!
          </Text>
          <Text as="p" size="md">
            The raffle has reached the target ticket count. Anyone can trigger
            the draw now.
          </Text>

          {isDrawing && (
            <Text as="p" size="md" style={{ color: "#0066cc" }}>
              {drawStep}
            </Text>
          )}

          <Button
            onClick={() => void triggerDraw()}
            disabled={isDrawing}
            variant="primary"
            size="md"
          >
            {isDrawing ? "Drawing..." : "Trigger Draw"}
          </Button>

          <Text as="p" size="sm">
            Note: This will automatically fulfill the VRF for testing purposes.
          </Text>
        </Box>
      </Card>
    </div>
  );
};
