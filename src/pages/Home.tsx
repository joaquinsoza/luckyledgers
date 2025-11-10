import React from "react";
import { Layout, Text } from "@stellar/design-system";
import { RaffleEntry } from "../components/RaffleEntry";
import { RaffleStats } from "../components/RaffleStats";
// import { WinnerClaim } from "../components/WinnerClaim";
import { DrawButton } from "../components/DrawButton";
import { Box } from "../components/layout/Box";

const Home: React.FC = () => (
  <Layout.Content>
    <Layout.Inset>
      <Box gap="lg">
        <Box gap="md">
          <Text as="h1" size="xl">
            🎲 Lucky Ledgers Raffle
          </Text>
          <Text as="p" size="md">
            A fair and transparent raffle system powered by Stellar smart
            contracts with verifiable random number generation.
          </Text>
        </Box>

        {/* Winner Claim - Shows only if user has unclaimed prizes */}
        {/* <WinnerClaim /> */}

        {/* Draw Button - Shows only when ready */}
        <DrawButton />

        {/* Round Stats */}
        <RaffleStats />

        {/* Ticket Purchase */}
        <RaffleEntry />

        <Box gap="sm">
          <Text as="h3" size="md">
            How it works:
          </Text>
          <Text as="p" size="sm">
            1. Buy up to 10 tickets per wallet (1000 XLM each)
          </Text>
          <Text as="p" size="sm">
            2. When 250 tickets are sold, anyone can trigger the draw
          </Text>
          <Text as="p" size="sm">
            3. Winner is selected using VRF (Verifiable Random Function)
          </Text>
          <Text as="p" size="sm">
            4. Winner claims the full prize pool
          </Text>
        </Box>
      </Box>
    </Layout.Inset>
  </Layout.Content>
);

export default Home;
