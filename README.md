# Vaada

**Stake Your Promise.**

The promise market. Stake money on your goals, keep your promise → keep your stake + earn from those who don't.

🔗 **Live:** [vaada.io](https://vaada.io) (Base)  
📖 **Docs:** [docs/ONBOARDING.md](docs/ONBOARDING.md)

---

## What is Vaada?

Vaada (Hindi for "promise") is a protocol where users stake USDC on personal commitments. Chainlink oracles verify progress automatically, and smart contracts handle settlement — no human referees, no disputes.

**Polymarket** is where you bet on the world. **Vaada** is where you bet on yourself.

---

## How It Works

```
1. Pick a goal    → "Run 3 miles today" or "5K steps"
2. Stake USDC     → $1 - $100
3. Connect Fitbit/Strava → Auto-verification enabled  
4. Deadline hits  → Chainlink verifies your activity
5. Results:
   ✅ Success → Keep stake + share of loser pool
   ❌ Fail    → Stake redistributed to winners
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Chain** | Base (Coinbase L2) |
| **Contracts** | Solidity + Foundry |
| **Oracles** | Chainlink Functions + Automation |
| **Frontend** | Next.js 14, React, Tailwind |
| **Auth** | Privy (email/Google/wallet) |
| **Fitness** | Strava + Fitbit APIs |
| **Database** | Supabase (OAuth tokens) |

---

## Project Structure

```
vaada/
├── contracts/        # Solidity smart contracts
│   ├── src/
│   │   ├── GoalStakeV3.sol           # Core protocol
│   │   └── GoalStakeAutomationV3.sol # Chainlink bridge
│   └── script/       # Deploy scripts
│
├── frontend/         # Next.js web app
│   ├── src/
│   │   ├── app/          # Pages & API routes
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities, ABIs
│   └── .env.local    # Secrets
│
├── chainlink/        # Chainlink Functions scripts
├── scripts/          # Deployment & ops scripts
├── supabase/         # Database schema
│
└── docs/             # Documentation
    ├── ONBOARDING.md     # Developer onboarding
    ├── WHITEPAPER.md     # Protocol spec
    └── research/         # Market research
```

---

## Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| GoalStakeV3 | `0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9` |
| AutomationV3 | `0x6e6b1834afE0E221fB965edD69A7bC82C784f906` |
| USDC (testnet) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

---

## Features

- ✅ Stake USDC on fitness goals
- ✅ Strava integration (miles)
- ✅ Fitbit integration (steps)
- ✅ Chainlink oracle verification
- ✅ Stake-weighted payouts
- ✅ Privy auth (email/Google/wallet)
- ✅ One-tx join (approve once)
- ✅ OAuth popup (no redirects)
- ⏳ Create your own goals
- ⏳ Mainnet deployment

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
- **BaseScan:** [View contracts](https://sepolia.basescan.org/address/0xE570BE5EC4039e2b256ADb1e02F6E595eCE921B9)
- **Chainlink Sub:** 561

---

## License

MIT

---

*Built by [Shane Sarin](https://2667.io) with Alfred 🎩*
