# LuckyLedgers 🎲

**Transparent On-Chain Raffles on Stellar**

LuckyLedgers is a fully decentralized raffle system built on Stellar's Soroban smart contracts. Every ticket purchase, draw, and prize claim is verifiable on-chain, creating a provably fair lottery where trust is replaced by cryptographic verification.

🌐 **Live Demo**: [https://luckyledgers.xyz](https://luckyledgers.xyz)
📘 **Network**: Stellar Testnet
🔗 **GitHub**: [github.com/joaquinsoza/luckyledgers](https://github.com/joaquinsoza/luckyledgers)

---

## 🎯 What Makes LuckyLedgers Different?

Traditional lotteries are black boxes—you have to trust the operator. LuckyLedgers eliminates trust through blockchain:

- **🔍 Fully Transparent**: Every ticket, draw, and prize is recorded on-chain
- **🎲 Provably Fair**: Verifiable Random Function (VRF) ensures cryptographically secure winner selection
- **🔄 Auto-Restart**: Rounds automatically restart after winners are selected
- **💰 Direct Payouts**: Winners claim prizes directly from the smart contract (no intermediaries)
- **🚫 No Middleman**: Permissionless—anyone can trigger draws once the target is reached

---

## 📋 Table of Contents

- [How It Works](#how-it-works)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Automation Bot](#automation-bot)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Testing](#testing)

---

## 🎮 How It Works

### For Players

1. **Connect Wallet**: Use Freighter wallet on Stellar testnet
2. **Buy Tickets**: Purchase 1-10 tickets at 10 XLM each
3. **Wait for Draw**: Raffle completes when 250 tickets are sold
4. **Trigger Draw**: Anyone can trigger the draw once the target is reached
5. **Winner Selected**: VRF randomly selects one ticket as the winner
6. **Claim Prize**: Winner claims the entire prize pool (minus fees)
7. **Auto-Restart**: A new round starts immediately

### Current Configuration

```
Ticket Price: 10 XLM
Target Tickets: 250 tickets
Max Tickets Per Wallet: 10 tickets
Prize Pool: Total XLM from all ticket sales
```

---

## 🔐 Smart Contracts

Built with Rust and Soroban SDK, deployed on Stellar testnet.

### 1. Raffle Contract

**Address**: `CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW`

The core raffle logic with a state machine design:

**States**: `OPEN → DRAWING → COMPLETED → OPEN (new round)`

**Key Functions**:

- `enter(tickets: u32)` - Buy 1-10 tickets (auto-capped per wallet)
- `request_draw()` - Trigger draw when 250 tickets are sold
- `fulfill_random(request_id, random_value)` - VRF callback that selects winner
- `claim_prize(round_number)` - Winner claims prize for a specific round
- `claim_all_prizes()` - Claim prizes from multiple rounds at once
- `get_round_stats(round_number)` - Get tickets sold, participants, prize pool
- `get_winner(round_number)` - Get winner address and prize amount
- `is_ready_to_draw()` - Check if target tickets reached

**Security Features**:

- ✅ Checks-Effects-Interactions (CEI) pattern prevents re-entrancy
- ✅ VRF contract verification ensures only authorized randomness
- ✅ `require_auth()` on all user actions
- ✅ Admin-only upgrade functionality
- ✅ Automatic storage TTL extension (Soroban requirement)

**Storage Design**:

- **Instance Storage**: Contract configuration (admin, VRF address, pricing)
- **Temporary Storage**: Round data, participant lists (~30 day TTL)
- **Bucket Storage**: Efficient participant tracking for scalability

### 2. VRF Oracle Contract

**Address**: `CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO`

A mock Verifiable Random Function for testnet randomness.

**Functions**:

- `request_random()` - Request random number (returns request ID)
- `fulfill(contract_id, request_id, random_value)` - Fulfill randomness request
- `get_random()` - Generate random number using `env.prng()`

**⚠️ Testnet Only**: This VRF uses `env.prng()` which is **NOT cryptographically secure** in production (predictable by validators). For mainnet, use DIA xRandom or Chainlink VRF.

> **Note**: Building LuckyLedgers revealed that Stellar needs a robust VRF protocol. I'm developing **Randora VRF**—a decentralized oracle network for verifiable randomness across all Stellar dApps.

**Contract Code**: See `contracts/raffle/` and `contracts/vrf/` for full implementation.

---

## 🎨 Frontend

A React + TypeScript interface making blockchain raffles accessible.

**Live App**: [https://luckyledgers.xyz](https://luckyledgers.xyz)

### Features

#### Real-time Dashboard

- **Raffle Stats**: Current round number, tickets sold vs target (250), participant count, prize pool
- **Progress Bar**: Visual indicator of raffle completion
- **Previous Winner**: Display of last round's winner and prize amount
- **Auto-Refresh**: Stats update every 10 seconds

#### User Actions

- **Connect Wallet**: Freighter wallet integration (Stellar Wallets Kit)
- **Fund Account**: Friendbot integration for testnet XLM
- **Buy Tickets**: Input 1-10 tickets, shows your current ticket count, instant transaction confirmation
- **Trigger Draw**: Button appears when 250 tickets reached, anyone can trigger
- **Claim Prizes**: Winners see claim interface, can claim all unclaimed prizes at once

#### Components

- `RaffleEntry.tsx` - Ticket purchase form with balance checking
- `RaffleStats.tsx` - Live stats display with polling
- `DrawButton.tsx` - Two-step draw process (request + fulfill)
- `WinnerClaim.tsx` - Prize claiming interface for winners
- `PreviousWinner.tsx` - Winner history display
- `ConnectAccount.tsx`, `WalletButton.tsx` - Wallet management
- `Debugger.tsx` - Contract explorer for testing

### Technology

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Stellar Design System + CSS Modules
- **Wallet**: `@creit.tech/stellar-wallets-kit` for multi-wallet support
- **Blockchain**: Stellar SDK v14.2 for contract interaction
- **State**: Custom hooks (`useWallet`, `useWalletBalance`, `useNotification`)

**Code**: See `src/` directory for full frontend implementation.

---

## 🤖 Automation Bot

To simulate organic activity on testnet and ensure raffles complete, LuckyLedgers includes an intelligent automation bot.

**Script**: `scripts/bot.ts`

### Features

- **Wallet Pool**: Manages 25 pre-funded wallets
- **Random Purchases**: Buys 1-10 random tickets every 1-5 minutes
- **Smart Timing**: Waits 1-2 minutes before triggering draw (allows organic users to draw)
- **Auto-Claim**: Claims prizes when bot wallets win
- **Persistent Storage**: Wallet data saved to `.wallets.json`
- **Error Recovery**: Never crashes, logs all errors
- **PM2 Compatible**: Runs continuously in production

### Statistics Tracked

- Tickets purchased
- Raffles drawn
- Prizes won
- Prizes claimed
- Errors encountered

### Run the Bot

```bash
# Direct execution
npx tsx scripts/bot.ts

# With PM2 (recommended for production)
pm2 start "npx tsx scripts/bot.ts" --name raffle-bot
pm2 logs raffle-bot
pm2 stop raffle-bot
```

**Why a bot?** On testnet, organic traffic is low. The bot ensures raffles complete naturally while still allowing real users to participate and trigger draws.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22 or higher
- [Rust](https://www.rust-lang.org/tools/install) + Cargo
- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
- Stellar Wallets Kit compatible wallet (Freighter, xBull, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/luckyledgers.git
cd luckyledgers

# Install dependencies
npm install

# Set up environment
cp .env.example .env
```

### Configuration

Edit `environments.toml` or `.env` to configure network:

```toml
[staging]
STELLAR_NETWORK = "TESTNET"
VRF_CONTRACT = "CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO"
RAFFLE_CONTRACT = "CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW"
XLM_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
```

### Run Locally

```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

---

## 📦 Deployment

### Deploy Smart Contracts

#### 1. Deploy VRF Contract

```bash
cd luckyledgers
./scripts/deploy_vrf.sh
```

This will:

- Build the VRF contract to WASM
- Publish to Stellar registry
- Deploy instance
- Save contract address

#### 2. Deploy Raffle Contract

Update `scripts/deploy_raffle.sh` with your VRF contract address, then:

```bash
./scripts/deploy_raffle.sh
```

This will:

- Build the raffle contract
- Publish to registry
- Deploy with constructor parameters:
  - Admin account
  - VRF contract address
  - XLM token address
  - Ticket price: 10 XLM
  - Target: 250 tickets
  - Max per participant: 10
- Create local alias

#### 3. Update Frontend Configuration

Update contract addresses in:

- `src/contracts/raffle.ts`
- `src/contracts/vrf.ts`
- `scripts/utils/contracts.ts`

### Deploy Frontend

```bash
# Build production bundle
npm run build

# Deploy to your hosting provider (Vercel, Netlify, etc.)
# Example with Vercel:
vercel deploy
```

---

## 🧪 Testing

### Run Contract Tests

```bash
# Build contracts
make build

# Run all Rust tests
make test

# Run specific contract tests
cd contracts/raffle
cargo test
```

### End-to-End Testing Script

```bash
# Complete raffle flow with 25 test accounts
npx tsx scripts/main.ts
```

This script:

1. Creates 25 funded test accounts
2. Buys 250 tickets across accounts
3. Triggers draw
4. Fulfills VRF randomness
5. Selects winner
6. Claims prize

---

## 🔒 Security Considerations

**Testnet Limitations:**

- VRF uses `env.prng()` - predictable by validators (not production-ready)
- No formal security audit
- Testnet tokens have no real value

**For production use, this project would require a production VRF oracle (DIA xRandom, Chainlink VRF, or custom solution) and a security audit.**

---

**LuckyLedgers**: Proving that on-chain raffles can be transparent, fair, and fun. 🎲✨
