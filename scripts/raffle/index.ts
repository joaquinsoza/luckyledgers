/**
 * Happy path test for a complete raffle cycle
 * Creates multiple users, enters raffle, triggers draw, and claims prize
 */

import { Keypair } from "@stellar/stellar-sdk";
import { createAndFundAccount } from "../utils/stellar.js";
import { enterRaffle } from "./enter.js";
import { getRoundStats } from "./get_round_stats.js";
import { isReadyToDraw } from "./is_ready_to_draw.js";
import { requestDraw } from "./request_draw.js";
import { getRandomNumber } from "../vrf/get_random.js";
import { fulfillVRF } from "../vrf/fulfill.js";
import { CONTRACTS, RAFFLE_CONFIG } from "../utils/contracts.js";
import { claimPrize } from "./claim_prize.js";
import { getCurrentRound } from "./get_current_round.js";
import { getRoundWinner } from "./get_winner.js";

async function main() {
  console.log("========================================");
  console.log("Raffle Happy Path Test");
  console.log("========================================\n");

  // Step 1: Create and fund multiple user accounts
  const numUsers = 25; // Create 25 users
  console.log(`Step 1: Creating ${numUsers} user accounts...\n`);

  const users: Keypair[] = [];

  for (let i = 0; i < numUsers; i++) {
    const user = await createAndFundAccount();
    users.push(user);
    console.log(`  [${i + 1}/${numUsers}] Created ${user.publicKey()}`);
  }

  console.log(`\n✓ Created and funded ${users.length} accounts\n`);

  // Step 2: Users enter the raffle with varying ticket amounts
  // Goal: Reach 250 tickets with max 10 tickets per user
  console.log(
    `Step 2: Users entering raffle (target: ${RAFFLE_CONFIG.TARGET_TICKETS} tickets)...\n`,
  );

  // All 25 users buy 10 tickets each = 250 tickets total
  console.log("All users buying max tickets (10 each)...");
  for (let i = 0; i < 25; i++) {
    await enterRaffle(RAFFLE_CONFIG.MAX_TICKETS_PER_PARTICIPANT, users[i]);
    console.log(
      `  ✓ User ${i + 1} bought ${RAFFLE_CONFIG.MAX_TICKETS_PER_PARTICIPANT} tickets`,
    );
  }

  console.log("\n✓ All users entered\n");

  // Step 3: Check round stats
  console.log("Step 3: Checking round stats...\n");

  const currentRound = await getCurrentRound();
  const stats = await getRoundStats(currentRound);
  console.log(
    `Total: ${stats.total_participants} participants, ${stats.total_tickets} tickets, ${stats.prize_pool} prize pool\n`,
  );

  // Step 4: Check if ready to draw
  console.log("Step 4: Checking if ready to draw...\n");

  const ready = await isReadyToDraw();

  if (!ready) {
    throw new Error("Raffle should be ready to draw but isn't!");
  }

  console.log("✓ Raffle is ready!\n");

  // Step 5: Request draw
  console.log("Step 5: Requesting draw...\n");

  await requestDraw(users[0]);

  console.log("\n");

  // Step 6: Simulate oracle fulfilling VRF
  console.log("Step 6: Oracle fulfilling VRF...\n");

  const randomValue = await getRandomNumber();

  await fulfillVRF(CONTRACTS.RAFFLE, randomValue);

  console.log("\n");

  // Step 7: Check winner and claim prize
  console.log("Step 7: Winner claiming prize...\n");

  const winnerRecord = await getRoundWinner(currentRound);
  const winnerAddress = winnerRecord.winner;

  console.log(`Winner address: ${winnerAddress}\n`);

  // Find the winner's keypair from our users array
  const winnerKeypair = users.find(
    (user) => user.publicKey() === winnerAddress,
  );

  if (!winnerKeypair) {
    throw new Error(`Winner not found in user list! Winner: ${winnerAddress}`);
  }

  const prizeAmount = await claimPrize(currentRound, winnerKeypair);

  console.log(`\n✓✓✓ Winner found: ${winnerAddress}`);
  console.log(`✓✓✓ Prize claimed: ${prizeAmount}`);

  console.log("\n========================================");
  console.log("✓ Raffle Happy Path Complete!");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n✗ Error:", err);
    process.exit(1);
  });
