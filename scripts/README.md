# Lucky Ledgers Scripts

This directory contains scripts for deploying, testing, and running the Lucky Ledgers raffle system.

## 📁 Directory Structure

```
scripts/
├── bot.ts                    # 🤖 Automated raffle bot (PM2-ready)
├── main.ts                   # Full end-to-end test
├── deploy_raffle.sh          # Deploy raffle contract
├── deploy_vrf.sh             # Deploy VRF contract
├── raffle/                   # Raffle contract interactions
│   ├── enter.ts              # Buy raffle tickets
│   ├── get_current_round.ts  # Get current round number
│   ├── get_round_info.ts     # Get round state (OPEN/DRAWING/COMPLETED)
│   ├── get_round_stats.ts    # Get ticket count, participants, prize pool
│   ├── get_winner.ts         # Get winner of completed round
│   ├── is_ready_to_draw.ts   # Check if raffle can be drawn
│   ├── request_draw.ts       # Trigger raffle draw
│   └── claim_prize.ts        # Claim prize (winner only)
├── vrf/                      # VRF contract interactions
│   ├── get_random.ts         # Get random number from VRF
│   └── fulfill.ts            # Fulfill VRF request (oracle)
└── utils/                    # Utility functions
    ├── contracts.ts          # Contract addresses and config
    ├── stellar.ts            # Stellar transaction helpers
    └── wallet-manager.ts     # Bot wallet pool manager
```

---

## 🤖 Raffle Bot

The raffle bot simulates organic user activity to keep raffles active and progressing.

### Features

- **Wallet Management**: Maintains pool of 25 funded wallets
- **Smart Participation**: Randomly buys 1-10 tickets every 1-5 minutes
- **Auto-Draw**: Triggers draws when raffle reaches target (250 tickets)
- **Prize Claiming**: Automatically claims prizes when bot wallets win
- **Error Resilient**: Continues running even if transactions fail
- **PM2 Compatible**: Designed for continuous operation

### Running the Bot

#### Direct Execution

```bash
npx tsx scripts/bot.ts
```

#### With PM2 (Recommended for production)

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start the bot
pm2 start "npx tsx scripts/bot.ts" --name raffle-bot

# View logs
pm2 logs raffle-bot

# Monitor status
pm2 monit

# Stop the bot
pm2 stop raffle-bot

# Restart the bot
pm2 restart raffle-bot

# Remove from PM2
pm2 delete raffle-bot

# Save PM2 configuration to restart on reboot
pm2 save
pm2 startup
```

### Bot Behavior

**OPEN State (Raffle accepting tickets):**

- Checks current ticket count vs target (250)
- Every 1-5 minutes (random), selects 1-5 random wallets
- Each wallet buys random 1-10 tickets
- Respects max 10 tickets per wallet constraint
- Continues until target is reached

**Ready to Draw (250 tickets sold):**

- Waits 1-2 minutes (random delay)
- Triggers `request_draw()` with random bot wallet
- Immediately fulfills VRF (simulating oracle)
- Transitions to DRAWING → COMPLETED

**COMPLETED State:**

- Checks winner address
- If winner is a bot wallet: claims prize immediately
- If winner is organic user: waits for next round
- Resets and starts participating in new round

### Configuration

Edit the constants in `scripts/bot.ts`:

```typescript
const LOOP_INTERVAL = 30_000; // Check state every 30s
const TICKET_BUY_MIN_DELAY = 60_000; // Min 1 min between purchases
const TICKET_BUY_MAX_DELAY = 300_000; // Max 5 min between purchases
const DRAW_DELAY_MIN = 60_000; // Wait 1-2 min before drawing
const DRAW_DELAY_MAX = 120_000;
```

### Wallet Persistence

Bot wallets are stored in `scripts/.wallets.json` (gitignored):

- Created automatically on first run
- Persisted across restarts
- Contains 25 funded testnet accounts
- Delete file to generate fresh wallets

---

## 🧪 Testing Scripts

### Full End-to-End Test

```bash
npx tsx scripts/main.ts
```

Runs complete raffle cycle:

1. Creates 25 test accounts
2. Buys 250 tickets across all accounts
3. Requests draw
4. Fulfills VRF
5. Finds winner and claims prize

### Individual Raffle Actions

**Buy tickets:**

```bash
npx tsx scripts/raffle/enter.ts
```

**Check round info:**

```bash
npx tsx scripts/raffle/get_round_info.ts
```

**Check if ready to draw:**

```bash
npx tsx scripts/raffle/is_ready_to_draw.ts
```

**Trigger draw:**

```bash
npx tsx scripts/raffle/request_draw.ts
```

**Check winner:**

```bash
npx tsx scripts/raffle/get_winner.ts
```

**Claim prize:**

```bash
npx tsx scripts/raffle/claim_prize.ts
```

---

## 🚀 Deployment

### Deploy VRF Contract

```bash
./scripts/deploy_vrf.sh
```

### Deploy Raffle Contract

```bash
./scripts/deploy_raffle.sh
```

After deployment, update contract addresses in `scripts/utils/contracts.ts`.

---

## 📊 Configuration

Edit `scripts/utils/contracts.ts`:

```typescript
export const CONTRACTS = {
  VRF: "CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO",
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  RAFFLE: "CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW",
};

export const RAFFLE_CONFIG = {
  TICKET_PRICE: 10_000_000n, // 1 XLM per ticket
  TARGET_TICKETS: 250, // Tickets needed to trigger draw
  MAX_TICKETS_PER_PARTICIPANT: 10, // Max tickets per wallet
};
```

---

## 🔍 Monitoring

### Bot Statistics

The bot logs statistics every loop iteration:

- **Tickets Purchased**: Total tickets bought by bot
- **Draws**: Number of raffles drawn
- **Wins**: Number of times bot wallets won
- **Claimed**: Number of prizes claimed
- **Errors**: Transaction/network errors (non-fatal)

### Log Format

```
[2025-01-10T12:34:56.789Z] 📍 Round 5 | State: OPEN
[2025-01-10T12:34:57.123Z] 📊 Current: 180/250 tickets, 70 remaining
[2025-01-10T12:34:57.456Z] 🎫 Buying tickets with 3 wallets...
[2025-01-10T12:34:58.789Z]   ✓ GA2XYZ... bought 7 ticket(s)
[2025-01-10T12:35:01.234Z] 📊 Stats: 145 tickets | 3 draws | 1 wins | 1 claimed | 2 errors
```

---

## ⚠️ Important Notes

- **Testnet Only**: This bot is designed for Stellar testnet
- **Wallet Secrets**: Never commit `.wallets.json` - it contains private keys
- **Friendbot Rate Limits**: If creating many wallets, you may hit friendbot limits
- **Network Errors**: Bot handles errors gracefully and continues running
- **Organic Users**: Bot works alongside real users - they can participate normally

---

## 🐛 Troubleshooting

**Bot not buying tickets:**

- Check if raffle is in OPEN state
- Verify wallets have sufficient XLM balance
- Check network connectivity to Stellar testnet

**Draw not triggering:**

- Ensure 250 tickets have been sold
- Check if another user already triggered the draw
- Verify VRF contract is deployed and accessible

**Prizes not claimed:**

- Confirm bot wallet actually won (check logs)
- Verify winner address matches one of the 25 bot wallets
- Check if prize was already claimed

**"Cannot find module" errors:**

- Run `npm install` in project root
- Ensure all dependencies are installed
- Check that you're using Node.js 18+ and TypeScript

---

## 📝 License

Part of the Lucky Ledgers project - MIT License
