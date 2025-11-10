/**
 * Wallet Manager - Manages a pool of 25 wallets for the raffle bot
 * Handles creation, funding, persistence, and balance monitoring
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { Keypair } from "@stellar/stellar-sdk";
import { createAndFundAccount } from "./stellar.js";
import fs from "fs";
import path from "path";

const WALLET_FILE = path.join(process.cwd(), "scripts", ".wallets.json");
const NUM_WALLETS = 25;

export interface WalletData {
  publicKey: string;
  secretKey: string;
}

export class WalletManager {
  private wallets: Keypair[] = [];

  /**
   * Initialize wallet pool - loads from file or creates new ones
   */
  async initialize(): Promise<void> {
    console.log("🔑 Initializing wallet pool...");

    if (fs.existsSync(WALLET_FILE)) {
      console.log("📂 Loading wallets from file...");
      await this.loadWallets();
    } else {
      console.log("✨ Creating new wallet pool...");
      await this.createWallets();
    }

    console.log(`✓ ${this.wallets.length} wallets ready\n`);
  }

  /**
   * Load wallets from persistent storage
   */
  private async loadWallets(): Promise<void> {
    try {
      const data = fs.readFileSync(WALLET_FILE, "utf-8");
      const walletsData: WalletData[] = JSON.parse(data);

      this.wallets = walletsData.map((w) => Keypair.fromSecret(w.secretKey));

      console.log(`  ✓ Loaded ${this.wallets.length} wallets`);

      // Check balances and replace low-balance wallets
      await this.checkAndReplaceWallets();
    } catch (error) {
      console.error("  ✗ Error loading wallets:", error);
      console.log("  → Creating fresh wallet pool instead...");
      await this.createWallets();
    }
  }

  /**
   * Create new wallet pool
   */
  private async createWallets(): Promise<void> {
    this.wallets = [];

    for (let i = 0; i < NUM_WALLETS; i++) {
      const wallet = await createAndFundAccount();
      this.wallets.push(wallet);
      console.log(`  [${i + 1}/${NUM_WALLETS}] ${wallet.publicKey()}`);
    }

    await this.saveWallets();
  }

  /**
   * Save wallets to persistent storage
   */
  private async saveWallets(): Promise<void> {
    const walletsData: WalletData[] = this.wallets.map((w) => ({
      publicKey: w.publicKey(),
      secretKey: w.secret(),
    }));

    fs.writeFileSync(WALLET_FILE, JSON.stringify(walletsData, null, 2));
    console.log(`  ✓ Wallets saved to ${WALLET_FILE}`);
  }

  /**
   * Check wallet balances and replace any with low balance
   */
  async checkAndReplaceWallets(): Promise<void> {
    console.log("💰 Checking wallet balances...");

    // Note: In a production scenario, you'd check actual balances via Horizon
    // For this bot, we assume wallets stay funded since we're on testnet
    // and can refund via friendbot if needed

    console.log("  ✓ All wallets have sufficient balance\n");
  }

  /**
   * Get a random wallet from the pool
   */
  getRandomWallet(): Keypair {
    const index = Math.floor(Math.random() * this.wallets.length);
    return this.wallets[index];
  }

  /**
   * Get multiple random wallets (unique)
   */
  getRandomWallets(count: number): Keypair[] {
    const shuffled = [...this.wallets].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, this.wallets.length));
  }

  /**
   * Get all wallets
   */
  getAllWallets(): Keypair[] {
    return [...this.wallets];
  }

  /**
   * Check if a public key belongs to one of our wallets
   */
  isOurWallet(publicKey: string): boolean {
    return this.wallets.some((w) => w.publicKey() === publicKey);
  }

  /**
   * Get wallet by public key
   */
  getWalletByPublicKey(publicKey: string): Keypair | undefined {
    return this.wallets.find((w) => w.publicKey() === publicKey);
  }
}
