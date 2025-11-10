/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState, useEffect } from "react";
import { Button, Input, Text, Card } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import { Box } from "./layout/Box";
import { RAFFLE_CONFIG } from "../util/raffleConfig";
import {
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  sendTransaction,
  simulateReadOnly,
  waitForTransaction,
} from "../contracts/stellar";
import { RAFFLE_CONTRACT, RAFFLE_CONTRACT_ADDRESS } from "../contracts/raffle";

export const RaffleEntry = () => {
  const [numTickets, setNumTickets] = useState<number>(1);
  const [userTickets, setUserTickets] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const { address } = useWallet();

  // Fetch user's current ticket count
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!address) return;
      try {
        const roundResultRaw: xdr.ScVal = await simulateReadOnly(
          RAFFLE_CONTRACT,
          "get_current_round_number",
          ...[],
        );
        const roundNumber: number = scValToNative(roundResultRaw);
        console.log("🚀 | roundResult | roundResult:", roundNumber);

        const userTicketsRaw: xdr.ScVal = await simulateReadOnly(
          RAFFLE_CONTRACT,
          "get_user_tickets",
          ...[
            nativeToScVal(roundNumber, { type: "u32" }),
            new Address(address).toScVal(),
          ],
        );
        const userTickets: number = scValToNative(userTicketsRaw);
        console.log("🚀 | userTickets | userTickets:", userTickets);

        if (userTickets) {
          setUserTickets(Number(userTickets));
        }
      } catch (err) {
        console.error("Failed to fetch user tickets:", err);
      }
    };

    void fetchUserTickets();
    const interval = setInterval(() => void fetchUserTickets(), 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [address]);

  if (!address) {
    return (
      <Card>
        <Box gap="md">
          <Text as="h2" size="lg">
            Buy Raffle Tickets
          </Text>
          <Text as="p" size="md">
            Connect your wallet to buy tickets
          </Text>
        </Box>
      </Card>
    );
  }

  const remainingAllowance =
    RAFFLE_CONFIG.MAX_TICKETS_PER_PARTICIPANT - userTickets;
  const maxPurchase = Math.min(numTickets, remainingAllowance);

  const buyTickets = async () => {
    if (!address || maxPurchase <= 0) return;

    setIsLoading(true);
    setError(undefined);
    setSuccess(false);

    try {
      const raffleContract = new Contract(RAFFLE_CONTRACT_ADDRESS);
      const enterParams: xdr.ScVal[] = [
        new Address(address).toScVal(),
        nativeToScVal(numTickets, { type: "u32" }),
      ];

      const txHash = await sendTransaction(
        raffleContract,
        "enter",
        address,
        ...enterParams,
      );

      await waitForTransaction(txHash);
    } catch (err) {
      console.error("Error buying tickets:", err);
      setError("Transaction failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const ticketPriceXLM = Number(RAFFLE_CONFIG.TICKET_PRICE) / 10000000;
  const totalCost = ticketPriceXLM * numTickets;

  return (
    <Card>
      <Box gap="md">
        <Text as="h2" size="lg">
          Buy Raffle Tickets
        </Text>

        <Box gap="sm">
          <Text as="p" size="sm">
            Your tickets: <strong>{userTickets}</strong> /{" "}
            {RAFFLE_CONFIG.MAX_TICKETS_PER_PARTICIPANT}
          </Text>
          <Text as="p" size="sm">
            Remaining allowance: <strong>{remainingAllowance}</strong>
          </Text>
          <Text as="p" size="sm">
            Price per ticket: <strong>{ticketPriceXLM} XLM</strong>
          </Text>
        </Box>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void buyTickets();
          }}
        >
          <Box gap="sm">
            <Input
              label={`Number of tickets (1-${remainingAllowance})`}
              id="num-tickets"
              type="number"
              value={numTickets}
              onChange={(e) => {
                const value = Number(e.target.value);
                setNumTickets(Math.max(1, Math.min(value, remainingAllowance)));
              }}
              min={1}
              max={remainingAllowance}
              error={error}
              fieldSize="md"
            />

            <Text as="p" size="sm">
              Total cost: <strong>{totalCost.toFixed(1)} XLM</strong>
            </Text>

            {numTickets > remainingAllowance && (
              <Text as="p" size="sm" style={{ color: "orange" }}>
                ⚠️ Purchase will be auto-capped to {remainingAllowance} tickets
              </Text>
            )}

            <Button
              type="submit"
              disabled={isLoading || remainingAllowance === 0}
              variant="primary"
              size="md"
            >
              {isLoading
                ? "Buying..."
                : `Buy ${maxPurchase} Ticket${maxPurchase > 1 ? "s" : ""}`}
            </Button>

            {success && (
              <Text as="p" size="sm" style={{ color: "green" }}>
                ✓ Tickets purchased successfully!
              </Text>
            )}
          </Box>
        </form>
      </Box>
    </Card>
  );
};
