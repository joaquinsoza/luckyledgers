# LuckyLedgers - Transparent On-Chain Raffles

## Why I Built This

I built LuckyLedgers as a fun experiment to create something that doesn't exist on Stellar yet: a fully transparent, provably fair raffle system. Traditional lotteries are black boxes - you have to trust the operator. With blockchain, we can make every step verifiable.

While researching, I noticed Stellar lacks VRF (Verifiable Random Function) protocols, which are essential for provably fair randomness. This led me to build a simple VRF oracle for this project, and I'm now working on **Randora VRF** - a full VRF protocol for Stellar.

**LuckyLedgers is a testnet demo** showcasing how transparent raffles can work on-chain.

---

## What I Built

### 🔐 Smart Contracts (Rust/Soroban)

#### 1. Raffle Contract

The core raffle logic that handles everything on-chain:

- **Ticket Purchases**: Users buy tickets (1 XLM each, max 10 per wallet)
- **Round Management**: Automatically tracks rounds, participants, and prize pools
- **Fair Distribution**: Uses VRF for cryptographically secure random winner selection
- **Prize Claims**: Winners claim prizes directly from the contract (no intermediaries)
- **State Machine**: OPEN → DRAWING → COMPLETED states ensure proper flow

#### 2. VRF Oracle Contract

A simple Verifiable Random Function oracle for provably fair randomness:

- **Random Generation**: Produces cryptographically secure random numbers
- **Callback System**: Fulfills randomness requests from the raffle contract
- **Verifiable**: All randomness is generated and recorded on-chain

> **Note**: While building this, I realized the need for a proper VRF protocol on Stellar. I'm now developing **Randora VRF** as a standalone project to provide decentralized, verifiable randomness for the entire Stellar ecosystem.

---

### 🎨 Frontend (React + TypeScript)

A clean, simple interface that makes blockchain raffles accessible:

**Real-time Dashboard:**

- Live ticket count and progress bar (250 ticket target)
- Current prize pool display
- Raffle state indicator (Open/Drawing/Completed)
- Previous round winner showcase

**User Actions:**

- **Connect Wallet**: Freighter wallet integration
- **Buy Tickets**: Choose 1-10 tickets, instant confirmation
- **Trigger Draw**: Anyone can trigger once target is reached (demonstrates permissionless nature)
- **Claim Prizes**: Winners claim with one click

**Transparency Features:**

- All transactions visible on-chain
- Real-time stats polling (updates every 10 seconds)
- Previous winner history with claim status

---

### 🤖 Automated Bot (TypeScript/Node.js)

To simulate organic activity and keep raffles progressing on testnet, I built an intelligent bot:

**Features:**

- Manages 25 funded wallets
- Randomly buys 1-10 tickets every 1-5 minutes
- Ensures raffles reach the 250 ticket target
- Automatically triggers draws after 1-2 minute delay (allows organic users to draw)
- Claims prizes when bot wallets win
- Handles errors gracefully (never crashes)
- PM2-compatible for continuous operation

**Why a bot?** On testnet, we need activity to showcase the raffle flow. The bot ensures raffles complete while still allowing real users to participate naturally.

---

## 🚀 Version 2 Plans

The current version demonstrates the core mechanics. V2 will add **yield generation**:

**DeFiIndex/Blend Integration:**

- When users buy tickets, funds are deposited into a DeFiIndex vault or Blend protocol
- Prize pool generates yield while waiting for the winner to claim
- Unclaimed prizes accrue interest
- Creates a win-win: participants get entertainment, prize pool grows over time

This makes raffles more sustainable and can even fund community initiatives with unclaimed/yield portions.

---

## Technical Highlights

✅ **Fully On-Chain**: No off-chain databases, everything lives on Stellar
✅ **Provably Fair**: VRF ensures verifiable randomness
✅ **Permissionless**: Anyone can trigger draws once target is reached
✅ **Transparent**: All transactions, winners, and prizes are public
✅ **Automated Testing**: Complete end-to-end test suite with scripts
✅ **Production Bot**: PM2-ready bot for continuous operation

---

## Try It Out

**Live Demo**: [Insert deployment URL]
**Testnet Contracts**:

- Raffle: `CDUF3EJZQHYJVKMKDY2F4LEDNY3ACE24FDS5SER3DWKXYEUKATL4QHKW`
- VRF: `CCD5LKJMSWE55ZLTAKYF4EPNOF7XAJFBA6Q6EOGF6EHL2OXTSTX6IRYO`

**How to Play**:

1. Connect your Freighter wallet (testnet mode)
2. Fund your wallet via friendbot
3. Buy tickets (1-10 XLM)
4. Wait for raffle to reach 250 tickets
5. Trigger the draw or wait for someone else to
6. Claim your prize if you win!

---

## What's Next: Randora VRF

Building LuckyLedgers revealed that Stellar needs a robust VRF protocol. I'm now developing **Randora VRF** - a decentralized oracle network providing verifiable randomness for all Stellar dApps.

This will enable:

- Fair lotteries and raffles
- Random NFT minting
- Gaming mechanics
- Fair validator selection
- Any application requiring trustless randomness

---

## Tech Stack

- **Smart Contracts**: Rust, Soroban SDK
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Stellar Design System
- **Wallet**: Freighter integration
- **Bot**: Node.js, TypeScript, PM2
- **Testing**: Complete script suite with automated flows

---

## Code & Deployment

- **Repository**: [GitHub Link]
- **Documentation**: Full setup and deployment guides in repo
- **Scripts**: Automated deployment, testing, and bot operation
- **Open Source**: MIT License

---

LuckyLedgers proves that on-chain raffles can be transparent, fair, and fun. It's a simple concept executed on blockchain to showcase what's possible when you remove trust requirements and make everything verifiable. 🎲✨
