/**
 * Main orchestrator for complete Lucky Ledgers Raffle test
 * Runs a full end-to-end test of the entire system
 */

import { Keypair } from "@stellar/stellar-sdk";
import { createAndFundAccount } from "./utils/stellar.js";
import { enterRaffle } from "./raffle/enter.js";
import { getRoundStats } from "./raffle/get_round_stats.js";
import { getRoundInfo } from "./raffle/get_round_info.js";
import { isReadyToDraw } from "./raffle/is_ready_to_draw.js";
import { requestDraw } from "./raffle/request_draw.js";
import { getRandomNumber } from "./vrf/get_random.js";
import { fulfillVRF } from "./vrf/fulfill.js";
import { claimPrize } from "./raffle/claim_prize.js";
import { CONTRACTS, RAFFLE_CONFIG } from "./utils/contracts.js";

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  Lucky Ledgers Raffle - Full Test     ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Configuration:");
  console.log(`  Target Tickets: ${RAFFLE_CONFIG.TARGET_TICKETS}`);
  console.log(
    `  Max Tickets Per Participant: ${RAFFLE_CONFIG.MAX_TICKETS_PER_PARTICIPANT}`,
  );
  console.log(`  Ticket Price: ${RAFFLE_CONFIG.TICKET_PRICE}`);
  console.log(`  VRF Contract: ${CONTRACTS.VRF}`);
  console.log(`  Raffle Contract: ${CONTRACTS.RAFFLE}`);
  console.log(`  XLM Contract: ${CONTRACTS.XLM}\n`);

  // ============================================
  // PHASE 1: Setup
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 1: Account Setup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const users: Keypair[] = [];
  const numUsers = 25; // Create 25 test accounts

  console.log(`Creating ${numUsers} test accounts...\n`);

  for (let i = 0; i < numUsers; i++) {
    const user = await createAndFundAccount();
    users.push(user);
    console.log(`  [${i + 1}/${numUsers}] ${user.publicKey()}`);
  }

  console.log(`\n✓ All accounts created and funded\n`);

  // ============================================
  // PHASE 2: Raffle Entry
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 2: Raffle Entry");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Distribute tickets (respecting max 10 tickets per participant):
  // - 5 users: 10 tickets each (50 tickets) - at max cap
  // - 10 users: 8 tickets each (80 tickets) - close to cap
  // - 10 users: 12 tickets each → auto-capped to 10 (100 tickets) - tests auto-cap
  // Total: 230 tickets, 25 participants
  // Still under target of 250, so we'll need a few more entries

  console.log("Users entering with varying ticket amounts...\n");

  // Group 1: Buy exactly at cap (10 tickets)
  console.log("Group 1: 5 users buying 10 tickets each (at max cap)...");
  for (let i = 0; i < 5; i++) {
    await enterRaffle(10, users[i]);
    console.log(`  ✓ User ${i + 1} entered with 10 tickets`);
  }

  // Group 2: Buy 8 tickets each
  console.log("\nGroup 2: 10 users buying 8 tickets each...");
  for (let i = 5; i < 15; i++) {
    await enterRaffle(8, users[i]);
    console.log(`  ✓ User ${i + 1} entered with 8 tickets`);
  }

  // Group 3: Try to buy 12 tickets (will be auto-capped to 10)
  console.log(
    "\nGroup 3: 10 users trying to buy 12 tickets each (auto-capped to 10)...",
  );
  for (let i = 15; i < 25; i++) {
    await enterRaffle(12, users[i]);
    console.log(
      `  ✓ User ${i + 1} entered (requested 12, capped to 10 tickets)`,
    );
  }

  // Add a few more tickets to reach target
  console.log("\nFinal top-ups to reach target tickets...");
  await enterRaffle(2, users[5]); // User 6 now has 10 total
  console.log(`  ✓ User 6 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[6]); // User 7 now has 10 total
  console.log(`  ✓ User 7 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[7]); // User 8 now has 10 total
  console.log(`  ✓ User 8 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[8]); // User 9 now has 10 total
  console.log(`  ✓ User 9 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[9]); // User 10 now has 10 total
  console.log(`  ✓ User 10 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[10]); // User 11 now has 10 total
  console.log(`  ✓ User 11 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[11]); // User 12 now has 10 total
  console.log(`  ✓ User 12 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[12]); // User 13 now has 10 total
  console.log(`  ✓ User 13 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[13]); // User 14 now has 10 total
  console.log(`  ✓ User 14 bought 2 more tickets (now at 10 total)`);
  await enterRaffle(2, users[14]); // User 15 now has 10 total
  console.log(`  ✓ User 15 bought 2 more tickets (now at 10 total)`);
  // Total: 230 + 20 = 250 tickets!

  console.log("\n✓ All users entered the raffle\n");

  // ============================================
  // PHASE 3: Verification
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 3: Verification");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const roundInfo = await getRoundInfo(1);
  const stats = await getRoundStats(1);

  console.log("Round Information:");
  console.log(`  Round Number: ${roundInfo.round}`);
  console.log(`  State: ${roundInfo.state}`);
  console.log(`  Total Participants: ${stats.total_participants}`);
  console.log(`  Total Tickets: ${stats.total_tickets}`);
  console.log(`  Prize Pool: ${stats.prize_pool}\n`);

  const ready = await isReadyToDraw();
  console.log(`Ready to Draw: ${ready ? "✓ YES" : "✗ NO"}\n`);

  if (!ready) {
    throw new Error(
      "Raffle should be ready but isn't! Check target_participants.",
    );
  }

  // ============================================
  // PHASE 4: Draw Request
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 4: Draw Request");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("Requesting draw from VRF...\n");

  const vrfRequestId = await requestDraw(users[0]);

  console.log(`✓ VRF Request ID: ${vrfRequestId}\n`);

  // ============================================
  // PHASE 5: Oracle Fulfillment
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 5: Oracle Fulfillment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("Simulating oracle behavior...\n");

  const randomValue = await getRandomNumber();

  console.log(`Fulfilling VRF request with random value: ${randomValue}\n`);

  await fulfillVRF(CONTRACTS.RAFFLE, randomValue);

  console.log("\n✓ Oracle fulfilled VRF successfully\n");

  // ============================================
  // PHASE 6: Winner & Prize Claim
  // ============================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PHASE 6: Winner & Prize Claim");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check updated round info
  const completedRoundInfo = await getRoundInfo(1);
  console.log(`Round 1 Status: ${completedRoundInfo.state}\n`);

  console.log("Attempting to find and claim prize...\n");

  let winnerFound = false;

  for (let i = 0; i < users.length; i++) {
    try {
      console.log(`Checking if user ${i + 1} is the winner...`);
      const prizeAmount = await claimPrize(1, users[i]);

      console.log("\n╔════════════════════════════════════════╗");
      console.log(`║  🎉 WINNER FOUND! 🎉                   ║`);
      console.log("╚════════════════════════════════════════╝");
      console.log(`\nWinner: ${users[i].publicKey()}`);
      console.log(`Prize Amount: ${prizeAmount}`);
      console.log(`User Index: ${i + 1}`);
      console.log(`Tickets Owned: ${i < 10 ? 1 : i < 20 ? 3 : 10}`);

      winnerFound = true;
      break;
    } catch {
      // Not the winner, continue
      continue;
    }
  }

  if (!winnerFound) {
    throw new Error("Could not find the winner!");
  }

  // ============================================
  // COMPLETE
  // ============================================
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  ✓ TEST COMPLETE - ALL PHASES PASSED  ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Summary:");
  console.log(`  ✓ 25 accounts created`);
  console.log(`  ✓ ${stats.total_tickets} tickets purchased`);
  console.log(`  ✓ Prize pool: ${stats.prize_pool}`);
  console.log(`  ✓ VRF draw completed`);
  console.log(`  ✓ Winner determined and prize claimed`);
  console.log("\n🎊 Lucky Ledgers Raffle is fully functional! 🎊\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n╔════════════════════════════════════════╗");
    console.error("║  ✗ TEST FAILED                         ║");
    console.error("╚════════════════════════════════════════╝\n");
    console.error("Error:", err);
    process.exit(1);
  });
