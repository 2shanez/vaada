# CLAUDE.md — Project Context for Claude Code

## What is this?
**Vaada** ("promise" in Hindi) — a decentralized commitment protocol. Users stake USDC on fitness goals, verified by Strava data via Chainlink oracles. Hit your goal = keep stake + earn from losers. Miss = lose stake.

**Positioning:** "The Commitment Market"
**Site:** https://vaada.io (password: vaada2026)

## Tech Stack
- **Chain:** Base Sepolia (testnet)
- **Contracts:** Solidity 0.8.20, Foundry
- **Frontend:** Next.js 16, React 19, Tailwind, TypeScript
- **Auth:** Privy (email/Google/wallet login)
- **Oracles:** Chainlink Functions + Automation
- **Verification:** Strava API
- **Deploy:** Vercel (auto-deploys from main branch)

## Repo Structure
```
/contracts        — Foundry project (GoalStakeV3.sol, GoalStakeAutomationV3.sol)
/frontend         — Next.js app
  /src/app        — Pages (page.tsx = landing, dashboard/page.tsx = main app)
  /src/components — React components
  /src/lib        — ABIs, hooks, wagmi config, strava utils
/chainlink        — Chainlink Functions source code
/docs             — Whitepaper, onboarding, brand assets
```

## Contracts (Base Sepolia)
- **GoalStakeV3:** `0x13b8eaEb7F7927527CE1fe7A600f05e61736d217`
- **AutomationV3:** `0xB10fCE97fc6eE84ff7772Bc44A651Dd076F7180D`
- **USDC:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals)
- **Owner wallet:** `0xF36A29f563C3eE36dd48a2FA2c151D01d9E4E077`

## Key Contract Interfaces
GoalStakeV3:
- `createGoal(name, description, goalType, targetMiles, minStake, maxStake, entryDeadline, deadline)`
- `joinGoal(goalId, amount)` — user stakes USDC
- `verifyGoal(goalId, participant, actualMiles)` — called by oracle only
- `claimReward(goalId)` — winner withdraws
- Goal phases: Entry → Competition → Settlement
- `entryDeadline` = last time to join, `deadline` = competition end

AutomationV3:
- Chainlink Automation compatible (checkUpkeep/performUpkeep)
- Stores Strava tokens, calls Chainlink Functions to verify
- `setStravaToken(athleteId, accessToken)` — store OAuth token

## Frontend Architecture
- Privy handles auth (embedded wallets for email/Google users)
- wagmi v2 for contract reads/writes
- Components: PasswordGate, BrowseGoals, MyGoals, CreateChallenge, StravaConnect
- Goals are currently hardcoded in BrowseGoals.tsx (not dynamically fetched)

## Environment Variables (frontend/.env.local)
```
NEXT_PUBLIC_STRAVA_CLIENT_ID=199295
STRAVA_CLIENT_SECRET=ac795928921a5ad171f71fc4a2e8e9be98662297
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## Current Status
- ✅ Contracts deployed and working
- ✅ Frontend live on vaada.io
- ✅ Privy auth working
- ✅ Strava OAuth flow working
- ⚠️ Strava tokens expire ~6hrs, no auto-refresh yet
- ⚠️ E2E test incomplete (Goal 8 blocked on expired token)
- ⚠️ Claim flow untested

## What Needs Building
1. **Strava token refresh** — auto-refresh before expiry
2. **E2E verification test** — verify Goal 8 after token fix
3. **Claim UI** — test withdraw flow
4. **Dynamic goal fetching** — read goals from contract instead of hardcoded
5. **Error handling** — edge cases (no Strava, failed tx, etc.)
6. **Goal status display** — clear phase indicators

## Style Guide
- Signature green: `#2EE59D`
- Dark theme preferred
- Lowercase "vaada" in branding
- Clean, minimal, consumer-crypto aesthetic
- Mobile-first responsive

## Commands
```bash
# Frontend
cd frontend && npm run dev          # local dev server
cd frontend && npm run build        # production build

# Contracts
cd contracts && forge build         # compile
cd contracts && forge test          # run tests
cd contracts && forge script ...    # deploy scripts
```

## Git
- Push to `main` → auto-deploys to Vercel
- Repo: github.com/2shanez/vaada (private)
