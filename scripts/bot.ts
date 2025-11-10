/**
 * Lucky Ledgers Raffle Bot
 *
 * Automated bot that simulates organic raffle participation
 * - Manages 25 wallets
 * - Buys random tickets (1-10) every 1-5 minutes
 * - Ensures raffles reach target and get drawn
 * - Claims prizes when bot wallets win
 *
 * Run with: npx tsx scripts/bot.ts
 * PM2: pm2 start "npx tsx scripts/bot.ts" --name raffle-bot
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { WalletManager } from "./utils/wallet-manager.js";
import { getCurrentRound } from "./raffle/get_current_round.js";
import { getRoundInfo } from "./raffle/get_round_info.js";
import { getRoundStats } from "./raffle/get_round_stats.js";
import { isReadyToDraw } from "./raffle/is_ready_to_draw.js";
import { enterRaffle } from "./raffle/enter.js";
import { requestDraw } from "./raffle/request_draw.js";
import { getRandomNumber } from "./vrf/get_random.js";
import { fulfillVRF } from "./vrf/fulfill.js";
import { getRoundWinner } from "./raffle/get_winner.js";
import { claimPrize } from "./raffle/claim_prize.js";
import { CONTRACTS, RAFFLE_CONFIG } from "./utils/contracts.js";

// Bot configuration
const LOOP_INTERVAL = 30_000; // Check every 30 seconds
const TICKET_BUY_MIN_DELAY = 60_000; // Min 1 minute between ticket purchases
const TICKET_BUY_MAX_DELAY = 300_000; // Max 5 minutes between ticket purchases
const DRAW_DELAY_MIN = 60_000; // Wait 1 minute before drawing
const DRAW_DELAY_MAX = 120_000; // Wait 2 minutes before drawing

// State tracking
let lastTicketPurchaseTime = 0;
let drawDelayStartTime = 0;
let lastRoundCompleted = 0;

// Statistics
const stats = {
  ticketsPurchased: 0,
  rafflesDrawn: 0,
  prizesWon: 0,
  prizesClaimed: 0,
  errors: 0,
};

/**
 * Get random delay between min and max
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log with timestamp
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Handle OPEN state - buy tickets randomly
 */
async function handleOpenState(
  walletManager: WalletManager,
  roundNumber: number,
  stats_data: { total_tickets: number; total_participants: number },
): Promise<void> {
  const now = Date.now();
  const timeSinceLastPurchase = now - lastTicketPurchaseTime;

  // Check if enough time has passed since last purchase
  const minDelay = getRandomDelay(TICKET_BUY_MIN_DELAY, TICKET_BUY_MAX_DELAY);

  if (timeSinceLastPurchase < minDelay && lastTicketPurchaseTime !== 0) {
    return; // Not time to buy yet
  }

  const ticketsRemaining =
    RAFFLE_CONFIG.TARGET_TICKETS - stats_data.total_tickets;

  if (ticketsRemaining <= 0) {
    return; // Target already reached
  }

  log(
    `📊 Current: ${stats_data.total_tickets}/${RAFFLE_CONFIG.TARGET_TICKETS} tickets, ${ticketsRemaining} remaining`,
  );

  // Randomly select 1-5 wallets to buy tickets
  const numWallets = getRandomDelay(1, Math.min(5, 25));
  const selectedWallets = walletManager.getRandomWallets(numWallets);

  log(`🎫 Buying tickets with ${selectedWallets.length} wallets...`);

  for (const wallet of selectedWallets) {
    try {
      // Random number of tickets (1-10)
      const numTickets = getRandomDelay(1, Math.min(10, ticketsRemaining));

      await enterRaffle(numTickets, wallet);
      stats.ticketsPurchased += numTickets;

      log(
        `  ✓ ${wallet.publicKey().slice(0, 8)}... bought ${numTickets} ticket(s)`,
      );

      // Small delay between purchases to appear more organic
      await sleep(2000);
    } catch (error) {
      stats.errors++;
      log(`  ✗ Error buying tickets: ${error}`);
      // Continue to next wallet
    }
  }

  lastTicketPurchaseTime = now;
}

/**
 * Handle ready-to-draw state
 */
async function handleReadyToDraw(
  walletManager: WalletManager,
  roundNumber: number,
): Promise<void> {
  const now = Date.now();

  // Start delay timer if not already started
  if (drawDelayStartTime === 0) {
    const delay = getRandomDelay(DRAW_DELAY_MIN, DRAW_DELAY_MAX);
    drawDelayStartTime = now;
    log(
      `⏳ Raffle full! Waiting ${Math.floor(delay / 1000)}s before drawing...`,
    );
    return;
  }

  // Check if delay has passed
  const delayTarget = getRandomDelay(DRAW_DELAY_MIN, DRAW_DELAY_MAX);
  if (now - drawDelayStartTime < delayTarget) {
    return; // Still waiting
  }

  log(`🎲 Triggering draw for round ${roundNumber}...`);

  try {
    // Use random wallet to request draw
    const drawer = walletManager.getRandomWallet();
    const vrfRequestId = await requestDraw(drawer);

    log(`  ✓ Draw requested by ${drawer.publicKey().slice(0, 8)}...`);
    log(`  📋 VRF Request ID: ${vrfRequestId}`);

    stats.rafflesDrawn++;

    // Immediately fulfill VRF (simulating oracle)
    log(`🔮 Fulfilling VRF...`);
    const randomValue = await getRandomNumber();
    await fulfillVRF(CONTRACTS.RAFFLE, randomValue);

    log(`  ✓ VRF fulfilled with random value: ${randomValue}`);

    // Reset draw delay timer
    drawDelayStartTime = 0;
  } catch (error) {
    stats.errors++;
    log(`  ✗ Error during draw: ${error}`);
    drawDelayStartTime = 0; // Reset so we can retry
  }
}

/**
 * Handle COMPLETED state - claim if we won
 */
async function handleCompletedState(
  walletManager: WalletManager,
  roundNumber: number,
): Promise<void> {
  // Only process each round once
  if (lastRoundCompleted === roundNumber) {
    return;
  }

  log(`🏆 Round ${roundNumber} completed! Checking winner...`);

  try {
    const winner = await getRoundWinner(roundNumber);

    log(`  Winner: ${winner.winner}`);
    log(`  Prize: ${Number(winner.amount) / 10_000_000} XLM`);
    log(`  Claimed: ${winner.claimed ? "✓" : "✗"}`);

    // Check if winner is one of our wallets
    if (walletManager.isOurWallet(winner.winner)) {
      stats.prizesWon++;
      log(`  🎊 WE WON! This is one of our wallets!`);

      if (!winner.claimed) {
        log(`  💰 Claiming prize...`);

        const winnerWallet = walletManager.getWalletByPublicKey(winner.winner);
        if (winnerWallet) {
          const prizeAmount = await claimPrize(roundNumber, winnerWallet);
          stats.prizesClaimed++;

          log(
            `  ✓ Prize claimed! Amount: ${Number(prizeAmount) / 10_000_000} XLM`,
          );
        }
      }
    } else {
      log(`  → Organic user won this round`);
    }

    lastRoundCompleted = roundNumber;
  } catch (error) {
    stats.errors++;
    log(`  ✗ Error handling completed state: ${error}`);
  }
}

/**
 * Main bot loop
 */
async function botLoop(walletManager: WalletManager): Promise<void> {
  while (true) {
    try {
      // Get current round info
      const currentRound = await getCurrentRound();
      const roundInfo = await getRoundInfo(currentRound);
      const roundStats = await getRoundStats(currentRound);

      log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      log(`📍 Round ${currentRound} | State: ${roundInfo.state}`);

      // Normalize state in case it's still an array (defensive programming)
      const state = Array.isArray(roundInfo.state)
        ? roundInfo.state[0]
        : roundInfo.state;

      // State machine
      switch (state) {
        case "OPEN": {
          // Check if ready to draw
          const ready = await isReadyToDraw();

          if (ready) {
            await handleReadyToDraw(walletManager, currentRound);
          } else {
            await handleOpenState(walletManager, currentRound, roundStats);
          }
          break;
        }

        case "DRAWING":
          log(`⌛ Draw in progress, waiting for completion...`);
          break;

        case "COMPLETED":
          await handleCompletedState(walletManager, currentRound);
          log(`✓ Waiting for next round to start...`);
          break;

        default:
          log(`❓ Unknown state: ${roundInfo.state}`);
      }

      // Log statistics
      log(
        `📊 Stats: ${stats.ticketsPurchased} tickets | ${stats.rafflesDrawn} draws | ${stats.prizesWon} wins | ${stats.prizesClaimed} claimed | ${stats.errors} errors`,
      );
    } catch (error) {
      stats.errors++;
      log(`❌ Loop error: ${error}`);
      // Continue anyway
    }

    // Wait before next iteration
    await sleep(LOOP_INTERVAL);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   Lucky Ledgers Raffle Bot v1.0       ║");
  console.log("╚════════════════════════════════════════╝\n");

  log("🚀 Starting bot...");

  // Initialize wallet manager
  const walletManager = new WalletManager();
  await walletManager.initialize();

  log("✓ Bot initialized successfully!");
  log(`🔁 Loop interval: ${LOOP_INTERVAL / 1000}s`);
  log(
    `🎫 Ticket purchase interval: ${TICKET_BUY_MIN_DELAY / 1000}-${TICKET_BUY_MAX_DELAY / 1000}s`,
  );
  log(`⏱️  Draw delay: ${DRAW_DELAY_MIN / 1000}-${DRAW_DELAY_MAX / 1000}s\n`);

  // Start main loop
  await botLoop(walletManager);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("🛑 Received SIGINT, shutting down gracefully...");
  log(
    `📊 Final Stats: ${stats.ticketsPurchased} tickets | ${stats.rafflesDrawn} draws | ${stats.prizesWon} wins | ${stats.prizesClaimed} claimed | ${stats.errors} errors`,
  );
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("🛑 Received SIGTERM, shutting down gracefully...");
  log(
    `📊 Final Stats: ${stats.ticketsPurchased} tickets | ${stats.rafflesDrawn} draws | ${stats.prizesWon} wins | ${stats.prizesClaimed} claimed | ${stats.errors} errors`,
  );
  process.exit(0);
});

// Run the bot
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
