# Vaada

**Stake Your Promise.**

The promise market. Stake money on your goals, keep your promise → keep your stake + earn from those who don't.

🔗 **Live:** [vaada.io](https://vaada.io) (Base Mainnet)  
📖 **Whitepaper:** [docs/WHITEPAPER.md](docs/WHITEPAPER.md)  
📄 **Whitepaper:** [docs/WHITEPAPER.md](docs/WHITEPAPER.md)

---

## What is Vaada?

Vaada (Hindi for "promise") is a protocol where users stake USDC on personal commitments. Your progress is verified automatically via Fitbit and Strava, and smart contracts handle settlement — no human referees, no disputes.

**Polymarket** is where you bet on the world. **Vaada** is where you bet on yourself.

---

## How It Works

```
1. Pick a goal    → "10K steps today" or "Run 3 miles"
2. Stake USDC     → $5 fixed stake
3. Connect Fitbit/Strava → Auto-verification enabled  
4. Deadline hits  → Backend verifies your activity
5. Results:
   ✅ Success → Keep stake + share of loser pool
   ❌ Fail    → Stake redistributed to winners
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Chain** | Base (Coinbase L2) — Mainnet |
| **Contracts** | Solidity + Foundry |
| **Verification** | Backend verifier + Alchemy RPC |
| **Yield** | Morpho Vault (~4.9% APY on locked stakes) |
| **Frontend** | Next.js 16, React, Tailwind |
| **Auth** | Privy (email/Google/wallet) |
| **Fitness** | Fitbit (steps) + Strava (miles) |
| **Database** | Supabase (OAuth tokens, profiles) |

---

## Project Structure

```
vaada/
├── contracts/        # Solidity smart contracts
│   ├── src/
│   │   ├── VaadaV3.sol               # Core protocol
│   │   ├── GoalStakeAutomationV3.sol # Verification bridge
│   │   └── NewUserChallenge.sol      # Onboarding contract
│   └── script/       # Deploy scripts
│
├── frontend/         # Next.js web app
│   ├── src/
│   │   ├── app/          # Pages & API routes
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities, ABIs
│   └── .env.local    # Secrets
│
└── docs/             # Documentation
    └── WHITEPAPER.md     # Protocol spec
```

---

## Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| VaadaV3 | `0xAc67E863221B703CEE9B440a7beFe71EA8725434` |
| AutomationV3 | `0xA6BcEcA41fCF743324a864F47dd03F0D3806341D` |
| NewUserChallenge | `0x7a2959ff82aeF587A6B8491A1816bb4BA7aEE554` |
| Morpho Vault | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

---

## Competitive Landscape

Vaada is the **only on-chain commitment market** with automated fitness verification. No YC-backed company in 5,000+ startups builds this.

| Category | Competitors | Vaada's Edge |
|----------|------------|-------------|
| **Fitness Betting (Web2)** | StepBet, DietBet, HealthyWage, Forfeit | Trustless smart contracts, auto-verification via API, transparent on-chain stakes |
| **Commitment Contracts** | StickK (Yale, stale), Beeminder (niche) | Modern UX, real pool payouts, social competition |
| **Move-to-Earn (Crypto)** | STEPN, Sweatcoin, Receipts.xyz | Loss aversion > earning tokens. Real money, not points |
| **Platform Challenges** | Strava, Nike Run Club, Apple Fitness+ | No stakes = no skin in the game. Free challenges don't change behavior |

**Key differentiators:**
- 🔗 **On-chain transparency** — Stakes locked in auditable smart contracts, not company bank accounts
- 🤖 **Automated verification** — Fitbit/Strava API, no human referees to game
- 💰 **Yield on stakes** — Morpho vault earns ~4.9% APY while funds are locked
- 🍎 **Apple Pay onramp** — Fiat → USDC → staked in 30 seconds via Coinbase Onramp
- ⛓️ **Built on Base** — Coinbase L2, penny gas fees, 110M+ user ecosystem

---

## Features

- ✅ Stake USDC on fitness goals
- ✅ Fitbit integration (steps)
- ✅ Strava integration (miles)
- ✅ Automatic fitness verification
- ✅ Morpho vault yield on locked stakes
- ✅ Stake-weighted payouts
- ✅ Privy auth (email/Google/wallet)
- ✅ Profile names & leaderboards
- ✅ Admin dashboard
- ✅ Anti-cheat (device-recorded only)
- ✅ Coinbase Onramp (Apple Pay → USDC)
- ✅ **Live on Base Mainnet**

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Contracts

```bash
cd contracts
forge build
forge test
```

---

## Links

- **Website:** https://vaada.io
- **Admin:** https://vaada.io/admin
- **BaseScan:** [View contracts](https://basescan.org/address/0xAc67E863221B703CEE9B440a7beFe71EA8725434)

---

## License

MIT

---

*Built by [Shane Sarin](https://shanesarin.com) with Alfred 🎩*
