/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { Card, Text } from "@stellar/design-system";
import { Box } from "./layout/Box";
import { RAFFLE_CONFIG } from "../util/raffleConfig";
import { simulateReadOnly } from "../contracts/stellar";
import { RAFFLE_CONTRACT } from "../contracts/raffle";
import { nativeToScVal, scValToNative, xdr } from "@stellar/stellar-sdk";

interface RoundInfo {
  round: number;
  state: string;
  vrf_request_id: bigint | null;
}

interface RoundStats {
  total_tickets: number;
  total_participants: number;
  prize_pool: bigint;
}

export const RaffleStats = () => {
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [stats, setStats] = useState<RoundStats | null>(null);
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
        if (roundNumber) {
          setCurrentRound(roundNumber);

          // Get round info
          const infoResultRaw: xdr.ScVal = await simulateReadOnly(
            RAFFLE_CONTRACT,
            "get_round_info",
            ...[nativeToScVal(roundNumber, { type: "u32" })],
          );
          const infoResult = scValToNative(infoResultRaw);

          console.log("🚀 | fetchData | infoResult:", infoResult);
          if (infoResult) {
            const info: {
              round: number;
              state: string;
              vrf_request_id: bigint;
            } = infoResult;
            setRoundInfo({
              round: Number(info.round),
              state: info.state,
              vrf_request_id: info.vrf_request_id || null,
            });
          }

          // Get round stats
          const roundStatsRaw: xdr.ScVal = await simulateReadOnly(
            RAFFLE_CONTRACT,
            "get_round_stats",
            ...[nativeToScVal(roundNumber, { type: "u32" })],
          );
          const roundStats = scValToNative(roundStatsRaw);
          console.log("🚀 | fetchData | roundStats:", roundStats);

          if (roundStats) {
            const s: {
              total_tickets: number;
              total_participants: number;
              prize_pool: bigint;
            } = roundStats;
            setStats({
              total_tickets: Number(s.total_tickets),
              total_participants: Number(s.total_participants),
              prize_pool: BigInt(s.prize_pool),
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
    return (
      <Card>
        <Text as="p" size="md">
          Loading raffle data...
        </Text>
      </Card>
    );
  }

  const progress = stats
    ? (stats.total_tickets / RAFFLE_CONFIG.TARGET_TICKETS) * 100
    : 0;
  const prizePoolXLM = stats ? Number(stats.prize_pool) / 10000000 : 0;

  const getStateDisplay = (state: string) => {
    switch (state) {
      case "OPEN":
        return "🟢 Open";
      case "DRAWING":
        return "🔵 Drawing...";
      case "COMPLETED":
        return "✅ Completed";
    }
  };

  return (
    <Card>
      <Box gap="md">
        <Text as="h2" size="lg">
          Round #{currentRound} Status
        </Text>

        {roundInfo && (
          <Box gap="sm">
            <Text as="p" size="md">
              State: <strong>{getStateDisplay(roundInfo.state)}</strong>
            </Text>
          </Box>
        )}

        {stats && (
          <Box gap="sm">
            <Text as="p" size="md">
              Tickets Sold:{" "}
              <strong>
                {stats.total_tickets} / {RAFFLE_CONFIG.TARGET_TICKETS}
              </strong>
            </Text>

            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "24px",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  height: "100%",
                  backgroundColor: progress >= 100 ? "#4caf50" : "#2196f3",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <Text as="p" size="sm">
              {progress.toFixed(1)}% complete
            </Text>

            <Text as="p" size="md">
              Participants: <strong>{stats.total_participants}</strong>
            </Text>

            <Text as="p" size="md">
              Prize Pool: <strong>{prizePoolXLM.toFixed(1)} XLM</strong>
            </Text>

            {progress >= 100 && roundInfo?.state === "OPEN" && (
              <Text
                as="p"
                size="md"
                style={{ color: "green", fontWeight: "bold" }}
              >
                ✨ Ready to draw! Anyone can trigger the draw now.
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Card>
  );
};
